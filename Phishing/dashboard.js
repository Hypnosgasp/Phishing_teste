/* =============================================
   DASHBOARD.JS — Painel administrativo
   ============================================= */

/* ---------- ESTADO ---------- */
let chartInstance  = null;
let allRows        = [];
let filteredRows   = [];
let currentFilter  = 'all';
let sortCol        = 'cliques';
let sortAsc        = false;
let currentPage    = 1;
const PAGE_SIZE    = 15;

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  Data.seedDemoData();
  renderUserInfo();
  loadPage('dashboard');

  /* Navegação lateral */
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      loadPage(el.dataset.page);
    });
  });

  /* Hamburger */
  const ham = document.getElementById('hamburger');
  const overlay = document.getElementById('sidebarOverlay');
  if (ham) {
    ham.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
      overlay.classList.toggle('show');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.remove('open');
      overlay.classList.remove('show');
    });
  }

  /* Logout */
  document.getElementById('logoutBtn').addEventListener('click', Auth.logout);
});

/* ---------- USER INFO ---------- */
function renderUserInfo() {
  const u = Auth.currentUser();
  if (!u) return;
  document.getElementById('userInitials').textContent = u.initials || u.name[0].toUpperCase();
  document.getElementById('userName').textContent      = u.name;
  document.getElementById('userRole').textContent      = 'Administrador';
}

/* ---------- PAGE ROUTER ---------- */
function loadPage(page) {
  const content = document.getElementById('pageContent');
  const title   = document.getElementById('pageTitle');

  switch (page) {
    case 'dashboard':
      title.textContent = 'Painel de Controle';
      content.innerHTML = tplDashboard();
      initDashboard();
      break;
    case 'colaboradores':
      title.textContent = 'Colaboradores';
      content.innerHTML = tplColaboradores();
      initColaboradores();
      break;
    case 'settings':
      title.textContent = 'Configurações';
      content.innerHTML = tplSettings();
      initSettings();
      break;
  }
}

/* ======================================================
   DASHBOARD PAGE
   ====================================================== */
function tplDashboard() {
  return `
  <div class="cards-grid" id="metricsGrid"></div>
  <div class="content-grid">
    <div class="card">
      <div class="card-header">
        <span class="card-title">
          <svg viewBox="0 0 16 16"><path d="M0 11l2-2 4 4L14 3l2 2L6 15z"/></svg>
          Evolução dos Cliques por Dia
        </span>
        <div id="chartLegend" style="font-size:11px;color:var(--text-muted)"></div>
      </div>
      <div class="card-body">
        <div class="chart-wrap"><canvas id="clickChart"></canvas></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">
          <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="8"/></svg>
          Distribuição
        </span>
      </div>
      <div class="card-body" style="position:relative">
        <div class="chart-wrap" style="height:200px"><canvas id="donutChart"></canvas></div>
        <div class="donut-center" id="donutCenter"></div>
        <div class="stat-list" id="statList" style="margin-top:16px"></div>
      </div>
    </div>
  </div>
  <div class="card table-card">
    <div class="card-header">
      <span class="card-title">
        <svg viewBox="0 0 16 16"><path d="M0 2h16v2H0zm0 5h16v2H0zm0 5h16v2H0z"/></svg>
        Registros de Cliques
      </span>
      <span id="tableCount" style="font-size:12px;color:var(--text-muted)"></span>
    </div>
    <div class="toolbar">
      <div class="search-box">
        <svg viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.868-3.834zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/></svg>
        <input type="text" id="searchName" placeholder="Pesquisar por nome…" oninput="applyFilters()">
      </div>
      <div class="search-box" style="max-width:220px">
        <svg viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.758 2.855L15 11.114v-5.73zm-.034 6.878L9.271 8.82 8 9.583 6.728 8.82l-5.694 3.44A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.739z"/></svg>
        <input type="text" id="searchEmail" placeholder="Pesquisar por e-mail…" oninput="applyFilters()">
      </div>
      <div class="filter-tabs">
        <button class="filter-tab active" onclick="setFilter('all',this)">Todos</button>
        <button class="filter-tab" onclick="setFilter('clicked',this)">Clicaram</button>
        <button class="filter-tab" onclick="setFilter('not-clicked',this)">Não Clicaram</button>
      </div>
      <div style="display:flex;gap:6px;margin-left:auto">
        <button class="btn-export green" onclick="exportCSV()">
          <svg viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
          CSV
        </button>
        <button class="btn-export blue" onclick="exportExcel()">
          <svg viewBox="0 0 16 16"><path d="M4.406 0h7.188l4 4v11.594A.406.406 0 0 1 15.188 16H.812A.406.406 0 0 1 .406 15.594V.406A.406.406 0 0 1 .812 0H4.407zM11.594.812v3.782h3.782L11.594.812zM6.5 7L4 11h1.688L7 8.875 8.313 11H10L7.5 7 10 3H8.313L7 5.125 5.688 3H4L6.5 7z"/></svg>
          Excel
        </button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th onclick="sortBy('nome')">Nome <span class="sort-icon">↕</span></th>
            <th onclick="sortBy('email')">E-mail <span class="sort-icon">↕</span></th>
            <th onclick="sortBy('dataHora')">Data / Hora <span class="sort-icon">↕</span></th>
            <th onclick="sortBy('navegador')">Navegador / SO <span class="sort-icon">↕</span></th>
            <th onclick="sortBy('ip')">IP <span class="sort-icon">↕</span></th>
            <th onclick="sortBy('cliques')" style="text-align:center">Cliques <span class="sort-icon">↕</span></th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
      <div id="emptyState" class="empty-state" style="display:none">
        <svg viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.553.553 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <p>Nenhum registro encontrado</p>
      </div>
    </div>
    <div class="table-footer">
      <span id="paginationInfo"></span>
      <div class="pagination" id="pagination"></div>
    </div>
  </div>`;
}

