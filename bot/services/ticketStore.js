const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'support-tickets.json');

function ensureFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({ nextId: 1, tickets: {} }, null, 2));
}

function readStore() {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!parsed.tickets) parsed.tickets = {};
    if (!parsed.nextId) parsed.nextId = 1;
    return parsed;
  } catch (_) {
    return { nextId: 1, tickets: {} };
  }
}

function writeStore(store) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2));
}

function now() {
  return new Date().toISOString();
}

function publicTicket(ticket) {
  if (!ticket) return null;
  return {
    ticketId: ticket.ticketId,
    nome: ticket.nome,
    email: ticket.email,
    assunto: ticket.assunto,
    status: ticket.status,
    channelId: ticket.channelId,
    channelName: ticket.channelName,
    criadoEm: ticket.criadoEm,
    atualizadoEm: ticket.atualizadoEm,
  };
}

function createTicket({ nome, email, assunto, mensagem, channelId, channelName }) {
  const store = readStore();
  const ticketId = store.nextId++;
  const ticket = {
    ticketId,
    nome: nome || 'Cliente',
    email: email || '',
    assunto: assunto || 'Suporte',
    status: 'ABERTO',
    channelId: channelId || null,
    channelName: channelName || null,
    criadoEm: now(),
    atualizadoEm: now(),
    mensagens: [],
  };
  ticket.mensagens.push({
    id: 1,
    autorTipo: 'CLIENTE',
    autorNome: ticket.nome,
    mensagem,
    criadoEm: now(),
  });
  store.tickets[String(ticketId)] = ticket;
  writeStore(store);
  return ticket;
}

function setDiscordChannel(ticketId, channelId, channelName) {
  const store = readStore();
  const ticket = store.tickets[String(ticketId)];
  if (!ticket) return null;
  ticket.channelId = channelId;
  ticket.channelName = channelName;
  ticket.atualizadoEm = now();
  writeStore(store);
  return ticket;
}

function getTicket(ticketId) {
  return readStore().tickets[String(ticketId)] || null;
}

function findByChannelId(channelId) {
  const store = readStore();
  return Object.values(store.tickets).find(t => String(t.channelId) === String(channelId)) || null;
}

function addMessage(ticketId, { autorTipo, autorNome, mensagem, discordMessageId }) {
  const store = readStore();
  const ticket = store.tickets[String(ticketId)];
  if (!ticket) return null;
  const nextMessageId = (ticket.mensagens?.length || 0) + 1;
  const msg = {
    id: nextMessageId,
    autorTipo: autorTipo || 'CLIENTE',
    autorNome: autorNome || (autorTipo === 'ATENDENTE' ? 'Atendente' : ticket.nome),
    mensagem,
    discordMessageId: discordMessageId || null,
    criadoEm: now(),
  };
  ticket.mensagens.push(msg);
  ticket.atualizadoEm = now();
  writeStore(store);
  return msg;
}

function listMessages(ticketId) {
  const ticket = getTicket(ticketId);
  return ticket?.mensagens || [];
}

function closeTicket(ticketId) {
  const store = readStore();
  const ticket = store.tickets[String(ticketId)];
  if (!ticket) return null;
  ticket.status = 'FECHADO';
  ticket.atualizadoEm = now();
  writeStore(store);
  return ticket;
}

module.exports = {
  createTicket,
  setDiscordChannel,
  getTicket,
  findByChannelId,
  addMessage,
  listMessages,
  closeTicket,
  publicTicket,
};
