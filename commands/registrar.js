const { SlashCommandBuilder } = require('discord.js');
const pool = require('../database/connection');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registrar')
        .setDescription('Vincula seu Passaporte (CitizenID) ao seu Discord ID para poder bater ponto')
        .addStringOption(option => 
            option.setName('passaporte')
                .setDescription('Seu CitizenID in-game')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('nome')
                .setDescription('Seu nome (In-Game)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('cargo')
                .setDescription('Seu cargo exato na organização (ex: Diretor)')
                .setRequired(true)),
    async execute(interaction) {
        const passaporte = interaction.options.getString('passaporte');
        const nome = interaction.options.getString('nome');
        const cargo = interaction.options.getString('cargo');
        const discordId = interaction.user.id;
        const guildId = interaction.guildId;

        try {
            const connection = await pool.getConnection();
            
            // Verificar se ele já existe
            const [rows] = await connection.query('SELECT * FROM mri_users WHERE discord_id = ? AND guild_id = ?', [discordId, guildId]);
            
            if (rows.length > 0) {
                // Atualizar
                await connection.execute(
                    'UPDATE mri_users SET citizenid = ?, name = ?, grade = ? WHERE discord_id = ? AND guild_id = ?',
                    [passaporte, nome, cargo, discordId, guildId]
                );
                await interaction.reply({ content: `✅ Seu registro foi atualizado com sucesso neste servidor!\nPassaporte: **${passaporte}**\nNome: **${nome}**\nCargo: **${cargo}**`, ephemeral: true });
            } else {
                // Inserir
                await connection.execute(
                    'INSERT Into mri_users (discord_id, citizenid, name, grade, guild_id) VALUES (?, ?, ?, ?, ?)',
                    [discordId, passaporte, nome, cargo, guildId]
                );
                await interaction.reply({ content: `✅ Seu registro foi criado com sucesso neste servidor!\nPassaporte: **${passaporte}**\nNome: **${nome}**\nCargo: **${cargo}**\nVocê já pode usar o painel de ponto aqui.`, ephemeral: true });
            }
            connection.release();
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `❌ Ocorreu um erro ao salvar seu registro no banco de dados.`, ephemeral: true });
        }
    },
};
