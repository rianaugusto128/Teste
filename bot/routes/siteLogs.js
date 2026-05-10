
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!process.env.API_KEY || key !== process.env.API_KEY) return res.status(401).json({ error: 'Não autorizado' });
  next();
}
function ensureDataDir() {
  const dir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function saveJson(prefix, payload) {
  const dir = ensureDataDir();
  const file = path.join(dir, `${prefix}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
}
async function channel(client, id, label = 'canal') {
  if (!id) {
    console.warn(`[BOT] ${label} sem ID no .env.`);
    return null;
  }
  const ch = client.channels.cache.get(id) || await client.channels.fetch(id).catch((error) => {
    console.warn(`[BOT] Falha ao buscar ${label} (${id}): ${error.message}`);
    return null;
  });
  if (!ch) console.warn(`[BOT] ${label} não encontrado: ${id}`);
  else if (!ch.isTextBased?.()) console.warn(`[BOT] ${label} não é canal de texto: ${id}`);
  return ch?.isTextBased?.() ? ch : null;
}
function actorText(actor = {}) {
  return `Nome: ${actor.nome || '-'}\nUsuário: ${actor.usuario || '-'}\nCargo: ${actor.cargo || actor.perfil || '-'}`;
}
function truncate(value, max = 1024) {
  const text = String(value ?? '-');
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}
function codeJson(value, max = 900) {
  return '```json\n' + truncate(JSON.stringify(value || {}, null, 2), max) + '\n```';
}
function changesText(changes = []) {
  if (!Array.isArray(changes) || !changes.length) return 'Nenhuma diferenca detectada automaticamente.';
  return changes.slice(0, 10).map(change => {
    const before = typeof change.antes === 'object' ? JSON.stringify(change.antes) : String(change.antes ?? '-');
    const after = typeof change.depois === 'object' ? JSON.stringify(change.depois) : String(change.depois ?? '-');
    return '? ' + change.campo + ': ' + truncate(before, 120) + ' -> ' + truncate(after, 120);
  }).join('\n');
}
function transcriptText(payload) {
  const cliente = payload.cliente || {};
  const fechadoPor = payload.fechadoPor || {};
  const linhas = [];
  linhas.push(`PETZILLA - TRANSCRIPT DE SUPORTE`);
  linhas.push(`Ticket: #${payload.ticketId}`);
  linhas.push(`Cliente: ${cliente.nome || '-'} <${cliente.email || '-'}>`);
  linhas.push(`Assunto: ${cliente.assunto || '-'}`);
  linhas.push(`Finalizado por: ${fechadoPor.nome || 'Sistema'} (${fechadoPor.cargo || '-'})`);
  linhas.push(`Data: ${new Date().toLocaleString('pt-BR')}`);
  linhas.push('='.repeat(70));
  for (const m of payload.mensagens || []) {
    linhas.push(`[${m.criadoEm || '-'}] ${m.autorTipo || '-'} - ${m.autorNome || '-'}`);
    linhas.push(`${m.mensagem || ''}`);
    linhas.push('-'.repeat(70));
  }
  return linhas.join('\n');
}

module.exports = function (client) {
  const router = require('express').Router();
  router.use(auth);

  router.post('/site/log', async (req, res) => {
    const payload = req.body || {};
    saveJson('site-log', payload);
    const actor = payload.actor || {};
    const detalhes = payload.detalhes || {};
    const embed = new EmbedBuilder()
      .setColor(payload.sucesso === false ? '#ef4444' : '#0f766e')
      .setTitle('Log do site: ' + (payload.area || 'ACAO'))
      .addFields(
        { name: 'Acao', value: truncate(payload.acao || '-'), inline: true },
        { name: 'Resultado', value: (payload.sucesso === false ? 'Falhou' : 'Sucesso') + ' | HTTP ' + (payload.statusHttp || detalhes.statusHttp || '-'), inline: true },
        { name: 'Metodo / ID', value: (detalhes.metodo || '-') + ' | ' + (detalhes.id || '-'), inline: true },
        { name: 'Alvo', value: truncate(payload.alvo || '-'), inline: false },
        { name: 'Administrador / Usuario', value: truncate(actorText(actor)), inline: false },
        { name: 'Mudancas detectadas', value: truncate(changesText(detalhes.mudancas), 1024), inline: false },
        { name: 'Enviado pelo site', value: codeJson(detalhes.enviado || {}, 900), inline: false },
        { name: 'Antes da alteracao', value: codeJson(detalhes.antes || {}, 900), inline: false },
        { name: 'Resposta do backend', value: codeJson(detalhes.resposta || {}, 900), inline: false }
      )
      .setTimestamp();
    const ch = await channel(client, process.env.ADMIN_LOG_CHANNEL || process.env.SYSTEM_LOG_CHANNEL, 'ADMIN_LOG_CHANNEL/SYSTEM_LOG_CHANNEL');
    if (ch) await ch.send({ embeds: [embed] });
    else console.warn('ADMIN_LOG_CHANNEL/SYSTEM_LOG_CHANNEL nao encontrado. Verifique o .env.');
    res.json({ ok: true });
  });

  router.post('/support/transcript', async (req, res) => {
    const payload = req.body || {};
    saveJson('support-transcript', payload);
    const cliente = payload.cliente || {};
    const fechadoPor = payload.fechadoPor || {};
    const text = transcriptText(payload);
    const attachment = new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: `ticket-${payload.ticketId || 'suporte'}-transcript.txt` });
    const embed = new EmbedBuilder()
      .setColor('#f97316')
      .setTitle(`📨 Conversa de suporte finalizada #${payload.ticketId || '-'}`)
      .addFields(
        { name: 'Cliente', value: `${cliente.nome || '-'}\n${cliente.email || '-'}`, inline: true },
        { name: 'Assunto', value: cliente.assunto || '-', inline: true },
        { name: 'Finalizado por', value: `${fechadoPor.nome || 'Sistema'}\n${fechadoPor.cargo || '-'}`, inline: true },
        { name: 'Mensagens', value: String((payload.mensagens || []).length), inline: true }
      )
      .setTimestamp();
    const ch = await channel(client, process.env.SUPPORT_LOG_CHANNEL || process.env.ADMIN_LOG_CHANNEL || process.env.SYSTEM_LOG_CHANNEL, 'SUPPORT_LOG_CHANNEL');
    if (ch) await ch.send({ embeds: [embed], files: [attachment] });
    else console.warn('SUPPORT_LOG_CHANNEL não encontrado. Verifique o .env.');
    res.json({ ok: true });
  });

  router.post('/test', async (req, res) => {
    const embed = new EmbedBuilder().setColor('#14b8a6').setTitle('✅ Teste PetZilla').setDescription('Bot recebeu requisição do site/backend.').setTimestamp();
    const ch = await channel(client, process.env.SYSTEM_LOG_CHANNEL || process.env.ADMIN_LOG_CHANNEL || process.env.SUPPORT_LOG_CHANNEL, 'SYSTEM_LOG_CHANNEL');
    if (ch) await ch.send({ embeds: [embed] });
    res.json({ ok: true });
  });

  return router;
};
