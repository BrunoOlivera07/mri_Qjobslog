const { SlashCommandBuilder } = require('discord.js');
const pool = require('../database/connection');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registrar_config')
        .setDescription('Atualiza o cargo do seu registro de ponto (ou de outro membro)')
        .addStringOption(option => 
            option.setName('passaporte')
                .setDescription('O Passaporte (CitizenID) do membro')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('novo_cargo')
                .setDescription('O novo cargo (ex: Diretor)')
                .setRequired(true)),
    async execute(interaction) {
        const passaporte = interaction.options.getString('passaporte');
        const novoCargo = interaction.options.getString('novo_cargo');
        const guildId = interaction.guildId;

        try {
            const connection = await pool.getConnection();
            
            // Verificar se o passaporte existe no servidor atual
            const [rows] = await connection.query('SELECT * FROM mri_users WHERE citizenid = ? AND guild_id = ?', [passaporte, guildId]);
            
            if (rows.length > 0) {
                // Atualizar
                await connection.execute(
                    'UPDATE mri_users SET grade = ? WHERE citizenid = ? AND guild_id = ?',
                    [novoCargo, passaporte, guildId]
                );
                await interaction.reply({ content: `✅ O cargo referente ao passaporte **${passaporte}** foi atualizado para **${novoCargo}** neste servidor com sucesso!`, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ Nenhum registro encontrado para o passaporte **${passaporte}**. Peça para o membro usar o \`/registrar\` primeiro.`, ephemeral: true });
            }
            connection.release();
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `❌ Ocorreu um erro ao atualizar o cargo no banco de dados.`, ephemeral: true });
        }
    },
};
