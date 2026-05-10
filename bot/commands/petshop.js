const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCounts, getProdutos, getPromocoesAtivas, getCategorias } = require('../services/petshopApi');
const { money, limitText } = require('../utils/formatters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('petshop')
    .setDescription('Comandos do sistema Petzilla')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Mostra o status real do backend e do bot')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('produtos')
        .setDescription('Lista os primeiros produtos cadastrados')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('estoque-baixo')
        .setDescription('Mostra produtos com estoque baixo')
        .addIntegerOption(option =>
          option
            .setName('limite')
            .setDescription('Quantidade máxima para considerar estoque baixo')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('promocoes')
        .setDescription('Lista promoções ativas')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('categorias')
        .setDescription('Lista categorias cadastradas')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('help')
        .setDescription('Mostra ajuda do bot')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: false });

    if (subcommand === 'status') {
      try {
        const counts = await getCounts();

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🏪 Petzilla - Status do Sistema')
          .addFields(
            { name: 'Bot', value: '✅ Online', inline: true },
            { name: 'API', value: '✅ Online', inline: true },
            { name: 'Latência', value: `${interaction.client.ws.ping}ms`, inline: true },
            { name: 'Produtos', value: String(counts.produtos ?? 0), inline: true },
            { name: 'Categorias', value: String(counts.categorias ?? 0), inline: true },
            { name: 'Promoções', value: String(counts.promocoes ?? 0), inline: true },
            { name: 'Usuários', value: String(counts.usuarios ?? 0), inline: true },
            { name: 'Cargos', value: String(counts.cargos ?? 0), inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (error) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('🚨 API Offline ou indisponível')
          .setDescription('O bot está online, mas não conseguiu acessar o backend Spring Boot.')
          .addFields({ name: 'Erro', value: limitText(error.message, 500) })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    }

    if (subcommand === 'produtos') {
      const produtos = await getProdutos();
      const linhas = produtos.slice(0, 10).map(p => {
        return `• **${p.nome || 'Sem nome'}** — ${money(p.preco)} — Estoque: ${p.qtdEstoque ?? 0}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#00AEEF')
        .setTitle('📦 Produtos cadastrados')
        .setDescription(linhas.length ? linhas.join('\n') : 'Nenhum produto encontrado.')
        .setFooter({ text: `Mostrando ${Math.min(produtos.length, 10)} de ${produtos.length}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'estoque-baixo') {
      const limite = interaction.options.getInteger('limite') ?? Number(process.env.LOW_STOCK_LIMIT || 5);
      const produtos = await getProdutos();
      const baixos = produtos.filter(p => Number(p.qtdEstoque || 0) <= limite);

      const linhas = baixos.slice(0, 15).map(p => {
        return `• **${p.nome || 'Sem nome'}** — Estoque: **${p.qtdEstoque ?? 0}** — ${money(p.preco)}`;
      });

      const embed = new EmbedBuilder()
        .setColor(baixos.length ? '#FFA500' : '#00FF00')
        .setTitle('⚠️ Produtos com estoque baixo')
        .setDescription(linhas.length ? linhas.join('\n') : `Nenhum produto com estoque menor ou igual a ${limite}.`)
        .setFooter({ text: `Limite usado: ${limite}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'promocoes') {
      const promocoes = await getPromocoesAtivas();
      const linhas = promocoes.slice(0, 10).map(p => {
        return `• **${p.nomeEvento || 'Promoção'}** — ${p.percentualDesconto || 0}% — Produtos: ${p.produtos?.length || 0}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🎉 Promoções ativas')
        .setDescription(linhas.length ? linhas.join('\n') : 'Nenhuma promoção ativa encontrada.')
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'categorias') {
      const categorias = await getCategorias();
      const linhas = categorias.slice(0, 20).map(c => `• **${c.nome || 'Sem nome'}** — Ativa: ${c.ativo ? 'Sim' : 'Não'}`);

      const embed = new EmbedBuilder()
        .setColor('#8A2BE2')
        .setTitle('🏷️ Categorias cadastradas')
        .setDescription(linhas.length ? linhas.join('\n') : 'Nenhuma categoria encontrada.')
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'help') {
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🐾 Petzilla Bot - Ajuda')
        .setDescription('Bot de logs, monitoramento e consultas do sistema Petzilla.')
        .addFields(
          { name: '/petshop status', value: 'Mostra status do bot, API e totais do sistema.' },
          { name: '/petshop produtos', value: 'Lista produtos cadastrados.' },
          { name: '/petshop estoque-baixo', value: 'Mostra produtos com estoque baixo.' },
          { name: '/petshop promocoes', value: 'Mostra promoções ativas.' },
          { name: '/petshop categorias', value: 'Mostra categorias cadastradas.' },
          { name: 'Webhooks', value: 'POST /api/logs\nPOST /api/produto\nPOST /api/categoria\nPOST /api/promocao\nPOST /api/usuario\nPOST /api/vendas' }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
