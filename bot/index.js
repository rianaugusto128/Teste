require('dotenv').config();

const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');
const siteLogsRoutes = require('./routes/siteLogs');
const webhookRoutes = require('./routes/webhook');
const supportRoutes = require('./routes/support');
const { registerDiscordSupportListener } = require('./routes/support');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

app.get('/', (req, res) => {
  res.send(`Bot web server online. Discord: ${client.user ? `${client.user.tag} online` : 'conectando'}`);
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    bot: client.user ? `${client.user.tag} online` : 'conectando',
    uptime: process.uptime(),
  });
});

app.use('/api', siteLogsRoutes(client));
app.use('/api', webhookRoutes(client));
app.use('/api/support', supportRoutes(client));
registerDiscordSupportListener(client);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor web do bot rodando em http://localhost:${PORT}`));

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN nao configurado no .env');
  process.exit(1);
}

const RETRYABLE_LOGIN_STATUS = new Set([429, 500, 502, 503, 504]);
let loginAttempts = 0;

function getDiscordLoginRetryDelay(error) {
  const retryAfter = error?.retryAfter ?? error?.rawError?.retry_after;
  if (Number.isFinite(retryAfter)) {
    return Math.ceil(retryAfter * 1000);
  }

  const cappedAttempts = Math.min(loginAttempts, 6);
  return Math.min(30000, 5000 * cappedAttempts);
}

function isRetryableDiscordLoginError(error) {
  return RETRYABLE_LOGIN_STATUS.has(error?.status) || error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT';
}

function loginDiscordBot() {
  loginAttempts += 1;
  console.log(`Conectando ao Discord... tentativa ${loginAttempts}`);

  client.login(process.env.DISCORD_TOKEN).catch((error) => {
    const status = error?.status ? `status ${error.status}` : 'sem status HTTP';
    console.error(`Falha ao conectar no Discord (${status}): ${error.message}`);

    if (!isRetryableDiscordLoginError(error)) {
      console.error('Erro de login nao recuperavel. Confira DISCORD_TOKEN e as intents do bot no portal do Discord.');
      process.exit(1);
    }

    const delay = getDiscordLoginRetryDelay(error);
    console.log(`Vou tentar conectar novamente em ${Math.round(delay / 1000)}s.`);
    setTimeout(loginDiscordBot, delay);
  });
}

loginDiscordBot();
