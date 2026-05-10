const { EmbedBuilder } = require('discord.js');

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) return res.status(401).json({ error: 'Não autorizado' });
  next();
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

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function smallJson(data) {
  return `\`\`\`json\n${JSON.stringify(data || {}, null, 2).slice(0, 900)}\n\`\`\``;
}

async function sendAdminEntityLog(client, req, res, modulo, title) {
  try {
    const payload = req.body || {};
    const embed = new EmbedBuilder()
      .setColor('#f97316')
      .setTitle(title)
      .addFields(
        { name: 'Ação', value: String(payload.acao || '-').slice(0, 1024), inline: true },
        { name: 'ID', value: String(payload.id || '-'), inline: true },
        { name: 'Nome', value: String(payload.nome || payload.nomeEvento || payload.usuario || '-').slice(0, 1024), inline: true },
        { name: 'Módulo', value: modulo, inline: true },
        { name: 'Dados', value: smallJson(payload), inline: false },
      )
      .setTimestamp();

    const ch = await channel(client, process.env.ADMIN_LOG_CHANNEL, 'ADMIN_LOG_CHANNEL');
    if (ch) await ch.send({ embeds: [embed] });
    res.json({ success: !!ch });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: `Erro ao enviar log de ${modulo}` });
  }
}

module.exports = function webhookRoutes(client) {
  const router = require('express').Router();
  router.use(authMiddleware);

  router.post('/test', async (req, res) => {
    const ch = await channel(client, process.env.SYSTEM_LOG_CHANNEL, 'SYSTEM_LOG_CHANNEL');
    if (ch) await ch.send('✅ Teste do bot PetZilla funcionando.');
    res.json({ success: !!ch, systemChannel: process.env.SYSTEM_LOG_CHANNEL });
  });

  router.post('/logs', async (req, res) => {
    try {
      const { level = 'INFO', message = 'Sem mensagem', source = 'PetZilla', data } = req.body || {};
      const lvl = String(level).toUpperCase();
      const embed = new EmbedBuilder().setTimestamp().setFooter({ text: `Fonte: ${source}` });
      if (['ERROR', 'FATAL'].includes(lvl)) embed.setColor('#ef4444').setTitle('❌ Erro no Sistema');
      else if (['WARN', 'WARNING'].includes(lvl)) embed.setColor('#f59e0b').setTitle('⚠️ Aviso');
      else embed.setColor('#22c55e').setTitle('📝 Log do Sistema');
      embed.setDescription(String(message).slice(0, 3900));
      if (data) embed.addFields({ name: 'Dados', value: smallJson(data) });

      const isError = ['ERROR', 'FATAL'].includes(lvl);
      const ch = await channel(client, isError ? process.env.ERROR_LOG_CHANNEL : process.env.SYSTEM_LOG_CHANNEL, isError ? 'ERROR_LOG_CHANNEL' : 'SYSTEM_LOG_CHANNEL');
      if (ch) await ch.send({ embeds: [embed] });
      res.json({ success: !!ch });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erro ao enviar log' });
    }
  });

  router.post('/admin-action', async (req, res) => {
    try {
      const { admin = {}, acao = 'alterou', modulo = 'Sistema', item = {}, detalhes = {} } = req.body || {};
      const embed = new EmbedBuilder()
        .setColor('#f97316')
        .setTitle(`🛠️ Admin ${acao}`)
        .addFields(
          { name: 'Administrador', value: admin.nome || 'Administrador', inline: true },
          { name: 'Usuário', value: admin.usuario || '-', inline: true },
          { name: 'Cargo', value: admin.cargo || admin.perfil || '-', inline: true },
          { name: 'Módulo', value: modulo || '-', inline: true },
          { name: 'Item', value: item.nome || item.titulo || item.id || '-', inline: true },
          { name: 'Detalhes', value: smallJson({ item, detalhes }) },
        )
        .setTimestamp();
      const ch = await channel(client, process.env.ADMIN_LOG_CHANNEL, 'ADMIN_LOG_CHANNEL');
      if (ch) await ch.send({ embeds: [embed] });
      res.json({ success: !!ch });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erro no log admin' });
    }
  });

  router.post('/produto', (req, res) => sendAdminEntityLog(client, req, res, 'Produto', '📦 Log de produto'));
  router.post('/categoria', (req, res) => sendAdminEntityLog(client, req, res, 'Categoria', '🏷️ Log de categoria'));
  router.post('/promocao', (req, res) => sendAdminEntityLog(client, req, res, 'Promoção', '🎯 Log de promoção'));
  router.post('/usuario', (req, res) => sendAdminEntityLog(client, req, res, 'Usuário', '👤 Log de usuário'));

  router.post('/vendas', async (req, res) => {
    try {
      const { pedidoId, cliente, email, telefone, endereco, pagamento, produtos = [], total, observacoes } = req.body || {};
      const listaProdutos = Array.isArray(produtos)
        ? produtos.map(p => `${p.nome || 'Produto'} x${p.quantidade || 1} - ${money((p.precoFinal || p.preco || 0) * (p.quantidade || 1))}`).join('\n').slice(0, 1000)
        : String(produtos || '-');
      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setTitle('🛒 Pedido finalizado pelo site')
        .addFields(
          { name: 'Pedido', value: String(pedidoId || '-'), inline: true },
          { name: 'Cliente', value: cliente || '-', inline: true },
          { name: 'Total', value: money(total), inline: true },
          { name: 'Email', value: email || '-', inline: true },
          { name: 'Telefone', value: telefone || '-', inline: true },
          { name: 'Pagamento', value: pagamento || '-', inline: true },
          { name: 'Endereço', value: endereco || '-', inline: false },
          { name: 'Produtos', value: listaProdutos || '-', inline: false },
          { name: 'Observações', value: observacoes || '-', inline: false },
        )
        .setTimestamp();
      const ch = await channel(client, process.env.SALES_CHANNEL, 'SALES_CHANNEL');
      if (ch) await ch.send({ embeds: [embed] });
      res.json({ success: !!ch });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erro ao enviar venda' });
    }
  });

  router.get('/debug/config', async (req, res) => {
    res.json({
      botOnline: !!client.user,
      guildId: process.env.GUILD_ID,
      channels: {
        system: !!(await channel(client, process.env.SYSTEM_LOG_CHANNEL, 'SYSTEM_LOG_CHANNEL')),
        error: !!(await channel(client, process.env.ERROR_LOG_CHANNEL, 'ERROR_LOG_CHANNEL')),
        alert: !!(await channel(client, process.env.ALERT_CHANNEL, 'ALERT_CHANNEL')),
        sales: !!(await channel(client, process.env.SALES_CHANNEL, 'SALES_CHANNEL')),
        admin: !!(await channel(client, process.env.ADMIN_LOG_CHANNEL, 'ADMIN_LOG_CHANNEL')),
        support: !!(await channel(client, process.env.SUPPORT_LOG_CHANNEL, 'SUPPORT_LOG_CHANNEL')),
      },
      supportCategoryId: process.env.SUPPORT_CATEGORY_ID,
      supportPrivateTickets: process.env.SUPPORT_PRIVATE_TICKETS,
    });
  });

  return router;
};
