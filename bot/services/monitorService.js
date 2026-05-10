const { EmbedBuilder } = require('discord.js');
const { getCounts, getProdutos } = require('./petshopApi');
const { money } = require('../utils/formatters');

let apiWasOffline = false;
let lastLowStockAlert = new Map();
let lastCountsSnapshot = null;

async function sendToChannel(client, channelId, payload) {
  if (!channelId) return false;
  const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.warn(`⚠️ Canal não encontrado: ${channelId}`);
    return false;
  }
  await channel.send(payload);
  return true;
}

async function checkApiStatus(client) {
  try {
    const counts = await getCounts();
    if (apiWasOffline) {
      apiWasOffline = false;
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ API Petzilla voltou ao ar')
        .addFields(
          { name: 'Produtos', value: String(counts.produtos ?? 0), inline: true },
          { name: 'Usuários', value: String(counts.usuarios ?? 0), inline: true },
          { name: 'Categorias', value: String(counts.categorias ?? 0), inline: true }
        )
        .setTimestamp();
      await sendToChannel(client, process.env.ALERT_CHANNEL, { embeds: [embed] });
    }
    return counts;
  } catch (error) {
    if (!apiWasOffline) {
      apiWasOffline = true;
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚨 API Petzilla offline')
        .setDescription('O bot tentou acessar o backend Spring Boot e não conseguiu.')
        .addFields({ name: 'Erro', value: String(error.message || 'Erro desconhecido').slice(0, 1000) })
        .setTimestamp();
      await sendToChannel(client, process.env.ALERT_CHANNEL, { embeds: [embed] });
    }
    return null;
  }
}

async function checkCountsChanges(client, counts) {
  if (!counts) return;
  if (!lastCountsSnapshot) {
    lastCountsSnapshot = counts;
    return;
  }

  const keys = ['produtos', 'categorias', 'promocoes', 'usuarios', 'cargos'];
  const changes = keys
    .filter(k => Number(counts[k] ?? 0) !== Number(lastCountsSnapshot[k] ?? 0))
    .map(k => `${k}: ${lastCountsSnapshot[k] ?? 0} → ${counts[k] ?? 0}`);

  if (changes.length) {
    const embed = new EmbedBuilder()
      .setColor('#3b82f6')
      .setTitle('📈 Alteração detectada nos dados')
      .setDescription(changes.join('\n'))
      .setTimestamp();
    await sendToChannel(client, process.env.SYSTEM_LOG_CHANNEL, { embeds: [embed] });
    lastCountsSnapshot = counts;
  }
}

async function checkLowStock(client, counts) {
  if (!counts) return; // API offline, skip
  try {
    const limit = Number(process.env.LOW_STOCK_LIMIT || 5);
    const cooldownMs = Number(process.env.LOW_STOCK_COOLDOWN_MS || 30 * 60 * 1000);
    const produtos = await getProdutos();
    const baixos = produtos.filter(p => Number(p.qtdEstoque || 0) <= limit);

    for (const produto of baixos.slice(0, 15)) {
      const key = String(produto.id);
      const now = Date.now();
      const lastAlert = lastLowStockAlert.get(key) || 0;
      if (now - lastAlert < cooldownMs) continue;
      lastLowStockAlert.set(key, now);

      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ Estoque baixo')
        .addFields(
          { name: 'Produto', value: produto.nome || '-', inline: true },
          { name: 'Estoque', value: String(produto.qtdEstoque ?? 0), inline: true },
          { name: 'Preço', value: money(produto.preco), inline: true },
          { name: 'Categoria', value: produto.categoria?.nome || 'Sem categoria', inline: true }
        )
        .setTimestamp();
      await sendToChannel(client, process.env.ALERT_CHANNEL, { embeds: [embed] });
    }
  } catch (error) {
    console.error('Erro ao verificar estoque baixo:', error.message || error);
  }
}

function startApiMonitor(client) {
  const interval = Number(process.env.API_MONITOR_INTERVAL_MS || 60000);

  const run = async () => {
    const counts = await checkApiStatus(client);
    await checkCountsChanges(client, counts);
    await checkLowStock(client, counts);
  };

  run();
  setInterval(run, interval);
  console.log(`📡 Monitoramento automático ativado a cada ${interval}ms`);
}

module.exports = { startApiMonitor };
