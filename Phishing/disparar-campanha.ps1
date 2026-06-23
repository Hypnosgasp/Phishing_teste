# ================================================================
#  DISPARAR-CAMPANHA.PS1 — Campanha de Conscientizacao
#  Servidor: Gmail (smtp.gmail.com:587)
# ================================================================
#
#  PRE-REQUISITO — SENHA DE APP DO GMAIL:
#  1. Acesse: https://myaccount.google.com/apppasswords
#  2. Selecione "E-mail" e "Computador Windows"
#  3. Clique em Gerar e copie a senha de 16 caracteres
#  4. Use ESSA senha quando o script pedir (nao use sua senha normal)
#
# ================================================================

# ----------------------------------------------------------------
# CONFIGURACOES — edite antes de executar
# ----------------------------------------------------------------

$Remetente         = "seu-email@gmail.com"
$NomeRemetente     = "Equipe de Seguranca da Informacao"
$Assunto           = "ASSUNTO DO EMAIL DE TESTE"
$UrlBase           = "http://SEU_IP_EC2:3000/r"
$ArquivoColabs     = ".\colaboradores.csv"
$ArquivoTokens     = ".\colaboradores_com_tokens.csv"
$ArquivoLog        = ".\log_envios.txt"
$IntervaloSegundos = 3

# E-mail de teste — preencha para enviar so para 1 pessoa
# Deixe "" para enviar para todos
$EmailTeste = "email-de-teste@suaempresa.com"

# $false = envia de verdade | $true = so mostra no console
$ModoTeste = $true

# ----------------------------------------------------------------
# FUNCOES
# ----------------------------------------------------------------

function Gerar-Token {
    param([string]$Email, [int]$Index)
    $seed  = $Email + $Index.ToString() + (Get-Date -Format "yyyyMMdd")
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($seed)
    $hash  = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    $b64   = [Convert]::ToBase64String($hash)
    $clean = $b64 -replace '[^A-Za-z0-9]', ''
    return $clean.Substring(0, 14)
}

function Escrever-Log {
    param([string]$Mensagem, [string]$Tipo = "INFO")
    $ts    = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $linha = "[$ts] [$Tipo] $Mensagem"
    $cor   = switch ($Tipo) { "ERRO" { "Red" } "OK" { "Green" } default { "Cyan" } }
    Write-Host $linha -ForegroundColor $cor
    Add-Content -Path $ArquivoLog -Value $linha -Encoding UTF8
}

