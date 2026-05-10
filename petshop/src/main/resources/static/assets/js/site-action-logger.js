(function () {
  const METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  const IGNORE = ['/api/site-logs', '/api/suporte'];
  let logging = false;

  function getSession() {
    try { return window.PetZillaSession?.getSession?.() || JSON.parse(localStorage.getItem('petzilla_sessao') || 'null'); }
    catch (_) { return null; }
  }

  function actor() {
    const s = getSession() || {};
    return {
      id: s.id || null,
      nome: s.nome || localStorage.getItem('petzilla_usuario_nome') || 'Administrador',
      usuario: s.usuario || localStorage.getItem('petzilla_admin_usuario') || localStorage.getItem('petzilla_usuario_login') || 'admin',
      perfil: s.perfil || localStorage.getItem('petzilla_usuario_perfil') || 'ADMIN',
      cargo: s.cargo?.nome || (s.perfil === 'ADMIN' ?'Administrador' : 'Sem cargo')
    };
  }

  function classify(url, method) {
    const u = String(url);
    const area = u.includes('/produtos') ?'PRODUTO' : u.includes('/categorias') ?'CATEGORIA' : u.includes('/promocoes') ?'PROMOCAO' : u.includes('/usuarios') ?'USUARIO' : u.includes('/cargos') ?'CARGO' : 'ADMIN';
    const acao = method === 'POST' ?'criou' : method === 'PUT' ?'atualizou' : method === 'PATCH' ?'alterou parcialmente' : method === 'DELETE' ?'excluiu' : 'alterou';
    return { area, acao };
  }

  function parseBody(options = {}) {
    if (!options.body) return null;
    if (typeof options.body !== 'string') return '[corpo nao textual]';
    try { return JSON.parse(options.body); } catch (_) { return options.body.slice(0, 1000); }
  }

  async function readResponse(response) {
    try {
      const clone = response.clone();
      const text = await clone.text();
      if (!text) return null;
      try { return JSON.parse(text); } catch (_) { return text.slice(0, 1000); }
    } catch (_) { return null; }
  }

  function resourceInfo(url) {
    const match = String(url).match(/\/api\/(produtos|categorias|promocoes|usuarios|cargos)\/(\d+)/);
    if (!match) return null;
    return { resource: match[1], id: match[2], baseUrl: String(url).split('/api/')[0] };
  }

  async function fetchBefore(url, method) {
    if (method === 'POST') return null;
    const info = resourceInfo(url);
    if (!info) return null;
    try {
      const res = await window.__pzOriginalFetch(`${info.baseUrl}/api/${info.resource}/${info.id}`, { method: 'GET', cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch (_) { return null; }
  }

  function compact(value) {
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(compact).slice(0, 12);
    const out = {};
    Object.entries(value).forEach(([key, val]) => {
      if (key.toLowerCase().includes('senha')) return;
      out[key] = typeof val === 'object' && val !== null ?compact(val) : val;
    });
    return out;
  }

  function diff(before, after) {
    if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return [];
    return Object.keys(after).filter(key => !key.toLowerCase().includes('senha')).map(key => {
      const antigo = before[key];
      const novo = after[key];
      if (JSON.stringify(antigo) === JSON.stringify(novo)) return null;
      return { campo: key, antes: antigo ?? null, depois: novo ?? null };
    }).filter(Boolean).slice(0, 20);
  }

  async function logAction(url, method, ok, status, requestBody, responseBody, before) {
    if (logging) return;
    const textUrl = String(url);
    if (IGNORE.some(i => textUrl.includes(i))) return;
    if (!textUrl.includes('/api/')) return;
    const { area, acao } = classify(textUrl, method);
    const base = textUrl.split('/api/')[0] + '/api/site-logs';
    const info = resourceInfo(textUrl);
    const detalhes = {
      metodo: method,
      url: textUrl,
      id: info?.id ?? requestBody?.id ?? responseBody?.id ?? null,
      horario: new Date().toISOString(),
      enviado: compact(requestBody),
      antes: compact(before),
      resposta: compact(responseBody),
      mudancas: diff(before, responseBody && typeof responseBody === 'object' ?responseBody : requestBody)
    };
    const payload = { area, acao, alvo: textUrl, statusHttp: status, sucesso: ok, actor: actor(), origem: 'frontend-admin', detalhes };
    try {
      logging = true;
      await window.__pzOriginalFetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch (_) {
    } finally { logging = false; }
  }

  if (!window.__pzOriginalFetch) window.__pzOriginalFetch = window.fetch.bind(window);
  window.fetch = async function (input, options = {}) {
    const url = typeof input === 'string' ?input : input?.url || '';
    const method = String(options?.method || 'GET').toUpperCase();
    const shouldLog = METHODS.has(method) && String(url).includes('/api/') && !IGNORE.some(i => String(url).includes(i));
    const requestBody = shouldLog ?parseBody(options) : null;
    const before = shouldLog ?await fetchBefore(url, method) : null;
    const response = await window.__pzOriginalFetch(input, options);
    if (shouldLog) {
      const responseBody = await readResponse(response);
      logAction(url, method, response.ok, response.status, requestBody, responseBody, before);
    }
    return response;
  };
})();