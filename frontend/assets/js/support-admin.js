(function () {
﻿
const SUPPORT_PORTS = [8080, 8081];
let SUPPORT_API = 'http://localhost:8080/api/suporte';
let tickets = [];
let currentTicket = null;
let pollTimer = null;
let typingTimer = null;
let typingActive = false;
let knownTicketIds = new Set();
let firstTicketLoad = true;
let originalTitle = document.title;

function escapeHtml(value = '') { return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function getSession() { try { return window.PetZillaSession?.getSession?.() || JSON.parse(localStorage.getItem('petzilla_sessao') || 'null'); } catch (_) { return null; } }
function canSupport(sessao) {
  const c = sessao?.cargo || {};
  return !!(sessao?.perfil === 'ADMIN' || c.acessoSuporte || c.acessoCargos);
}
function actorName() { const s = getSession() || {}; return s.nome || s.usuario || 'Atendente'; }
function actorId() { const s = getSession() || {}; return s.id || null; }
function actorPhoto() { const s = getSession() || {}; return s.fotoPerfil || localStorage.getItem('petzilla_usuario_foto') || ''; }
function initials(name = 'U') { return String(name || 'U').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U'; }
function avatarMarkup(name, photo, atendente) {
  if (photo) return `<img src="${escapeHtml(photo)}" alt="Foto de ${escapeHtml(name)}" class="w-9 h-9 rounded-full object-cover border-2 ${atendente ?'border-slate-200' : 'border-white'} shadow-sm">`;
  return `<div class="w-9 h-9 rounded-full ${atendente ?'bg-slate-950 text-white' : 'bg-teal-100 text-teal-800'} flex items-center justify-center text-xs font-black shadow-sm">${escapeHtml(initials(name))}</div>`;
}

async function descobrirBackend() {
  const bases = [];
  if (location.protocol.startsWith('http')) bases.push(`${location.origin}/api`);
  SUPPORT_PORTS.forEach(p => bases.push(`http://localhost:${p}/api`));
  for (const base of [...new Set(bases)]) {
    try { const res = await fetch(`${base}/suporte/health`, { cache: 'no-store' }); if (res.ok) { SUPPORT_API = `${base}/suporte`; return true; } } catch (_) {}
  }
  return false;
}
async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const text = await res.text();
  let data = {}; try { data = text ?JSON.parse(text) : {}; } catch (_) { data = { mensagem: text }; }
  if (!res.ok) throw new Error(data.mensagem || `Erro HTTP ${res.status}`);
  return data;
}
function status(msg, ok = true) {
  const el = document.getElementById('supportAdminStatus');
  el.className = `mb-5 p-4 rounded-2xl border font-bold ${ok ?'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`;
  el.innerHTML = `<i class="fas ${ok ?'fa-check-circle' : 'fa-triangle-exclamation'} mr-2"></i>${escapeHtml(msg)}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4500);
}
function playNewTicketSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (_) {}
}
function notifyNewTickets(newTickets) {
  if (!newTickets.length) return;
  const first = newTickets[0];
  const plural = newTickets.length > 1 ?`${newTickets.length} novos tickets` : `Novo ticket de ${first.nome || 'cliente'}`;
  status(`${plural} aguardando atendimento.`, true);
  document.title = `(${newTickets.length}) Novo suporte - PetZilla`;
  setTimeout(() => { document.title = originalTitle; }, 8000);
  playNewTicketSound();
}
function fmt(value) { if (!value) return '-'; const d = new Date(value); return isNaN(d) ?value : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
function ticketCard(t) {
  const is = currentTicket && Number(currentTicket.id) === Number(t.id);
  const statusClass = t.status === 'FECHADO' ?'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700';
  return `<button onclick="abrirTicket(${t.id})" class="w-full text-left bg-white hover:bg-teal-50 border ${is ?'border-teal-500 pz-ticket-active' : 'border-slate-200'} rounded-3xl p-4 transition">
    <div class="flex items-start justify-between gap-3"><div><p class="font-black text-slate-900">#${t.id} • ${escapeHtml(t.nome || 'Cliente')}</p><p class="text-sm text-slate-500 font-semibold">${escapeHtml(t.email || '')}</p></div><span class="${statusClass} px-3 py-1 rounded-full text-xs font-black">${escapeHtml(t.status)}</span></div>
    <p class="text-sm text-slate-700 mt-2 font-bold">${escapeHtml(t.assunto || 'Suporte')}</p><p class="text-xs text-slate-400 mt-1">${fmt(t.atualizadoEm || t.criadoEm)}</p>
  </button>`;
}
async function carregarTickets() {
  const filtro = document.getElementById('ticketFilter').value;
  tickets = await fetchJson(`${SUPPORT_API}/tickets${filtro ?`?status=${encodeURIComponent(filtro)}` : ''}`);
  const novos = tickets.filter(t => !knownTicketIds.has(Number(t.id)) && String(t.status).toUpperCase() === 'ABERTO');
  tickets.forEach(t => knownTicketIds.add(Number(t.id)));
  if (firstTicketLoad) firstTicketLoad = false;
  else notifyNewTickets(novos);
  document.getElementById('ticketsList').innerHTML = tickets.length ?tickets.map(ticketCard).join('') : '<div class="text-center p-8 text-slate-500 font-bold">Nenhum ticket encontrado.</div>';
  const stats = await fetchJson(`${SUPPORT_API}/stats`).catch(() => null);
  if (stats) {
    document.getElementById('statAbertos').textContent = stats.abertos ?? 0;
    document.getElementById('statFechados').textContent = stats.fechados ?? 0;
    document.getElementById('statTotal').textContent = stats.total ?? 0;
  }
}
async function abrirTicket(id) {
  typingActive = false;
  if (typingTimer) clearTimeout(typingTimer);
  currentTicket = await fetchJson(`${SUPPORT_API}/tickets/${id}`);
  await carregarTickets();
  document.getElementById('emptyTicket').classList.add('hidden');
  document.getElementById('ticketPanel').classList.remove('hidden');
  document.getElementById('ticketTitle').textContent = `Ticket #${currentTicket.id} • ${currentTicket.nome}`;
  document.getElementById('ticketMeta').textContent = `${currentTicket.email || '-'} • ${currentTicket.assunto || '-'} • ${currentTicket.status}`;
  const fechado = currentTicket.status === 'FECHADO';
  document.getElementById('supportReplyInput').disabled = fechado;
  document.getElementById('sendReplyBtn').disabled = fechado;
  document.getElementById('closeTicketBtn').disabled = fechado;
  await carregarMensagens();
}
async function carregarMensagens() {
  if (!currentTicket) return;
  const [mensagens, typing] = await Promise.all([
    fetchJson(`${SUPPORT_API}/tickets/${currentTicket.id}/mensagens`),
    fetchJson(`${SUPPORT_API}/tickets/${currentTicket.id}/typing`).catch(() => null)
  ]);
  const box = document.getElementById('messagesBox');
  box.innerHTML = mensagens.map(m => {
    const atendente = String(m.autorTipo).toUpperCase() === 'ATENDENTE';
    const name = m.autorNome || m.autorTipo;
    const photo = m.autorFoto || (atendente ?actorPhoto() : '');
    return `<div class="flex ${atendente ?'justify-end' : 'justify-start'}"><div class="flex items-start gap-2 max-w-[84%] ${atendente ?'flex-row-reverse' : ''}">${avatarMarkup(name, photo, atendente)}<div class="rounded-3xl px-4 py-3 ${atendente ?'bg-slate-950 text-white' : 'bg-white border border-slate-200 text-slate-800'}"><p class="text-xs font-black opacity-70 mb-1">${escapeHtml(name)}</p><p class="whitespace-pre-wrap">${escapeHtml(m.mensagem || '')}</p><p class="text-[11px] opacity-60 mt-2">${fmt(m.criadoEm)}</p></div></div></div>`;
  }).join('') || '<div class="text-center p-8 text-slate-500 font-bold">Sem mensagens.</div>';
  const typingEl = document.getElementById('adminTypingIndicator');
  const clientTyping = typing?.digitando && String(typing.autorTipo).toUpperCase() === 'CLIENTE';
  if (typingEl) {
    typingEl.innerHTML = clientTyping ?`<i class="fas fa-ellipsis mr-2 text-teal-600"></i>${escapeHtml(typing.autorNome || 'Cliente')} está digitando...` : '';
    typingEl.classList.toggle('hidden', !clientTyping);
  }
  box.scrollTop = box.scrollHeight;
}
async function setTyping(digitando) {
  if (!currentTicket) return;
  typingActive = digitando;
  await fetchJson(`${SUPPORT_API}/tickets/${currentTicket.id}/typing`, { method: 'POST', body: JSON.stringify({ autorTipo: 'ATENDENTE', autorNome: actorName(), digitando }) }).catch(() => {});
}
function handleTypingInput() {
  if (!currentTicket) return;
  const input = document.getElementById('supportReplyInput');
  const digitando = !!input?.value.trim();
  setTyping(digitando);
  if (typingTimer) clearTimeout(typingTimer);
  if (digitando) typingTimer = setTimeout(() => setTyping(false), 2500);
}
async function enviarResposta() {
  if (!currentTicket) return;
  const input = document.getElementById('supportReplyInput');
  const mensagem = input.value.trim();
  if (!mensagem) return;
  await setTyping(false);
  await fetchJson(`${SUPPORT_API}/tickets/${currentTicket.id}/mensagens`, { method: 'POST', body: JSON.stringify({ autorTipo: 'ATENDENTE', autorNome: actorName(), autorFoto: actorPhoto(), mensagem }) });
  input.value = '';
  await abrirTicket(currentTicket.id);
}
async function fecharTicket() {
  if (!currentTicket || !confirm('Finalizar este atendimento?O transcript será enviado ao Discord.')) return;
  await setTyping(false);
  await fetchJson(`${SUPPORT_API}/tickets/${currentTicket.id}/fechar`, { method: 'POST', body: JSON.stringify({ adminId: actorId() }) });
  status('Ticket finalizado e transcript enviado ao Discord.');
  await abrirTicket(currentTicket.id);
}
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    await carregarTickets().catch(() => {});
    if (currentTicket) await carregarMensagens().catch(() => {});
  }, 2500);
}

window.abrirTicket = abrirTicket;

document.addEventListener('DOMContentLoaded', async () => {
  const sessao = getSession();
  const dentroDoAdmin = !!document.getElementById('suporteSection');
  if (!canSupport(sessao)) {
    if (!dentroDoAdmin) window.location.href = 'login.html';
    return;
  }
  const agentName = document.getElementById('supportAgentName');
  if (agentName) agentName.textContent = sessao?.nome || sessao?.usuario || 'Atendente';
  if (!document.getElementById('ticketFilter') || !document.getElementById('ticketsList')) return;
  const ok = await descobrirBackend();
  if (!ok) { status('Backend de suporte não encontrado. Inicie o Spring Boot e rode o SQL do suporte.', false); return; }
  document.getElementById('ticketFilter').addEventListener('change', carregarTickets);
  document.getElementById('refreshTicketsBtn').addEventListener('click', carregarTickets);
  document.getElementById('sendReplyBtn').addEventListener('click', enviarResposta);
  document.getElementById('closeTicketBtn').addEventListener('click', fecharTicket);
  document.getElementById('supportReplyInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarResposta(); } });
  document.getElementById('supportReplyInput').addEventListener('input', handleTypingInput);
  await carregarTickets(); startPolling();
});


})();