function Montar-Email {
    param([string]$PrimeiroNome, [string]$Link)

    $corpo = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
body{margin:0;padding:0;background:#f3f2f1;font-family:'Segoe UI',Arial,sans-serif}
.wrapper{max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.10)}
.header{background:#0078d4;padding:28px 36px}
.header h1{color:#fff;font-size:18px;margin:0;font-weight:600}
.header p{color:rgba(255,255,255,.8);font-size:12px;margin:4px 0 0}
.body{padding:32px 36px;color:#201f1e}
.body p{font-size:14px;line-height:1.7;margin:0 0 16px}
.btn-wrap{text-align:center;margin:28px 0}
.btn{display:inline-block;background:#0078d4;color:#fff;text-decoration:none;padding:12px 32px;border-radius:4px;font-size:14px;font-weight:600}
.footer{background:#f3f2f1;padding:20px 36px;text-align:center}
.footer p{font-size:11px;color:#a19f9d;margin:0;line-height:1.6}
.alert{background:#fff4e5;border-left:4px solid #ca5010;padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:20px;font-size:13px;color:#3e2c1c}
hr{border:none;border-top:1px solid #edebe9;margin:20px 0}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>Seguranca da Informacao</h1>
    <p>Comunicado Interno - Acao Requerida</p>
  </div>
  <div class="body">
    <p>Ola, <strong>$PrimeiroNome</strong>,</p>
    <div class="alert">Identificamos uma pendencia que requer sua atencao.</div>
    <p>Clique no botao abaixo para acessar o documento:</p>
    <div class="btn-wrap">
      <a href="$Link" class="btn">Acessar Documento</a>
    </div>
    <p>Caso o botao nao funcione, copie e cole o link abaixo no navegador:</p>
    <p style="word-break:break-all;font-size:12px;color:#605e5c;background:#f3f2f1;padding:10px;border-radius:4px">$Link</p>
    <hr>
    <p style="font-size:12px;color:#605e5c">Este e um comunicado oficial da area de Tecnologia da Informacao.</p>
  </div>
  <div class="footer">
    <p>Sua Empresa - Seguranca da Informacao<br>Mensagem confidencial destinada exclusivamente ao destinatario.</p>
  </div>
</div>
</body>
</html>
"@
    return $corpo
}

# ================================================================
# INICIO
# ================================================================

Clear-Host
Write-Host ""
Write-Host "  CAMPANHA DE CONSCIENTIZACAO - DISPARO DE E-MAIL" -ForegroundColor Cyan
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host ""

if ($ModoTeste) {
    Write-Host "  [MODO TESTE] Nenhum e-mail sera enviado." -ForegroundColor Yellow
    Write-Host ""
}

if (-not [string]::IsNullOrWhiteSpace($EmailTeste)) {
    Write-Host "  [FILTRO ATIVO] Enviando apenas para: $EmailTeste" -ForegroundColor Yellow
    Write-Host ""
}

if (-not (Test-Path $ArquivoColabs)) {
    Write-Host "  ERRO: Arquivo nao encontrado: $ArquivoColabs" -ForegroundColor Red
    Read-Host "`n  Pressione Enter para sair"
    exit 1
}

$Colaboradores = Import-Csv -Path $ArquivoColabs -Encoding UTF8

if ($Colaboradores.Count -eq 0) {
    Write-Host "  ERRO: Nenhum colaborador encontrado." -ForegroundColor Red
    exit 1
}

Write-Host "  Colaboradores carregados: $($Colaboradores.Count)" -ForegroundColor White
Write-Host ""

if (-not $ModoTeste) {
    $Credencial = Get-Credential -UserName $Remetente -Message "Informe a Senha de App do Gmail (16 caracteres)"
}

"Nome,Email,Token,Link" | Out-File -FilePath $ArquivoTokens -Encoding UTF8

$Enviados = 0
$Erros    = 0
$Pulados  = 0
$Total    = $Colaboradores.Count
$i        = 0

foreach ($colab in $Colaboradores) {
    $i++

    $NomeCompleto = ""
    foreach ($prop in $colab.PSObject.Properties) {
        if ($prop.Name.Trim().ToLower() -eq "nome") {
            $NomeCompleto = $prop.Value.Trim()
            break
        }
    }
    if ([string]::IsNullOrWhiteSpace($NomeCompleto)) { $NomeCompleto = "Colaborador" }

    $EmailDest = ""
    foreach ($prop in $colab.PSObject.Properties) {
        if ($prop.Name.Trim().ToLower() -in @("email", "e-mail")) {
            $EmailDest = $prop.Value.Trim()
            break
        }
    }

    if ([string]::IsNullOrWhiteSpace($EmailDest)) {
        Escrever-Log "Linha ignorada - sem e-mail: $NomeCompleto" "AVISO"
        continue
    }

    if (-not [string]::IsNullOrWhiteSpace($EmailTeste) -and $EmailDest.ToLower() -ne $EmailTeste.ToLower()) {
        $Pulados++
        continue
    }

    $Token = ""
    foreach ($prop in $colab.PSObject.Properties) {
        if ($prop.Name.Trim().ToLower() -eq "token") {
            $Token = $prop.Value.Trim()
            break
        }
    }
    if ([string]::IsNullOrWhiteSpace($Token)) {
        $Token = Gerar-Token -Email $EmailDest -Index $i
    }

    $PrimeiroNome = ($NomeCompleto -split " ")[0]
    $Link         = "$UrlBase/$Token"

    """$NomeCompleto"",""$EmailDest"",""$Token"",""$Link""" | Add-Content -Path $ArquivoTokens -Encoding UTF8

    Write-Host "  [$i/$Total] $NomeCompleto - $EmailDest" -NoNewline

    if ($ModoTeste) {
        Write-Host "  -> [TESTE] Token: $Token" -ForegroundColor Yellow
        $Enviados++
        continue
    }

    try {
        $Corpo = Montar-Email -PrimeiroNome $PrimeiroNome -Link $Link

        Send-MailMessage `
            -SmtpServer   "smtp.gmail.com" `
            -Port         587 `
            -UseSsl `
            -Credential   $Credencial `
            -From         "$NomeRemetente <$Remetente>" `
            -To           $EmailDest `
            -Subject      $Assunto `
            -Body         $Corpo `
            -BodyAsHtml `
            -Encoding     UTF8

        Write-Host "  OK" -ForegroundColor Green
        Escrever-Log "Enviado: $NomeCompleto - $EmailDest | Token: $Token" "OK"
        $Enviados++

    } catch {
        Write-Host "  ERRO: $_" -ForegroundColor Red
        Escrever-Log "FALHA: $NomeCompleto - $EmailDest | Erro: $_" "ERRO"
        $Erros++
    }

    Start-Sleep -Seconds $IntervaloSegundos
}

Write-Host ""
Write-Host "  ================================" -ForegroundColor Cyan
Write-Host "  RESUMO" -ForegroundColor Cyan
Write-Host "  ================================" -ForegroundColor Cyan
Write-Host "  Total na planilha : $Total"
Write-Host "  Enviados          : $Enviados" -ForegroundColor Green
Write-Host "  Erros             : $Erros"    -ForegroundColor $(if ($Erros -gt 0) { "Red" } else { "White" })
Write-Host "  Pulados (filtro)  : $Pulados"
Write-Host "  Arquivo de tokens : $ArquivoTokens"
Write-Host "  Log de envios     : $ArquivoLog"
Write-Host ""

Read-Host "  Pressione Enter para sair"
