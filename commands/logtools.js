const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../database/connection');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logtools')
        .setDescription('Comandos Administrativos de Manutenção do Sistema de Ponto')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('limpar')
                .setDescription('Deleta do banco de dados os logs antigos de todas as orgs')
                .addIntegerOption(option => 
                    option.setName('dias')
                        .setDescription('Excluir logs mais antigos que quantos dias? (ex: 30)')
                        .setRequired(true))),
    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'limpar') {
            const dias = interaction.options.getInteger('dias');
            const guildId = interaction.guildId;

            try {
                const connection = await pool.getConnection();

                // Evitar acidentes (nao apagar hoje)
                if (dias < 1) {
                    connection.release();
                    return interaction.reply({ content: 'Você deve especificar um número de dias maior ou igual a 1.', ephemeral: true });
                }

                const query = `DELETE FROM mri_duty_logs WHERE guild_id = ? AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`;
                const [result] = await connection.execute(query, [guildId, dias]);

                connection.release();

                await interaction.reply({ 
                    content: `🧹 **Manutenção Concluída!**\nForam deletados **${result.affectedRows}** registros de ponto que eram mais antigos que **${dias} dias**.`, 
                    ephemeral: true 
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '⚠️ Ocorreu um erro ao tentar limpar o banco de dados.', ephemeral: true });
            }
        }
    },
};
