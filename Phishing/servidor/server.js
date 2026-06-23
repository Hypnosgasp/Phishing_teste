// ================================================================
//  SERVER.JS — Backend de rastreamento de phishing
//  Node.js + Express | Porta 3000
// ================================================================

const express  = require('express')
const fs       = require('fs')
const path     = require('path')
const cors     = require('cors')
const app      = express()
const PORT     = process.env.PORT || 3000

// Arquivos de dados
const DATA_DIR      = path.join(__dirname, 'data')
const COLABS_FILE   = path.join(DATA_DIR, 'colaboradores.json')
const RESULTS_FILE  = path.join(DATA_DIR, 'resultados.json')

// URL de redirecionamento após clique — troque pela sua URL
const REDIRECT_URL = 'https://SUA_URL_DE_REDIRECIONAMENTO'

// ----------------------------------------------------------------
// INICIALIZAÇÃO
// ----------------------------------------------------------------

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(COLABS_FILE))  fs.writeFileSync(COLABS_FILE,  '[]', 'utf8')
if (!fs.existsSync(RESULTS_FILE)) fs.writeFileSync(RESULTS_FILE, '[]', 'utf8')

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '..')))

// ----------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------

function lerJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch { return [] }
}

function salvarJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim()
      || req.socket?.remoteAddress
      || '—'
}

function getBrowser(ua) {
  if (!ua) return '—'
  if (ua.includes('Edg/'))     return 'Edge '     + (ua.match(/Edg\/(\d+)/)?.[1]     || '')
  if (ua.includes('OPR/'))     return 'Opera '    + (ua.match(/OPR\/(\d+)/)?.[1]     || '')
  if (ua.includes('Chrome/'))  return 'Chrome '   + (ua.match(/Chrome\/(\d+)/)?.[1]  || '')
  if (ua.includes('Firefox/')) return 'Firefox '  + (ua.match(/Firefox\/(\d+)/)?.[1] || '')
  if (ua.includes('Safari/'))  return 'Safari '   + (ua.match(/Version\/(\d+)/)?.[1] || '')
  return 'Outro'
}

function getOS(ua) {
  if (!ua) return '—'
  if (ua.includes('Windows NT 10.0')) return 'Windows 10/11'
  if (ua.includes('Windows'))         return 'Windows'
  if (ua.includes('Mac OS X'))        return 'macOS'
  if (ua.includes('Android'))         return 'Android ' + (ua.match(/Android ([\d.]+)/)?.[1] || '')
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Linux'))           return 'Linux'
  return 'Desconhecido'
}

// ----------------------------------------------------------------
// FILTRO DE BOTS — Ignora scanners automáticos (M365 Safe Links, etc.)
// ----------------------------------------------------------------

const BOT_UA_PATTERNS = [
  /microsoft.*url.*scan/i,
  /microsoftpreview/i,
  /safelinks/i,
  /msfrontdoor/i,
  /outlook/i,
  /office.*http/i,
  /linkscanner/i,
  /barracuda/i,
  /proofpoint/i,
  /mimecast/i,
  /ironport/i,
  /symantec.*email/i,
  /trendmicro/i,
  /kaspersky/i,
  /sophos/i,
  /postfix.*scan/i,
  /python-requests/i,
  /go-http-client/i,
  /curl\//i,
  /wget\//i,
]

function isBot(ua) {
  if (!ua) return true
  return BOT_UA_PATTERNS.some(p => p.test(ua))
}

// ----------------------------------------------------------------
// ROTA PRINCIPAL — Captura o clique e redireciona
// GET /r/TOKEN  ou  GET /redirect?t=TOKEN
// ----------------------------------------------------------------

