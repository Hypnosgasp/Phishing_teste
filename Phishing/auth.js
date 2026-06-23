/* =============================================
   AUTH.JS — Autenticação e controle de sessão
   ============================================= */

const Auth = (() => {
  const SESSION_KEY = 'phishing_admin_session';
  const USERS_KEY   = 'phishing_admin_users';

  /* Usuários padrão — altere via Configurações */
  const DEFAULT_USERS = [
    { username: 'admin', password: 'Admin@2025', name: 'Administrador', initials: 'AD' }
  ];

  function getUsers() {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_USERS;
  }

  function login(username, password) {
    const users = getUsers();
    const user  = users.find(u => u.username === username && u.password === password);
    if (!user) return false;
    const session = {
      username: user.username,
      name:     user.name,
      initials: user.initials,
      ts:       Date.now()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  }

  function isLoggedIn() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    /* sessão expira em 8 horas */
    return (Date.now() - session.ts) < 8 * 60 * 60 * 1000;
  }

  function currentUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'index.html';
    }
  }

  function changePassword(username, oldPwd, newPwd) {
    const users = getUsers();
    const idx   = users.findIndex(u => u.username === username && u.password === oldPwd);
    if (idx === -1) return false;
    users[idx].password = newPwd;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  }

  return { login, logout, isLoggedIn, currentUser, requireAuth, changePassword, getUsers };
})();