async function initDashboard() {
  const m = await Data.getMetrics();
  renderMetricCards(m);
  renderTable(m);
  renderLineChart(m);
  renderDonut(m);
}

/* ---- METRIC CARDS ---- */
function renderMetricCards(m) {
  const grid = document.getElementById('metricsGrid');
  if (!grid) return;

  const cards = [
    {
      label: 'Total Enviados', value: m.total, color: 'blue',
      sub: 'Colaboradores na campanha',
      icon: `<svg viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/></svg>`
    },
    {
      label: 'Total de Cliques', value: m.clicaram, color: 'red',
      sub: `${m.taxa}% da base total`,
      icon: `<svg viewBox="0 0 16 16"><path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a4.5 4.5 0 0 1-9 0c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 6 6.787V2.277a2.77 2.77 0 0 1-.354-.298C5.342 1.674 5 1.179 5 .5a.5.5 0 0 1 .146-.354zm1.58 1.408-.002-.001.002.001zm-.002-.001.002.001A.5.5 0 0 1 6 2v5a.5.5 0 0 1-.276.447h-.002l-.012.007-.054.03a4.922 4.922 0 0 0-.827.58C4.36 8.475 4 9.038 4 9.5a3.5 3.5 0 0 0 7 0c0-.462-.36-1.025-.83-1.436a4.92 4.92 0 0 0-.827-.58l-.054-.03-.012-.007h-.002A.5.5 0 0 1 9 7V2a.5.5 0 0 1 .295-.454l.008-.004z"/></svg>`
    },
    {
      label: 'Não Clicaram', value: m.naoClicaram, color: 'green',
      sub: 'Resistiram à simulação',
      icon: `<svg viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/></svg>`
    },
    {
      label: 'Taxa de Clique', value: m.taxa + '%', color: 'orange',
      sub: 'Percentual da campanha',
      icon: `<svg viewBox="0 0 16 16"><path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2z"/></svg>`
    }
  ];

  grid.innerHTML = cards.map(c => `
    <div class="metric-card ${c.color}">
      <div class="metric-header">
        <span>${c.label}</span>
        <div class="metric-icon ${c.color}">${c.icon}</div>
      </div>
      <div class="metric-value">${c.value}</div>
      <div class="metric-footer">${c.sub}</div>
    </div>`).join('');
}

