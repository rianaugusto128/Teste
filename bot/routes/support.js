const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { readJson, writeJson, nextId } = require('../services/jsonStore');

const TICKETS_FILE = 'supportTickets.json';
const MESSAGES_FILE = 'supportMessages.json';

function normalizeEmailForChannel(email = '') {
  return String(email || 'sem-email')
    .toLowerCase()
    .replace(/@/g, '-')
    .replace(/\./g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 55) || 'sem-email';
}

function nowIso() { return new Date().toISOString(); }

function loadTickets() { return readJson(TICKETS_FILE, []); }
function saveTickets(tickets) { writeJson(TICKETS_FILE, tickets); }
function loadMessages() { return readJson(MESSAGES_FILE, []); }
function saveMessages(messages) { writeJson(MESSAGES_FILE, messages); }

function addMessage(ticketId, autorTipo, autorNome, mensagem, meta = {}) {
  const messages = loadMessages();
  const msg = {
    id: nextId('msg_'),
    ticketId,
    autorTipo,
    autorNome: autorNome || autorTipo,
    mensagem: String(mensagem || '').trim(),
    criadoEm: nowIso(),
    ...meta,
  };
  messages.push(msg);
  saveMessages(messages);
  return msg;
}

function getTicket(ticketId) {
  return loadTickets().find(t => String(t.ticketId) === String(ticketId));
}

function updateTicket(ticketId, patch) {
  const tickets = loadTickets();
  const index = tickets.findIndex(t => String(t.ticketId) === String(ticketId));
  if (index === -1) return null;
  tickets[index] = { ...tickets[index], ...patch, atualizadoEm: nowIso() };
  saveTickets(tickets);
  return tickets[index];
}

function autoReply(text = '') {
  const msg = text.toLowerCase();
  if (msg.includes('pedido') || msg.includes('compra') || msg.includes('entrega')) {
    return 'Entendi! Para verificar compra/pedido, informe o número do pedido, nome completo e telefone. Se preferir, clique em “Falar com suporte humano”.';
  }
  if (msg.includes('pix') || msg.includes('pagamento') || msg.includes('paguei')) {
    return 'Sobre pagamento/PIX: confira se o comprovante foi enviado e se o valor bate com o pedido. Um atendente pode validar para você.';
  }
  if (msg.includes('estoque') || msg.includes('produto')) {
    return 'Sobre produtos/estoque: diga o nome do produto que você quer verificar. Posso encaminhar para um atendente caso precise.';
  }
  if (msg.includes('humano') || msg.includes('atendente') || msg.includes('suporte')) {
    return 'Claro! Clique em “Falar com suporte humano” para abrir um canal com nossa equipe no Discord.';
  }
  return 'Recebi sua mensagem. Posso tentar ajudar por aqui, ou você pode clicar em “Falar com suporte humano” para abrir um atendimento com a equipe.';
}

async function createDiscordChannel(client, ticket) {
  if (ticket.discordChannelId) return ticket;

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) throw new Error('GUILD_ID inválido ou bot não está no servidor.');

  const categoryId = process.env.SUPPORT_CATEGORY_ID || null;
  let parent = null;
  if (categoryId && /^\d+$/.test(categoryId)) {
    const cat = guild.channels.cache.get(categoryId);
    if (cat && cat.type === ChannelType.GuildCategory) parent = cat.id;
  }

  const safeEmail = normalizeEmailForChannel(ticket.email);
  const channelName = `ticket-${ticket.ticketId}-${safeEmail}`.slice(0, 95);

  const overwrites = [];
  if (String(process.env.SUPPORT_PRIVATE_TICKETS || '').toLowerCase() === 'true') {
    overwrites.push({ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
    if (process.env.SUPPORT_ROLE_ID && /^\d+$/.test(process.env.SUPPORT_ROLE_ID)) {
      const role = guild.roles.cache.get(process.env.SUPPORT_ROLE_ID);
      if (role) {
        overwrites.push({
          id: role.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
      }
    }
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent,
    topic: `Ticket ${ticket.ticketId} | Email: ${ticket.email} | Nome: ${ticket.nome}`,
    permissionOverwrites: overwrites,
  });

  const embed = new EmbedBuilder()
    .setColor('#14b8a6')
    .setTitle(`📩 Ticket #${ticket.ticketId} - ${ticket.nome}`)
    .setDescription('Responda normalmente neste canal. Tudo que a equipe escrever aqui aparecerá no chat de suporte do site.')
    .addFields(
      { name: 'Cliente', value: ticket.nome || '-', inline: true },
      { name: 'Email', value: ticket.email || '-', inline: true },
      { name: 'Assunto', value: ticket.assunto || '-', inline: false },
      { name: 'Mensagem inicial', value: ticket.mensagemInicial || '-', inline: false },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  const allMessages = loadMessages().filter(m => String(m.ticketId) === String(ticket.ticketId));
  for (const msg of allMessages) {
    if (msg.autorTipo === 'CLIENTE') {
      await channel.send(`**${msg.autorNome || ticket.nome}:** ${msg.mensagem}`);
    }
  }

  addMessage(ticket.ticketId, 'BOT', 'PetZilla Bot', 'Suporte humano acionado. Um atendente responderá por aqui em breve.');
  return updateTicket(ticket.ticketId, { status: 'HUMANO', discordChannelId: channel.id });
}

function registerDiscordSupportListener(client) {
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot || !message.guild || !message.channelId) return;
      const tickets = loadTickets();
      const ticket = tickets.find(t => String(t.discordChannelId) === String(message.channelId));
      if (!ticket) return;

      const content = message.content?.trim();
      if (!content) return;

      addMessage(ticket.ticketId, 'ATENDENTE', message.member?.displayName || message.author.username, content, {
        discordMessageId: message.id,
        discordUserId: message.author.id,
      });

      updateTicket(ticket.ticketId, { status: 'EM_ATENDIMENTO' });
      await message.react('✅').catch(() => {});
    } catch (e) {
      console.error('Erro ao armazenar resposta do suporte:', e);
    }
  });
}

