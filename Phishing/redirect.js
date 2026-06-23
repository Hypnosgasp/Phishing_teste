/* =============================================
   REDIRECT.JS — Captura de clique e redirecionamento
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('t') || params.get('token') || getTokenFromPath();

  if (!token) {
    showError('Token não fornecido', 'O link que você acessou não contém um identificador válido.');
    return;
  }

  const colab = Data.getColaboradorByToken(token);
  if (!colab) {
    showError('Link inválido', 'Este link não é válido ou já foi removido da campanha.');
    return;
  }

  /* Coleta informações do dispositivo */
  const browser = detectBrowser();
  const os      = detectOS();
  const ip      = '—'; /* IP real requer backend; mantemos placeholder no front-end */

  /* Registra o clique */
  Data.registrarClique(token, ip, browser, os);

  /* Redireciona */
  const settings    = Data.getSettings();
  const redirectUrl = settings.redirectUrl || 'https://www.google.com';

  setTimeout(() => {
    window.location.replace(redirectUrl);
  }, 600);
});

/* ---- Suporte a URL no formato /r/TOKEN ---- */
function getTokenFromPath() {
  const m = window.location.pathname.match(/\/r\/([^/]+)/);
  return m ? m[1] : null;
}

/* ---- Detecção de navegador ---- */
function detectBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/'))     return 'Edge ' + (ua.match(/Edg\/(\d+)/)?.[1] || '');
  if (ua.includes('OPR/'))     return 'Opera ' + (ua.match(/OPR\/(\d+)/)?.[1] || '');
  if (ua.includes('Chrome/'))  return 'Chrome ' + (ua.match(/Chrome\/(\d+)/)?.[1] || '');
  if (ua.includes('Firefox/')) return 'Firefox ' + (ua.match(/Firefox\/(\d+)/)?.[1] || '');
  if (ua.includes('Safari/'))  return 'Safari ' + (ua.match(/Version\/(\d+)/)?.[1] || '');
  if (ua.includes('MSIE') || ua.includes('Trident/')) return 'Internet Explorer';
  return 'Outro';
}

/* ---- Detecção de SO ---- */
function detectOS() {
  const ua = navigator.userAgent;
  if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (ua.includes('Windows NT 6.3'))  return 'Windows 8.1';
  if (ua.includes('Windows NT 6.1'))  return 'Windows 7';
  if (ua.includes('Windows'))         return 'Windows';
  if (ua.includes('Mac OS X'))        return 'macOS ' + (ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g,'.') || '');
  if (ua.includes('Android'))         return 'Android ' + (ua.match(/Android ([\d.]+)/)?.[1] || '');
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS ' + (ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g,'.') || '');
  if (ua.includes('Linux'))           return 'Linux';
  return 'Desconhecido';
}

/* ---- Tela de erro ---- */
function showError(title, message) {
  const icon = document.getElementById('redirectIcon');
  const h2   = document.getElementById('redirectTitle');
  const p    = document.getElementById('redirectMsg');

  if (icon) {
    icon.className = 'redirect-icon error';
    icon.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.553.553 0 0 1-1.1 0L7.1 4.995z"/></svg>`;
  }
  if (h2) h2.textContent = title;
  if (p)  p.textContent  = message;
}
