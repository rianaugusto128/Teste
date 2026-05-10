const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`🐾 Petzilla Bot conectado: ${client.user.tag}`);
  },
};