module.exports = function supportRoutes(client) {
  const router = require('express').Router();

  router.post('/start', async (req, res) => {
    try {
      const { nome, email, assunto, mensagem } = req.body || {};
      if (!nome || !email || !mensagem) {
        return res.status(400).json({ error: 'Informe nome, email e mensagem.' });
      }

      const ticketId = nextId('');
      const ticket = {
        ticketId,
        nome: String(nome).trim(),
        email: String(email).trim().toLowerCase(),
        assunto: String(assunto || 'Suporte').trim(),
        mensagemInicial: String(mensagem).trim(),
        status: 'BOT',
        discordChannelId: null,
        criadoEm: nowIso(),
        atualizadoEm: nowIso(),
      };

      const tickets = loadTickets();
      tickets.push(ticket);
      saveTickets(tickets);

      addMessage(ticketId, 'CLIENTE', ticket.nome, ticket.mensagemInicial);
      const resposta = autoReply(ticket.mensagemInicial);
      addMessage(ticketId, 'BOT', 'PetZilla Bot', resposta);

      res.json({ success: true, ticketId, status: ticket.status, resposta });
    } catch (e) {
      console.error('Erro ao iniciar suporte:', e);
      res.status(500).json({ error: 'Erro ao iniciar suporte.' });
    }
  });

  router.post('/:ticketId/human', async (req, res) => {
    try {
      const ticket = getTicket(req.params.ticketId);
      if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });
      const updated = await createDiscordChannel(client, ticket);
      res.json({ success: true, ticket: updated });
    } catch (e) {
      console.error('Erro ao criar canal do ticket:', e);
      res.status(500).json({ error: e.message || 'Erro ao criar canal de suporte.' });
    }
  });

  router.post('/:ticketId/messages', async (req, res) => {
    try {
      const ticket = getTicket(req.params.ticketId);
      if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });
      const text = String(req.body?.mensagem || '').trim();
      if (!text) return res.status(400).json({ error: 'Mensagem vazia.' });

      const msg = addMessage(ticket.ticketId, 'CLIENTE', ticket.nome, text);
      if (ticket.discordChannelId) {
        const channel = client.channels.cache.get(ticket.discordChannelId);
        if (channel) await channel.send(`**${ticket.nome}:** ${text}`);
      } else {
        const resposta = autoReply(text);
        addMessage(ticket.ticketId, 'BOT', 'PetZilla Bot', resposta);
      }
      res.json({ success: true, message: msg });
    } catch (e) {
      console.error('Erro ao enviar mensagem:', e);
      res.status(500).json({ error: 'Erro ao enviar mensagem.' });
    }
  });

  router.get('/:ticketId/messages', (req, res) => {
    const ticket = getTicket(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });
    const messages = loadMessages().filter(m => String(m.ticketId) === String(ticket.ticketId));
    res.json({ success: true, ticket, messages });
  });

  router.get('/debug/list', (req, res) => {
    res.json({ tickets: loadTickets(), messages: loadMessages().slice(-50) });
  });

  return router;
};

module.exports.registerDiscordSupportListener = registerDiscordSupportListener;
