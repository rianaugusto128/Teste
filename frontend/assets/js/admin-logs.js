(function () {
  const BOT_API = window.PETZILLA_BOT_API || 'http://localhost:3001/api';
  const originalFetch = window.fetch.bind(window);

  function getSession() {
    return window.PetZillaSession?.getSession?.() || JSON.parse(localStorage.getItem('petzilla_sessao') || 'null') || {};
  }

  function adminPayload() {
    const s = getSession();
    return {
      nome: s.nome || 'Administrador',
      usuario: s.usuario || localStorage.getItem('petzilla_admin_usuario') || 'admin',
      perfil: s.perfil || 'ADMIN',
      cargo: s.cargo?.nome || s.perfil || 'ADMIN'
    };
  }

  function moduloFromUrl(url) {
    const u = String(url);
    if (u.includes('/produtos')) return 'Produtos';
    if (u.includes('/categorias')) return 'Categorias';
    if (u.includes('/promocoes')) return 'Promoções';
    if (u.includes('/usuarios')) return 'Usuários';
    if (u.includes('/cargos')) return 'Cargos';
    return null;
  }

  function acaoFromMethod(method, url) {
    method = String(method || 'GET').toUpperCase();
    if (method === 'POST') return 'criou';
    if (method === 'PUT') return 'atualizou';
    if (method === 'PATCH') return url.includes('/estoque') ?'alterou estoque' : 'alterou';
    if (method === 'DELETE') return 'deletou';
    return null;
  }

  function bodyFromOptions(options) {
    try { return JSON.parse(options?.body || '{}'); } catch (_) { return {}; }
  }

  async function sendLog(payload) {
    try {
      await originalFetch(`${BOT_API}/admin-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'petzilla-secret-123' },
        body: JSON.stringify(payload)
      });
    } catch (e) { console.warn('Não foi possível enviar log admin ao bot:', e); }
  }

  window.fetch = async function (input, options = {}) {
    const url = typeof input === 'string' ?input : input?.url || '';
    const method = String(options?.method || 'GET').toUpperCase();
    const modulo = moduloFromUrl(url);
    const acao = acaoFromMethod(method, url);
    const response = await originalFetch(input, options);

    if (response.ok && modulo && acao && ['POST','PUT','PATCH','DELETE'].includes(method)) {
      const item = bodyFromOptions(options);
      sendLog({
        admin: adminPayload(),
        acao,
        modulo,
        item: { ...item, id: String(url).match(/\/(\d+)(?:\/|$)/)?.[1] || item.id || null },
        detalhes: { url, method, horario: new Date().toISOString() }
      });
    }
    return response;
  };
})();
