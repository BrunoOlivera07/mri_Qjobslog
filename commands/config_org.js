const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../database/connection');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config_org')
        .setDescription('Configura os webhooks para logs públicos de uma organização')
        .addStringOption(option => 
            option.setName('organizacao')
                .setDescription('A Tag/Job da Organização (ex: police)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('webhook')
                .setDescription('O link do Webhook do Canal onde aparecerão os Entrou/Saiu de serviço')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('titulo')
                .setDescription('Título exibido na lateral do embed (Ex: DEPARTAMENTO DE POLÍCIA)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const org = interaction.options.getString('organizacao');
        const webhook = interaction.options.getString('webhook');
        const titulo = interaction.options.getString('titulo');
        const guildId = interaction.guildId;

        // Validar URL Básica
        if (!webhook.includes('discord.com/api/webhooks/')) {
            return interaction.reply({ content: '❌ URL de Webhook inválida. Por favor, vá nas Integrações do Canal do Discord e clique em "Copiar Link do Webhook".', ephemeral: true });
        }

        try {
            const connection = await pool.getConnection();

            // Verifica se a estrutura da tabela existe neste servidor
            const [rows] = await connection.query('SELECT * FROM mri_orgs_config WHERE job_name = ? AND guild_id = ?', [org, guildId]);

            if (rows.length > 0) {
                await connection.execute(
                    'UPDATE mri_orgs_config SET webhook = ?, log_title = ? WHERE job_name = ? AND guild_id = ?',
                    [webhook, titulo, org, guildId]
                );
            } else {
                await connection.execute(
                    'INSERT INTO mri_orgs_config (job_name, webhook, log_title, guild_id) VALUES (?, ?, ?, ?)',
                    [org, webhook, titulo, guildId]
                );
            }

            connection.release();
            await interaction.reply({ content: `✅ Webhooks configurados com sucesso para a organização \`${org.toUpperCase()}\`!\n\nPonto baterá silenciosamente para o usuário e mandará as mensagens visuais no webhook registrado.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `❌ Erro ao verificar a tabela mri_orgs_config. Se você rodou o SQL antigo, tudo deve funcionar.`, ephemeral: true });
        }
    },
};
