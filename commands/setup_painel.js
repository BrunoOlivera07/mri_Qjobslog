const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_painel')
        .setDescription('Cria o painel de bate-ponto neste canal')
        .addStringOption(option => 
            option.setName('organizacao')
                .setDescription('A Tag/Job da Organização que usará este painel (ex: police, ambulance)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const org = interaction.options.getString('organizacao');

        const embed = new EmbedBuilder()
            .setTitle(`Painel de Serviço - ${org.toUpperCase()}`)
            .setDescription(`Utilize os botões abaixo para gerenciar o seu ponto de serviço.\n\n⚠️ **Aviso:** Antes de bater o ponto, você deve se registrar utilizando o comando \`/registrar\`.`)
            .setColor(0x0099FF)
            .setFooter({ text: `Atualizado automaticamente • ${moment().format('DD/MM/YYYY HH:mm')}\nDesenvolvido por SnowDeve ⛄` });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ponto_entrar_${org}`)
                    .setLabel('Entrar em Serviço')
                    .setEmoji('🟢')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`ponto_pausar_${org}`)
                    .setLabel('Pausar / Retomar')
                    .setEmoji('🟡')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`ponto_sair_${org}`)
                    .setLabel('Sair de Serviço')
                    .setEmoji('🔴')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `Painel configurado para a organização \`${org}\` neste canal!`, ephemeral: true });
    },
};
