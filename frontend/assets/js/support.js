(function () {
  const PORTS = [8080, 8081];
  let SUPPORT_API = window.PETZILLA_SUPPORT_API || 'http://localhost:8080/api/suporte';
  const STORAGE_KEY = 'petzilla_suporte_ticket_id';
  let ticketId = localStorage.getItem(STORAGE_KEY) || null;
  let pollTimer = null;

  function esc(v = '') {
    return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function session() {
    return window.PetZillaSession?.getSession?.() || JSON.parse(localStorage.getItem('petzilla_sessao') || 'null') || {};
  }

  async function descobrirBackend() {
    if (window.location.protocol.startsWith('http') && window.location.origin) {
      try {
        const response = await fetch(`${window.location.origin}/api/produtos`);
        if (response.ok) {
          SUPPORT_API = `${window.location.origin}/api/suporte`;
          return true;
        }
      } catch (_) {}
    }

    for (const porta of PORTS) {
      try {
        const response = await fetch(`http://localhost:${porta}/api/produtos`);
        if (response.ok) {
          SUPPORT_API = `http://localhost:${porta}/api/suporte`;
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  function ensureWidget() {
    if (document.getElementById('supportLauncher')) return;
    const s = session();
    document.body.insertAdjacentHTML('beforeend', `
      <button id="supportLauncher" class="fixed bottom-5 right-5 z-[9998] w-16 h-16 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-2xl flex items-center justify-center text-2xl">
        <i class="fas fa-headset"></i>
      </button>
      <section id="supportBox" class="hidden fixed bottom-24 right-5 z-[9999] w-[calc(100vw-2rem)] max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-teal-100">
        <div class="bg-slate-950 text-white p-5 flex items-center justify-between">
          <div><p class="text-orange-300 font-black text-xs tracking-widest">ATENDIMENTO</p><h2 class="text-2xl font-black">Suporte PetZilla</h2></div>
          <button id="supportClose" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20"><i class="fas fa-xmark"></i></button>
        </div>
        <div id="supportStart" class="p-5 space-y-3">
          <p class="text-slate-600">Digite sua dúvida. A equipe acompanha esta conversa pelo painel de suporte.</p>
          <input id="supportNome" value="${esc(s.nome || '')}" placeholder="Seu nome" class="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-teal-100">
          <input id="supportEmail" value="${esc(s.email || '')}" placeholder="Seu email" class="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-teal-100">
          <input id="supportAssunto" placeholder="Assunto" class="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-teal-100">
          <textarea id="supportMensagem" placeholder="Digite sua mensagem..." rows="4" class="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-teal-100 resize-none"></textarea>
          <button id="supportSendStart" class="w-full bg-teal-600 hover:bg-teal-700 text-white px-5 py-4 rounded-2xl font-black"><i class="fas fa-paper-plane mr-2"></i>Enviar suporte</button>
          <p id="supportStartStatus" class="hidden text-sm font-bold"></p>
        </div>
        <div id="supportChat" class="hidden">
          <div id="supportMessages" class="h-80 overflow-y-auto p-5 bg-slate-50 space-y-3"></div>
          <div class="p-4 border-t border-slate-100 space-y-3">
            <button id="supportHuman" class="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-2xl font-black"><i class="fas fa-user-headset mr-2"></i>Aguardar atendimento</button>
            <div class="flex gap-2">
              <input id="supportInput" placeholder="Escreva uma mensagem..." class="flex-1 px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-teal-100">
              <button id="supportSendMsg" class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-2xl font-black"><i class="fas fa-paper-plane"></i></button>
            </div>
            <p id="supportChatStatus" class="hidden text-sm font-bold"></p>
          </div>
        </div>
      </section>`);

    document.getElementById('supportLauncher').onclick = () => openBox();
    document.getElementById('supportClose').onclick = () => closeBox();
    document.getElementById('supportSendStart').onclick = startTicket;
    document.getElementById('supportSendMsg').onclick = sendMessage;
    document.getElementById('supportInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
    document.getElementById('supportHuman').onclick = requestHuman;
  }

  function status(id, msg, ok = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `text-sm font-bold ${ok ?'text-emerald-700' : 'text-red-600'}`;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function openBox() {
    document.getElementById('supportBox').classList.remove('hidden');
    if (ticketId) showChat();
  }
  function closeBox() { document.getElementById('supportBox').classList.add('hidden'); }

  function showChat() {
    document.getElementById('supportStart').classList.add('hidden');
    document.getElementById('supportChat').classList.remove('hidden');
    loadMessages();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(loadMessages, 2500);
  }

  function renderMessages(messages) {
    const box = document.getElementById('supportMessages');
    box.innerHTML = messages.map(m => {
      const mine = m.autorTipo === 'CLIENTE';
      const bot = m.autorTipo === 'BOT';
      return `<div class="${mine ?'text-right' : 'text-left'}">
        <div class="inline-block max-w-[85%] rounded-2xl px-4 py-3 ${mine ?'bg-teal-600 text-white' : bot ?'bg-orange-100 text-orange-900' : 'bg-white border border-slate-200 text-slate-800'}">
          <p class="text-xs font-black opacity-75 mb-1">${esc(m.autorNome || m.autorTipo)}</p>
          <p class="text-sm leading-relaxed">${esc(m.mensagem)}</p>
        </div>
      </div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  async function startTicket() {
    await descobrirBackend();
    const payload = {
      nome: document.getElementById('supportNome').value.trim(),
      email: document.getElementById('supportEmail').value.trim(),
      assunto: document.getElementById('supportAssunto').value.trim(),
      mensagem: document.getElementById('supportMensagem').value.trim(),
    };
    if (!payload.nome || !payload.email || !payload.mensagem) return status('supportStartStatus', 'Informe nome, email e mensagem.');
    try {
      const r = await fetch(`${SUPPORT_API}/tickets`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.mensagem || data.error || 'Erro ao iniciar suporte.');
      ticketId = data.id || data.ticketId;
      localStorage.setItem(STORAGE_KEY, ticketId);
      showChat();
    } catch (e) { status('supportStartStatus', e.message); }
  }

  async function loadMessages() {
    if (!ticketId) return;
    await descobrirBackend();
    try {
      const r = await fetch(`${SUPPORT_API}/tickets/${ticketId}/mensagens`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.mensagem || data.error || 'Erro ao carregar mensagens.');
      renderMessages(Array.isArray(data) ?data : []);
      document.getElementById('supportHuman').textContent = 'Aguardando atendimento';
      document.getElementById('supportHuman').disabled = true;
      document.getElementById('supportHuman').classList.add('opacity-60');
    } catch (e) {
      if (String(e.message || '').toLowerCase().includes('ticket')) {
        localStorage.removeItem(STORAGE_KEY);
        ticketId = null;
        document.getElementById('supportChat')?.classList.add('hidden');
        document.getElementById('supportStart')?.classList.remove('hidden');
        status('supportStartStatus', 'Esse ticket não existe mais. Abra uma nova conversa.');
      }
    }
  }

  async function sendMessage() {
    const input = document.getElementById('supportInput');
    const mensagem = input.value.trim();
    if (!ticketId || !mensagem) return;
    await descobrirBackend();
    input.value = '';
    try {
      const nome = document.getElementById('supportNome')?.value?.trim() || session().nome || 'Cliente';
      const r = await fetch(`${SUPPORT_API}/tickets/${ticketId}/mensagens`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ autorTipo: 'CLIENTE', autorNome: nome, mensagem })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.mensagem || data.error || 'Erro ao enviar mensagem.');
      await loadMessages();
    } catch (e) { status('supportChatStatus', e.message); }
  }

  async function requestHuman() {
    status('supportChatStatus', 'Sua conversa já está no painel de suporte. Aguarde o atendente responder.', true);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    ensureWidget();
    await descobrirBackend();
  });
})();