function registrarClique(req, res, token) {
  const colaboradores = lerJSON(COLABS_FILE)
  const colab = colaboradores.find(c => c.token === token)

  if (!colab) {
    return res.status(404).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2 style="color:#e81123">Link inválido</h2>
        <p>Este link não é válido ou já foi removido da campanha.</p>
      </body></html>`)
  }

  const ua  = req.headers['user-agent'] || ''
  const ip  = getIP(req)

  if (isBot(ua)) {
    console.log(`[BOT IGNORADO] ${colab.nome} | UA: ${ua.substring(0, 80)} | IP: ${ip}`)
    return res.redirect(302, REDIRECT_URL)
  }

  const browser = getBrowser(ua)
  const os      = getOS(ua)
  const agora   = new Date().toISOString()

  const resultados = lerJSON(RESULTS_FILE)
  resultados.push({
    nome:      colab.nome,
    email:     colab.email,
    token:     colab.token,
    dataHora:  agora,
    ip,
    navegador: browser,
    so:        os
  })
  salvarJSON(RESULTS_FILE, resultados)

  console.log(`[CLIQUE] ${colab.nome} <${colab.email}> | IP: ${ip} | ${browser} | ${os}`)

  res.redirect(302, REDIRECT_URL)
}

app.get('/r/:token', (req, res) => registrarClique(req, res, req.params.token))
app.get('/redirect',  (req, res) => registrarClique(req, res, req.query.t || ''))

// ----------------------------------------------------------------
// API — Dashboard
// ----------------------------------------------------------------

app.get('/api/colaboradores', (req, res) => {
  res.json(lerJSON(COLABS_FILE))
})

app.post('/api/colaboradores', (req, res) => {
  const lista = req.body
  if (!Array.isArray(lista)) return res.status(400).json({ erro: 'Esperado array' })

  const existentes = lerJSON(COLABS_FILE)
  const tokensMap  = {}
  existentes.forEach(c => { tokensMap[c.token] = true })

  const novos = lista.filter(c => c.nome && c.email && c.token && !tokensMap[c.token])
  salvarJSON(COLABS_FILE, [...existentes, ...novos])
  res.json({ importados: novos.length, total: existentes.length + novos.length })
})

app.delete('/api/colaboradores', (req, res) => {
  salvarJSON(COLABS_FILE, [])
  res.json({ ok: true })
})

app.get('/api/resultados', (req, res) => {
  res.json(lerJSON(RESULTS_FILE))
})

app.delete('/api/resultados', (req, res) => {
  salvarJSON(RESULTS_FILE, [])
  res.json({ ok: true })
})

app.get('/api/metricas', (req, res) => {
  const colabs   = lerJSON(COLABS_FILE)
  const results  = lerJSON(RESULTS_FILE)
  const total    = colabs.length

  const countByToken = {}
  results.forEach(r => { countByToken[r.token] = (countByToken[r.token] || 0) + 1 })

  const clicaram    = Object.keys(countByToken).length
  const naoClicaram = total - clicaram
  const taxa        = total > 0 ? ((clicaram / total) * 100).toFixed(2) : '0.00'

  const byDay = {}
  results.forEach(r => {
    const day = r.dataHora.slice(0, 10)
    byDay[day] = (byDay[day] || 0) + 1
  })

  const sortedDays = Object.keys(byDay).sort()

  const tableRows = colabs.map(c => {
    const clicks = results.filter(r => r.token === c.token)
    const last   = clicks.length > 0 ? clicks[clicks.length - 1] : null
    return {
      nome:      c.nome,
      email:     c.email,
      token:     c.token,
      cliques:   clicks.length,
      dataHora:  last?.dataHora  || null,
      ip:        last?.ip        || null,
      navegador: last?.navegador || null,
      so:        last?.so        || null
    }
  })

  res.json({ total, clicaram, naoClicaram, taxa, chartLabels: sortedDays, chartData: sortedDays.map(d => byDay[d]), tableRows })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), colaboradores: lerJSON(COLABS_FILE).length, resultados: lerJSON(RESULTS_FILE).length })
})

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
