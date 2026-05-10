
(function () {
  const PORTS = [8080, 8081];
  let SUPPORT_API = 'http://localhost:8080/api/suporte';
  let currentTicketId = localStorage.getItem('petzilla_support_ticket_id') || '';
  let pollTimer = null;
  let backendOk = false;
  let handlingClosedTicket = false;
  let typingTimer = null;
  let typingActive = false;
  let renderInFlight = false;
  let lastMessagesKey = '';
  let lastTypingKey = '';
  let lastTicketKey = '';
  let latestMessageId = 0;

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getSession() {
    try { return window.PetZillaSession?.getSession?.() || JSON.parse(localStorage.getItem('petzilla_sessao') || 'null'); }
    catch (_) { return null; }
  }

  function initials(name = 'U') {
    return String(name || 'U').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
  }

  function clientName() {
    return document.getElementById('supportNome')?.value?.trim() || getSession()?.nome || getSession()?.usuario || 'Cliente';
  }

  function clientPhoto() {
    const sessao = getSession() || {};
    return sessao.fotoPerfil || localStorage.getItem('petzilla_usuario_foto') || '';
  }

  function seenKey() {
    return currentTicketId ?`petzilla_support_seen_${currentTicketId}` : '';
  }

  function getLastSeenMessageId() {
    return Number(localStorage.getItem(seenKey()) || 0);
  }

  function setLastSeenMessageId(id) {
    if (!seenKey()) return;
    localStorage.setItem(seenKey(), String(Number(id || 0)));
  }

  function updateSupportBadge(count = 0) {
    document.querySelectorAll('[data-support-count]').forEach(el => {
      const value = Math.max(0, Number(count || 0));
      el.textContent = value > 99 ?'99+' : String(value);
      el.classList.toggle('hidden', value <= 0);
    });
  }

  function supportPanelOpen() {
    return !document.getElementById('petzillaSupportWidget')?.classList.contains('hidden');
  }

  function closeWidget() {
    document.getElementById('petzillaSupportWidget')?.classList.add('hidden');
  }

  function avatarMarkup(name, photo, mine) {
    const safeName = escapeHtml(name || 'Usuário');
    if (photo) {
      return `<img src="${escapeHtml(photo)}" alt="Foto de ${safeName}" class="w-9 h-9 rounded-full object-cover border-2 ${mine ?'border-teal-100' : 'border-white'} shadow-sm">`;
    }
    return `<div class="w-9 h-9 rounded-full ${mine ?'bg-teal-100 text-teal-800' : 'bg-slate-900 text-white'} flex items-center justify-center text-xs font-black shadow-sm">${escapeHtml(initials(name))}</div>`;
  }

  async function descobrirBackend() {
    const bases = [];
    if (location.protocol.startsWith('http')) bases.push(`${location.origin}/api`);
    PORTS.forEach(porta => bases.push(`http://localhost:${porta}/api`));

    for (const base of [...new Set(bases)]) {
      try {
        const res = await fetch(`${base}/suporte/health`, { cache: 'no-store' });
        if (res.ok) {
          SUPPORT_API = `${base}/suporte`;
          backendOk = true;
          return true;
        }
      } catch (_) {}
      try {
        const res = await fetch(`${base}/produtos`, { cache: 'no-store' });
        if (res.ok) {
          SUPPORT_API = `${base}/suporte`;
          backendOk = true;
          return true;
        }
      } catch (_) {}
    }
    backendOk = false;
    return false;
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const text = await res.text();
    let data = {};
    try { data = text ?JSON.parse(text) : {}; } catch (_) { data = { mensagem: text }; }
    if (!res.ok) throw new Error(data.mensagem || data.error || `Erro HTTP ${res.status}`);
    return data;
  }

  function inject() {
    if (document.getElementById('petzillaSupportWidget')) return;
    const sessao = getSession();
    const nome = sessao?.nome || '';
    const email = sessao?.email || '';

    document.body.insertAdjacentHTML('beforeend', `
      <button id="supportOpenBtn" class="pz-support-launcher" aria-label="Abrir suporte"><i class="fas fa-headset"></i><span data-support-count class="hidden pz-support-count">0</span></button>

      <section id="petzillaSupportWidget" class="hidden pz-support-panel pz-fade-in" aria-label="Chat de suporte PetZilla">
        <div class="bg-slate-950 text-white p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-orange-300 font-black uppercase text-xs tracking-widest">Atendimento online</p>
              <h2 class="text-2xl font-black leading-tight">Suporte PetZilla</h2>
              <p class="text-slate-300 text-sm mt-1"><span class="pz-status-dot mr-2"></span>Conversa salva para acompanhamento</p>
            </div>
            <button id="supportCloseBtn" class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 font-black text-xl" aria-label="Fechar suporte">×</button>
          </div>
        </div>

        <div id="supportStart" class="p-5 space-y-3">
          <div class="bg-teal-50 border border-teal-100 text-teal-900 rounded-3xl p-4">
            <p class="font-black"><i class="fas fa-comments mr-2"></i>Como podemos ajudar?</p>
            <p class="text-sm mt-1 text-teal-800">Preencha a mensagem. Um atendente com cargo Suporte responde pelo painel do site.</p>
          </div>
          <input id="supportNome" class="pz-input" placeholder="Seu nome" value="${escapeHtml(nome)}">
          <input id="supportEmail" class="pz-input" placeholder="Seu email" value="${escapeHtml(email)}">
          <select id="supportAssunto" class="pz-input">
            <option value="">Selecione o assunto</option>
            <option>Compra ou pagamento</option>
            <option>Entrega</option>
            <option>Produto</option>
            <option>Cadastro ou conta</option>
            <option>Outro assunto</option>
          </select>
          <textarea id="supportMensagemInicial" class="pz-input min-h-32 resize-none" placeholder="Digite sua mensagem com detalhes..."></textarea>
          <button id="supportCreateBtn" class="w-full pz-btn-primary py-4"><i class="fas fa-paper-plane"></i> Enviar suporte</button>
          <p id="supportStartStatus" class="hidden text-sm font-bold"></p>
        </div>

        <div id="supportChat" class="hidden">
          <div class="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between gap-3">
            <div>
              <p id="supportChatTitle" class="font-black text-slate-900">Conversa de suporte</p>
              <p id="supportChatMeta" class="text-xs font-semibold text-slate-500">As respostas aparecem automaticamente.</p>
            </div>
            <button id="supportNewTicketBtn" class="text-xs font-black text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full px-3 py-2">Nova conversa</button>
          </div>
          <div id="supportChatMessages" class="h-96 overflow-auto bg-slate-50 p-4 space-y-3"></div>
          <div id="supportClosedNotice" class="hidden mx-4 mt-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl p-3 text-sm font-bold">Esta conversa foi finalizada pelo suporte.</div>
          <div class="p-4 border-t bg-white">
            <div class="flex gap-2">
              <input id="supportChatInput" class="pz-input flex-1" placeholder="Digite uma mensagem...">
              <button id="supportChatSend" class="pz-btn-primary px-4"><i class="fas fa-paper-plane"></i></button>
            </div>
            <p id="supportChatStatus" class="hidden mt-2 text-sm font-bold"></p>
          </div>
        </div>
      </section>`);
  }

  function setStatus(id, msg, type = 'error') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = `text-sm font-bold ${type === 'success' ?'text-emerald-700' : 'text-red-600'}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 6000);
  }

  function resetToStart(message = '') {
    currentTicketId = '';
    handlingClosedTicket = false;
    lastMessagesKey = '';
    lastTypingKey = '';
    lastTicketKey = '';
    localStorage.removeItem('petzilla_support_ticket_id');
    updateSupportBadge(0);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;

    document.getElementById('supportChat')?.classList.add('hidden');
    document.getElementById('supportStart')?.classList.remove('hidden');
    document.getElementById('supportClosedNotice')?.classList.add('hidden');

    const input = document.getElementById('supportChatInput');
    const send = document.getElementById('supportChatSend');
    if (input) {
      input.disabled = false;
      input.value = '';
    }
    if (send) send.disabled = false;

    const initialMessage = document.getElementById('supportMensagemInicial');
    if (initialMessage) initialMessage.value = '';

    if (message) setStatus('supportStartStatus', message, 'success');
  }

  function bubble(msg, mine) {
    const name = msg.autorNome || msg.autorTipo || 'Autor';
    const photo = msg.autorFoto || (mine ?clientPhoto() : '');
    const when = msg.criadoEm ?new Date(msg.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    return `
      <div class="pz-support-message flex ${mine ?'justify-end' : 'justify-start'}">
        <div class="flex items-start gap-2 max-w-[88%] ${mine ?'flex-row-reverse' : ''}">
          ${avatarMarkup(name, photo, mine)}
          <div class="rounded-3xl px-4 py-3 ${mine ?'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-800 shadow-sm'}">
            <div class="text-xs font-black opacity-75 mb-1">${escapeHtml(name)}</div>
            <div class="leading-relaxed whitespace-pre-wrap">${escapeHtml(msg.mensagem || '')}</div>
            <div class="text-[11px] opacity-65 mt-2">${escapeHtml(when)}</div>
          </div>
        </div>
      </div>`;
  }

  function typingBubble(name = 'Atendente') {
    return `
      <div id="supportTypingIndicator" class="pz-support-message flex justify-start">
        <div class="flex items-start gap-2 max-w-[88%]">
          ${avatarMarkup(name, '', false)}
          <div class="rounded-3xl px-4 py-3 bg-white border border-slate-200 text-slate-800 shadow-sm">
            <div class="text-xs font-black opacity-75 mb-2">${escapeHtml(name)}</div>
            <div class="flex gap-1 items-center h-4" aria-label="${escapeHtml(name)} está digitando">
              <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.2s]"></span>
              <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.1s]"></span>
              <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function loadTicket() {
    if (!currentTicketId) return null;
    return fetchJson(`${SUPPORT_API}/tickets/${currentTicketId}`);
  }

  async function renderMessages() {
    if (!currentTicketId || renderInFlight) return;
    renderInFlight = true;
    try {
      const [ticket, mensagens] = await Promise.all([
        loadTicket().catch(() => null),
        fetchJson(`${SUPPORT_API}/tickets/${currentTicketId}/mensagens`)
      ]);
      const typing = await fetchJson(`${SUPPORT_API}/tickets/${currentTicketId}/typing`).catch(() => null);
      const box = document.getElementById('supportChatMessages');
      if (!box) return;

      const typingKey = typing?.digitando && String(typing.autorTipo).toUpperCase() === 'ATENDENTE'
        ?`${typing.autorTipo}|${typing.autorNome || 'Atendente'}`
        : '';
      latestMessageId = mensagens.reduce((max, m) => Math.max(max, Number(m.id || 0)), 0);
      const unreadCount = mensagens.filter(m => String(m.autorTipo).toUpperCase() === 'ATENDENTE' && Number(m.id || 0) > getLastSeenMessageId()).length;
      if (supportPanelOpen()) {
        setLastSeenMessageId(latestMessageId);
        updateSupportBadge(0);
      } else {
        updateSupportBadge(unreadCount);
      }
      const messagesKey = mensagens.map(m => `${m.id}|${m.autorTipo}|${m.autorNome}|${m.autorFoto || ''}|${m.mensagem}|${m.criadoEm}`).join('~');
      const shouldStickToBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;

      if (messagesKey !== lastMessagesKey || typingKey !== lastTypingKey) {
        const typingHtml = typingKey ?typingBubble(typing.autorNome || 'Atendente') : '';
        box.innerHTML = (mensagens.map(m => bubble(m, String(m.autorTipo).toUpperCase() === 'CLIENTE')).join('') + typingHtml) || `<div class="text-center text-slate-500 p-6 font-semibold">Nenhuma mensagem ainda.</div>`;
        if (shouldStickToBottom || messagesKey !== lastMessagesKey) box.scrollTop = box.scrollHeight;
        lastMessagesKey = messagesKey;
        lastTypingKey = typingKey;
      }

      if (ticket) {
        const ticketKey = `${ticket.id}|${ticket.status}|${ticket.email || ''}|${ticket.assunto || ''}`;
        if (ticketKey !== lastTicketKey) {
          document.getElementById('supportChatTitle').textContent = `Ticket #${ticket.id} • ${ticket.status}`;
          document.getElementById('supportChatMeta').textContent = `${ticket.email || ''} • ${ticket.assunto || ''}`;
          lastTicketKey = ticketKey;
        }
        const fechado = String(ticket.status).toUpperCase() === 'FECHADO';
        document.getElementById('supportClosedNotice')?.classList.toggle('hidden', !fechado);
        document.getElementById('supportChatInput').disabled = fechado;
        document.getElementById('supportChatSend').disabled = fechado;
        if (fechado && !handlingClosedTicket) {
          handlingClosedTicket = true;
          setTimeout(() => {
            resetToStart('Seu atendimento foi finalizado pelo suporte. Voc? j? pode abrir uma nova conversa.');
          }, 2500);
        }
      }
    } catch (error) {
      setStatus('supportChatStatus', error.message || 'N?o foi poss?vel carregar a conversa.');
    } finally {
      renderInFlight = false;
    }
  }

  async function createTicket() {
    const nome = document.getElementById('supportNome').value.trim();
    const email = document.getElementById('supportEmail').value.trim();
    const assunto = document.getElementById('supportAssunto').value.trim() || 'Suporte PetZilla';
    const mensagem = document.getElementById('supportMensagemInicial').value.trim();

    if (!nome || !email || !mensagem) return setStatus('supportStartStatus', 'Preencha nome, e-mail e mensagem.');
    if (!email.includes('@')) return setStatus('supportStartStatus', 'Informe um e-mail válido.');
    if (!backendOk) await descobrirBackend();
    if (!backendOk) return setStatus('supportStartStatus', 'Backend indisponível. Inicie o Spring Boot e rode o SQL do suporte.');

    const btn = document.getElementById('supportCreateBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
      const ticket = await fetchJson(`${SUPPORT_API}/tickets`, { method: 'POST', body: JSON.stringify({ nome, email, assunto, mensagem, autorFoto: clientPhoto() }) });
      currentTicketId = String(ticket.id || ticket.ticketId);
      lastMessagesKey = '';
      lastTypingKey = '';
      lastTicketKey = '';
      localStorage.setItem('petzilla_support_ticket_id', currentTicketId);
      setLastSeenMessageId(0);
      updateSupportBadge(0);
      document.getElementById('supportStart').classList.add('hidden');
      document.getElementById('supportChat').classList.remove('hidden');
      await renderMessages();
      startPoll();
    } catch (error) {
      setStatus('supportStartStatus', error.message || 'Erro ao criar suporte. Verifique o terminal do Spring.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar suporte';
    }
  }

  async function sendMessage() {
    const input = document.getElementById('supportChatInput');
    const mensagem = input.value.trim();
    if (!mensagem || !currentTicketId) return;
    try {
      await setTyping(false);
      await fetchJson(`${SUPPORT_API}/tickets/${currentTicketId}/mensagens`, { method: 'POST', body: JSON.stringify({ autorTipo: 'CLIENTE', autorNome: clientName(), autorFoto: clientPhoto(), mensagem }) });
      input.value = '';
      await renderMessages();
    } catch (error) {
      setStatus('supportChatStatus', error.message || 'Não foi possível enviar a mensagem.');
    }
  }

  async function setTyping(digitando) {
    if (!currentTicketId || !backendOk) return;
    typingActive = digitando;
    await fetchJson(`${SUPPORT_API}/tickets/${currentTicketId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ autorTipo: 'CLIENTE', autorNome: clientName(), digitando })
    }).catch(() => {});
  }

  function handleTypingInput() {
    if (!currentTicketId) return;
    const input = document.getElementById('supportChatInput');
    const digitando = !!input?.value.trim();
    setTyping(digitando);
    if (typingTimer) clearTimeout(typingTimer);
    if (digitando) typingTimer = setTimeout(() => setTyping(false), 2500);
  }

  function openWidget() {
    document.getElementById('petzillaSupportWidget').classList.remove('hidden');
    if (latestMessageId) setLastSeenMessageId(latestMessageId);
    updateSupportBadge(0);
    if (currentTicketId) {
      document.getElementById('supportStart').classList.add('hidden');
      document.getElementById('supportChat').classList.remove('hidden');
      renderMessages();
      startPoll();
    }
  }

  function newTicket() {
    resetToStart();
  }

  function startPoll() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(renderMessages, 2500);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    inject();
    await descobrirBackend();
    document.getElementById('supportOpenBtn').addEventListener('click', openWidget);
    document.getElementById('supportCloseBtn').addEventListener('click', closeWidget);
    document.addEventListener('click', event => {
      const panel = document.getElementById('petzillaSupportWidget');
      const launcher = document.getElementById('supportOpenBtn');
      if (!panel || panel.classList.contains('hidden')) return;
      if (panel.contains(event.target) || launcher?.contains(event.target)) return;
      closeWidget();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeWidget(); });
    document.getElementById('supportCreateBtn').addEventListener('click', createTicket);
    document.getElementById('supportChatSend').addEventListener('click', sendMessage);
    document.getElementById('supportNewTicketBtn').addEventListener('click', newTicket);
    document.getElementById('supportChatInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } });
    document.getElementById('supportChatInput').addEventListener('input', handleTypingInput);
    if (currentTicketId) startPoll();
  });
})();