/* ---- LINE CHART ---- */
function renderLineChart(m) {
  const ctx = document.getElementById('clickChart');
  if (!ctx) return;
  if (chartInstance) { chartInstance.destroy(); }

  const labels = m.chartLabels.length ? m.chartLabels : ['Sem dados'];
  const data   = m.chartData.length   ? m.chartData   : [0];

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Cliques',
        data,
        backgroundColor: 'rgba(0,120,212,.15)',
        borderColor: 'rgba(0,120,212,1)',
        borderWidth: 2,
        borderRadius: 4,
        fill: true,
        tension: .4,
        type: 'line',
        pointBackgroundColor: '#0078d4',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1b1a19',
          titleColor: '#fff',
          bodyColor: '#c8c6c4',
          padding: 10,
          callbacks: {
            title: items => {
              const d = new Date(items[0].label + 'T12:00:00');
              return d.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short' });
            },
            label: item => `  ${item.raw} clique${item.raw !== 1 ? 's' : ''}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            color: '#605e5c',
            callback: function(val, idx) {
              const d = new Date(this.getLabelForValue(val) + 'T12:00:00');
              return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#edebe9' },
          ticks: { font: { size: 11 }, color: '#605e5c', precision: 0 }
        }
      }
    }
  });
}

/* ---- DONUT ---- */
function renderDonut(m) {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;

  const clicked    = m.clicaram;
  const notClicked = m.naoClicaram;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Clicaram', 'Não Clicaram'],
      datasets: [{
        data: [clicked || 0.01, notClicked || 0.01],
        backgroundColor: ['#e81123', '#107c10'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1b1a19',
          callbacks: { label: i => `  ${i.label}: ${i.raw === 0.01 ? 0 : i.raw}` }
        }
      }
    }
  });

  const center = document.getElementById('donutCenter');
  if (center) {
    center.innerHTML = `<strong>${m.taxa}%</strong><span>Taxa de Clique</span>`;
  }

  const statList = document.getElementById('statList');
  if (statList) {
    const total = m.total || 1;
    statList.innerHTML = `
      <div class="stat-item">
        <div class="stat-item-header"><span>Clicaram</span><strong>${clicked}</strong></div>
        <div class="progress-bar"><div class="progress-fill blue" style="width:${(clicked/total*100).toFixed(1)}%"></div></div>
      </div>
      <div class="stat-item">
        <div class="stat-item-header"><span>Não Clicaram</span><strong>${notClicked}</strong></div>
        <div class="progress-bar"><div class="progress-fill green" style="width:${(notClicked/total*100).toFixed(1)}%"></div></div>
      </div>`;
  }
}

/* ---- TABLE ---- */
function renderTable(m) {
  allRows = m.tableRows;
  applyFilters();
}

function setFilter(f, btn) {
  currentFilter = f;
  currentPage   = 1;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function applyFilters() {
  const nameQ  = (document.getElementById('searchName')?.value  || '').toLowerCase();
  const emailQ = (document.getElementById('searchEmail')?.value || '').toLowerCase();

  filteredRows = allRows.filter(r => {
    const matchName  = r.nome.toLowerCase().includes(nameQ);
    const matchEmail = r.email.toLowerCase().includes(emailQ);
    const matchFilter =
      currentFilter === 'all'         ? true :
      currentFilter === 'clicked'     ? r.cliques > 0 :
      currentFilter === 'not-clicked' ? r.cliques === 0 : true;
    return matchName && matchEmail && matchFilter;
  });

  sortRows();
  renderTableBody();
}

function sortBy(col) {
  if (sortCol === col) sortAsc = !sortAsc;
  else { sortCol = col; sortAsc = true; }
  document.querySelectorAll('thead th').forEach(th => th.classList.remove('sorted'));
  const headers = ['nome','email','dataHora','navegador','ip','cliques','status'];
  const idx = headers.indexOf(col);
  if (idx >= 0) {
    document.querySelectorAll('thead th')[idx]?.classList.add('sorted');
  }
  sortRows();
  renderTableBody();
}

function sortRows() {
  filteredRows.sort((a, b) => {
    let va = a[sortCol] ?? '', vb = b[sortCol] ?? '';
    if (sortCol === 'cliques') { va = +va; vb = +vb; }
    else if (sortCol === 'dataHora') { va = va || ''; vb = vb || ''; }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    if (va < vb) return sortAsc ? -1 :  1;
    if (va > vb) return sortAsc ?  1 : -1;
    return 0;
  });
}

function renderTableBody() {
  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('tableCount');
  if (!tbody) return;

  const total = filteredRows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const start  = (currentPage - 1) * PAGE_SIZE;
  const page   = filteredRows.slice(start, start + PAGE_SIZE);

  if (count) count.textContent = `${total} registro${total !== 1 ? 's' : ''}`;

  if (page.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    renderPagination(0, 1);
    return;
  }

  if (empty) empty.style.display = 'none';

  tbody.innerHTML = page.map(r => {
    const dt = r.dataHora ? new Date(r.dataHora).toLocaleString('pt-BR') : '—';
    const nav = r.navegador ? `<span class="browser-chip">${r.navegador}</span>` : '—';
    const badge = r.cliques > 0
      ? `<span class="status-badge clicked"><svg viewBox="0 0 16 16"><path d="M8.18 1.143l.18.18a.5.5 0 0 1 0 .708L5.793 4.604 7 5.81l2.567-2.567a.5.5 0 0 1 .708 0l.18.18a.5.5 0 0 1 0 .708L7.888 6.698l.312.313 2.568-2.568a.5.5 0 0 1 .708 0l.18.18a.5.5 0 0 1 0 .708L9.09 7.9l.312.312 2.568-2.568a.5.5 0 0 1 .707 0l.181.181a.5.5 0 0 1 0 .707l-4 4a2.5 2.5 0 0 1-3.536 0L3.5 9.207a.5.5 0 0 1 0-.707l.707-.707a.5.5 0 0 1 .707 0l.5.5a1.5 1.5 0 0 0 2.121 0z"/></svg>Clicou</span>`
      : `<span class="status-badge not-clicked"><svg viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>Seguro</span>`;
    const clk = `<span class="click-count ${r.cliques === 0 ? 'zero' : ''}">${r.cliques}</span>`;
    return `<tr>
      <td class="cell-name">${r.nome}</td>
      <td class="cell-email">${r.email}</td>
      <td>${dt}</td>
      <td>${nav}${r.so ? ` <small style="color:var(--text-muted)">${r.so}</small>` : ''}</td>
      <td><code style="font-size:11px;color:var(--text-secondary)">${r.ip || '—'}</code></td>
      <td style="text-align:center">${clk}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');

  renderPagination(total, pages);
}

function renderPagination(total, pages) {
  const info  = document.getElementById('paginationInfo');
  const wrap  = document.getElementById('pagination');
  if (!info || !wrap) return;

  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end   = Math.min(currentPage * PAGE_SIZE, total);
  info.textContent = total > 0 ? `Exibindo ${start}–${end} de ${total}` : '';

  if (pages <= 1) { wrap.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - currentPage) <= 1) {
      html += `<button class="page-btn ${p===currentPage?'active':''}" onclick="goPage(${p})">${p}</button>`;
    } else if (Math.abs(p - currentPage) === 2) {
      html += `<span style="display:flex;align-items:center;padding:0 4px;color:var(--text-muted);font-size:12px">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===pages?'disabled':''}>›</button>`;
  wrap.innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  renderTableBody();
}

/* ---- EXPORTS ---- */
function exportCSV() {
  const rows = filteredRows;
  const header = ['Nome','Email','Token','Data/Hora','IP','Navegador','SO','Cliques'];
  const lines  = [header.join(',')];
  rows.forEach(r => {
    lines.push([
      `"${r.nome}"`, `"${r.email}"`, `"${r.token}"`,
      `"${r.dataHora ? new Date(r.dataHora).toLocaleString('pt-BR') : ''}"`,
      `"${r.ip || ''}"`, `"${r.navegador || ''}"`, `"${r.so || ''}"`, r.cliques
    ].join(','));
  });

  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `phishing_resultados_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exportado com sucesso!', 'success');
}

function exportExcel() {
  /* Usa SheetJS (XLSX) carregado via CDN */
  if (typeof XLSX === 'undefined') {
    toast('Biblioteca XLSX não carregada.', 'error'); return;
  }
  const data = filteredRows.map(r => ({
    'Nome':       r.nome,
    'E-mail':     r.email,
    'Token':      r.token,
    'Data/Hora':  r.dataHora ? new Date(r.dataHora).toLocaleString('pt-BR') : '',
    'IP':         r.ip        || '',
    'Navegador':  r.navegador || '',
    'SO':         r.so        || '',
    'Cliques':    r.cliques,
    'Status':     r.cliques > 0 ? 'Clicou' : 'Não Clicou'
  }));

  const ws  = XLSX.utils.json_to_sheet(data);
  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
  XLSX.writeFile(wb, `phishing_resultados_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Excel exportado com sucesso!', 'success');
}

/* ======================================================
   COLABORADORES PAGE
   ====================================================== */
function tplColaboradores() {
  const colabs = Data.getColaboradores();
  const settings = Data.getSettings();
  return `
  <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
    <button class="btn-primary" onclick="showImportModal()">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="#fff" style="vertical-align:middle;margin-right:6px"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 0-.708-.708l-3-3 3-3z"/></svg>
      Importar Excel / CSV
    </button>
    <button class="btn-secondary" onclick="exportColabsCSV()">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:middle;margin-right:6px"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.75 0 1 0-.708.708l3 3z"/></svg>
      Exportar Links
    </button>
    <button class="btn-secondary" onclick="if(confirm('Limpar todos os colaboradores?')) { Data.clearColaboradores(); loadPage(\'colaboradores\'); toast(\'Lista limpa.\',\'info\'); }">
      Limpar Lista
    </button>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title">Colaboradores (${colabs.length})</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>#</th><th>Nome</th><th>E-mail</th><th>Token</th><th>Link Único</th>
        </tr></thead>
        <tbody>
          ${colabs.length === 0
            ? `<tr><td colspan="5"><div class="empty-state"><p>Nenhum colaborador cadastrado. Importe uma planilha.</p></div></td></tr>`
            : colabs.map((c, i) => `<tr>
                <td style="color:var(--text-muted)">${i+1}</td>
                <td class="cell-name">${c.nome}</td>
                <td class="cell-email">${c.email}</td>
                <td><code style="font-size:11px;background:var(--neutral-bg);padding:2px 6px;border-radius:3px">${c.token}</code></td>
                <td><span style="font-size:11px;color:var(--primary);word-break:break-all">${settings.baseUrl}/redirect.html?t=${c.token}</span></td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <div id="importModal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h3>Importar Colaboradores</h3>
        <button class="modal-close" onclick="closeImportModal()">×</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
          Importe um arquivo <strong>.xlsx</strong> ou <strong>.csv</strong> com colunas: <code>nome</code>, <code>email</code>, <code>token</code>.
        </p>
        <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
          <svg viewBox="0 0 16 16"><path d="M4.406 0h7.188l4 4v11.594A.406.406 0 0 1 15.188 16H.812A.406.406 0 0 1 .406 15.594V.406A.406.406 0 0 1 .812 0H4.407zM11.594.812v3.782h3.782L11.594.812z"/></svg>
          <p>Arraste e solte o arquivo aqui<br>ou <strong>clique para selecionar</strong></p>
          <input type="file" id="fileInput" accept=".xlsx,.csv" style="display:none" onchange="handleFileImport(this)">
        </div>
        <div id="importPreview" style="margin-top:12px;font-size:13px;color:var(--text-secondary)"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeImportModal()">Cancelar</button>
        <button class="btn-primary" id="confirmImport" style="display:none" onclick="confirmImport()">Importar</button>
      </div>
    </div>
  </div>`;
}

let importBuffer = [];

function initColaboradores() {
  const dz = document.getElementById('dropZone');
  if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f) processImportFile(f);
  });
}

function showImportModal()  { document.getElementById('importModal').classList.add('show'); }
function closeImportModal() { document.getElementById('importModal').classList.remove('show'); importBuffer = []; }

function handleFileImport(input) {
  const f = input.files[0];
  if (f) processImportFile(f);
}

function processImportFile(file) {
  if (typeof XLSX === 'undefined') { toast('Biblioteca XLSX não carregada.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, { type: 'binary' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      importBuffer = data.map(row => {
        const keys = Object.keys(row).map(k => k.toLowerCase().trim());
        const get  = k => {
          const match = Object.keys(row).find(rk => rk.toLowerCase().trim() === k);
          return match ? String(row[match]).trim() : '';
        };
        return { nome: get('nome'), email: get('email') || get('e-mail'), token: get('token') };
      }).filter(r => r.nome && r.email && r.token);

      const prev = document.getElementById('importPreview');
      const btn  = document.getElementById('confirmImport');
      if (importBuffer.length === 0) {
        prev.innerHTML = `<span style="color:#e81123">⚠ Nenhum registro válido encontrado. Verifique as colunas: nome, email, token.</span>`;
        btn.style.display = 'none';
      } else {
        prev.innerHTML = `<span style="color:var(--success)">✓ ${importBuffer.length} colaborador(es) encontrado(s).</span>`;
        btn.style.display = '';
      }
    } catch (err) {
      document.getElementById('importPreview').innerHTML = `<span style="color:#e81123">Erro ao ler arquivo: ${err.message}</span>`;
    }
  };
  reader.readAsBinaryString(file);
}

async function confirmImport() {
  const total  = importBuffer.length;
  const added  = await Data.addColaboradores(importBuffer);
  closeImportModal();
  loadPage('colaboradores');
  if (added === 0 && total > 0) {
    toast(`Todos os ${total} colaborador(es) já estavam cadastrados no servidor — nenhum duplicado foi adicionado.`, 'info');
  } else {
    toast(`${added} colaborador(es) importado(s) com sucesso!`, 'success');
  }
  importBuffer = [];
}

function exportColabsCSV() {
  const colabs   = Data.getColaboradores();
  const settings = Data.getSettings();
  const lines    = ['Nome,Email,Token,Link'];
  colabs.forEach(c => {
    lines.push([
      `"${c.nome}"`, `"${c.email}"`, `"${c.token}"`,
      `"${settings.baseUrl}/redirect.html?t=${c.token}"`
    ].join(','));
  });
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `colaboradores_links_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Links exportados!', 'success');
}

/* ======================================================
   SETTINGS PAGE
   ====================================================== */
function tplSettings() {
  const s = Data.getSettings();
  const u = Auth.currentUser();
  return `
  <div class="settings-form">
    <div class="settings-section">
      <div class="card-header">
        <span class="card-title">Configurações da Campanha</span>
      </div>
      <div class="settings-grid">
        <div class="full">
          <label class="settings-label">Nome da Campanha</label>
          <input class="settings-input" id="cfg_campaign" value="${s.campaignName}">
        </div>
        <div class="full">
          <label class="settings-label">URL de Redirecionamento (SharePoint)</label>
          <input class="settings-input" id="cfg_redirect" value="${s.redirectUrl}">
        </div>
        <div>
          <label class="settings-label">URL Base do Portal</label>
          <input class="settings-input" id="cfg_base" value="${s.baseUrl}">
        </div>
        <div>
          <label class="settings-label">Nome / Logo da Empresa</label>
          <input class="settings-input" id="cfg_logo" value="${s.logoText}">
        </div>
      </div>
      <div style="padding:0 20px 20px">
        <button class="btn-save" onclick="saveSettings()">Salvar Configurações</button>
      </div>
    </div>
    <div class="settings-section">
      <div class="card-header">
        <span class="card-title">Alterar Senha</span>
      </div>
      <div class="settings-grid">
        <div>
          <label class="settings-label">Senha Atual</label>
          <input class="settings-input" type="password" id="pwd_old" placeholder="••••••••">
        </div>
        <div></div>
        <div>
          <label class="settings-label">Nova Senha</label>
          <input class="settings-input" type="password" id="pwd_new" placeholder="••••••••">
        </div>
        <div>
          <label class="settings-label">Confirmar Nova Senha</label>
          <input class="settings-input" type="password" id="pwd_confirm" placeholder="••••••••">
        </div>
      </div>
      <div style="padding:0 20px 20px">
        <button class="btn-save" onclick="changePassword()">Alterar Senha</button>
      </div>
    </div>
    <div class="settings-section">
      <div class="card-header">
        <span class="card-title">Dados da Campanha</span>
      </div>
      <div style="padding:20px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-secondary" onclick="if(confirm('Limpar todos os registros de cliques?')) { Data.clearResultados(); toast('Resultados limpos.','info'); }">
          Limpar Registros de Cliques
        </button>
        <button class="btn-secondary" onclick="Data.seedDemoData(); toast('Dados demo restaurados.','success')">
          Restaurar Dados Demo
        </button>
      </div>
    </div>
  </div>`;
}

function initSettings() {}

function saveSettings() {
  Data.saveSettings({
    campaignName: document.getElementById('cfg_campaign').value,
    redirectUrl:  document.getElementById('cfg_redirect').value,
    baseUrl:      document.getElementById('cfg_base').value,
    logoText:     document.getElementById('cfg_logo').value
  });
  toast('Configurações salvas!', 'success');
  /* Atualiza título da sidebar */
  const sn = document.querySelector('.sidebar-header span');
  if (sn) sn.textContent = document.getElementById('cfg_logo').value;
}

function changePassword() {
  const u       = Auth.currentUser();
  const oldPwd  = document.getElementById('pwd_old').value;
  const newPwd  = document.getElementById('pwd_new').value;
  const confirm = document.getElementById('pwd_confirm').value;
  if (!oldPwd || !newPwd) { toast('Preencha todos os campos.', 'error'); return; }
  if (newPwd !== confirm)  { toast('Senhas não conferem.', 'error'); return; }
  if (newPwd.length < 6)   { toast('Senha deve ter pelo menos 6 caracteres.', 'error'); return; }
  if (Auth.changePassword(u.username, oldPwd, newPwd)) {
    toast('Senha alterada! Faça login novamente.', 'success');
    setTimeout(Auth.logout, 1500);
  } else {
    toast('Senha atual incorreta.', 'error');
  }
}

/* ======================================================
   TOAST NOTIFICATIONS
   ====================================================== */
function toast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el  = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3000);
}
