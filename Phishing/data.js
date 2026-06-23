/* =============================================
   DATA.JS — Gerenciamento de dados
   Modo API: comunica com o servidor Node.js
   Modo Local: usa localStorage (fallback)
   ============================================= */

const Data = (() => {
  const SETTINGS_KEY = 'phishing_settings'

  // URL base do servidor — troque pelo IP da AWS após deploy
  // Ex: 'http://54.123.45.67:3000'
  // Deixe '' para usar modo local (localStorage)
  const API_BASE = 'http://SEU_IP_EC2:3000'

  const USE_API = API_BASE !== ''

  /* ---- CONFIGURAÇÕES ---- */
  const DEFAULT_SETTINGS = {
    redirectUrl:    'https://SUA_URL_DE_REDIRECIONAMENTO',
    campaignName:   'Campanha de Conscientização 2025',
    logoText:       'Segurança TI',
    baseUrl:        'http://SEU_IP_EC2:3000/r',
    adminUser:      'admin',
    apiBase:        API_BASE
  }

  function getSettings() {
    const s = localStorage.getItem(SETTINGS_KEY)
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : { ...DEFAULT_SETTINGS }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }

  /* ---- API HELPERS ---- */
  async function apiFetch(path, opts = {}) {
    const base = getSettings().apiBase || API_BASE
    const res  = await fetch(base + path, opts)
    if (!res.ok) throw new Error('API error: ' + res.status)
    return res.json()
  }

  /* ---- COLABORADORES ---- */
  const COLABS_KEY = 'phishing_colaboradores'

  function getColaboradores() {
    const raw = localStorage.getItem(COLABS_KEY)
    return raw ? JSON.parse(raw) : []
  }

  function saveColaboradores(list) {
    localStorage.setItem(COLABS_KEY, JSON.stringify(list))
  }

  async function addColaboradores(list) {
    if (USE_API) {
      const result = await apiFetch('/api/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list)
      })
      return result.importados
    }
    const existing  = getColaboradores()
    const tokensMap = {}
    existing.forEach(c => { tokensMap[c.token] = true })
    const toAdd = list.filter(c => c.nome && c.email && c.token && !tokensMap[c.token])
    saveColaboradores([...existing, ...toAdd])
    return toAdd.length
  }

  async function clearColaboradores() {
    if (USE_API) { await apiFetch('/api/colaboradores', { method: 'DELETE' }); return }
    localStorage.removeItem(COLABS_KEY)
  }

  function getColaboradorByToken(token) {
    return getColaboradores().find(c => c.token === token) || null
  }

  /* ---- RESULTADOS ---- */
  const RESULTS_KEY = 'phishing_resultados'

  function getResultados() {
    const raw = localStorage.getItem(RESULTS_KEY)
    return raw ? JSON.parse(raw) : []
  }

  function saveResultados(list) {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(list))
  }

  function registrarClique(token, ip, browser, os) {
    if (USE_API) return true
    const colab = getColaboradorByToken(token)
    if (!colab) return false
    const resultados = getResultados()
    resultados.push({
      nome:      colab.nome,
      email:     colab.email,
      token:     colab.token,
      dataHora:  new Date().toISOString(),
      ip:        ip  || '—',
      navegador: browser || '—',
      so:        os  || '—'
    })
    saveResultados(resultados)
    return true
  }

  async function clearResultados() {
    if (USE_API) { await apiFetch('/api/resultados', { method: 'DELETE' }); return }
    localStorage.removeItem(RESULTS_KEY)
  }

  /* ---- MÉTRICAS ---- */
  async function getMetrics() {
    if (USE_API) {
      try { return await apiFetch('/api/metricas') }
      catch (e) { console.error('API indisponível, usando localStorage', e) }
    }

    const colabs    = getColaboradores()
    const results   = getResultados()
    const total     = colabs.length

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

    return { total, clicaram, naoClicaram, taxa, chartLabels: sortedDays, chartData: sortedDays.map(d => byDay[d]), tableRows }
  }

  /* ---- SEED DEMO ---- */
  function seedDemoData() {
    if (USE_API) return
    if (getColaboradores().length > 0) return

    const names = [
      ['Ana Carolina Silva','ana.silva'],['Bruno Ferreira Costa','bruno.ferreira'],
      ['Carla Mendes Souza','carla.mendes'],['Daniel Rocha Lima','daniel.rocha'],
      ['Eduardo Santos','eduardo.santos'],['Fernanda Oliveira','fernanda.oliveira'],
      ['Gustavo Alves','gustavo.alves'],['Helena Martins','helena.martins'],
      ['Igor Pereira','igor.pereira'],['Juliana Castro','juliana.castro'],
    ]

    const dominio = 'suaempresa.com.br'
    const colabs  = names.map(([nome, user], i) => ({
      nome, email: `${user}@${dominio}`,
      token: btoa(`${user}-${i}-2025`).replace(/=/g,'').substring(0, 16)
    }))
    saveColaboradores(colabs)
  }

  return {
    getSettings, saveSettings,
    getColaboradores, saveColaboradores, addColaboradores, clearColaboradores, getColaboradorByToken,
    getResultados, saveResultados, registrarClique, clearResultados,
    getMetrics, seedDemoData,
    USE_API, API_BASE
  }
})()
