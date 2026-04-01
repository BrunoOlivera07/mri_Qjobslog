const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../database/connection');
const ExcelJS = require('exceljs');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('relatorio_player')
        .setDescription('Gera um relatório completo de serviço de um único membro')
        .addStringOption(option => 
            option.setName('passaporte')
                .setDescription('Digite o ID Passaporte (CitizenID) do Jogador')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('dias')
                .setDescription('Quantidade de dias para puxar o histórico (ex: 7)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const passaporte = interaction.options.getString('passaporte');
        const dias = interaction.options.getInteger('dias');
        const guildId = interaction.guildId;

        try {
            const connection = await pool.getConnection();

            const query = `
                SELECT * FROM mri_duty_logs
                WHERE citizenid = ? AND guild_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY created_at DESC
            `;

            const [logs] = await connection.query(query, [passaporte, guildId, dias]);
            connection.release();

            if (logs.length === 0) {
                return interaction.followUp({ content: `Nenhum log encontrado para o Passaporte **${passaporte}** nos últimos ${dias} dias.` });
            }

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Bot de Ponto';
            const worksheet = workbook.addWorksheet(`Membro ${passaporte}`);

            worksheet.columns = [
                { header: 'ID Log', key: 'id', width: 10 },
                { header: 'Organização', key: 'job', width: 20 },
                { header: 'Entrada', key: 'started', width: 25 },
                { header: 'Saída', key: 'ended', width: 25 },
                { header: 'Pausas (Min)', key: 'paused_time', width: 15 },
                { header: 'Duração (Min)', key: 'duration', width: 15 },
                { header: 'Status', key: 'status', width: 15 }
            ];

            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).alignment = { center: true };

            let totalMinutos = 0;

            for (const log of logs) {
                let endedAtStr = 'Pendente';
                if (log.status === 'Saiu') {
                    const totalGrossTime = log.duration + log.total_pause_time; 
                    endedAtStr = moment(log.created_at).add(totalGrossTime, 'minutes').format('DD/MM/YYYY HH:mm:ss');
                    totalMinutos += log.duration;
                }

                worksheet.addRow({
                    id: log.id,
                    job: log.job,
                    started: moment(log.created_at).format('DD/MM/YYYY HH:mm:ss'),
                    ended: endedAtStr,
                    paused_time: log.total_pause_time || 0,
                    duration: log.duration || 0,
                    status: log.status
                });
            }

            worksheet.addRow({});
            const totalRow = worksheet.addRow({ started: 'TOTAL:', duration: totalMinutos });
            totalRow.font = { bold: true };

            const buffer = await workbook.xlsx.writeBuffer();
            const attachment = new AttachmentBuilder(buffer, { name: `Membro_${passaporte}_${dias}dias.xlsx` });

            let timeString = '';
            const daysCount = Math.floor(totalMinutos / (24 * 60));
            const hoursCount = Math.floor((totalMinutos % (24 * 60)) / 60);
            const minsCount = Math.floor(totalMinutos % 60);
            const hwStr = `${String(hoursCount).padStart(2, '0')}:${String(minsCount).padStart(2, '0')}:00`;
            if (daysCount > 0) {
                timeString = `${daysCount} dia${daysCount > 1 ? 's' : ''}, ${hwStr}`;
            } else {
                timeString = hwStr;
            }

            const userName = logs[0].player_name || 'Desconhecido';
            
            const adminName = interaction.user.globalName || interaction.user.username;
            const adminId = interaction.user.id;
            
            const startDay = moment().subtract(dias, 'days').format('DD/MM');
            const endDay = moment().format('DD/MM');

            const embed = new EmbedBuilder()
                .setTitle(`📊 Relatório de Tempo Gerado`)
                .setDescription(`**Oficial:** ${userName}`)
                .addFields(
                    { name: '👮 Relatório Exportado por', value: `${adminName}`, inline: true },
                    { name: '🆔 Info do Executor', value: `Discord: <@${adminId}>`, inline: true },
                    { name: '🎖️ Passaporte Alvo', value: `${passaporte}`, inline: true },
                    { name: '📅 Relatório Completo Exportado', value: `Dia: ${startDay}\nAté: ${endDay}\n*(Tempo Total: ${timeString})*`, inline: false },
                    { name: '📁 Arquivo', value: `O relatório individual segue em anexo para baixar`, inline: false }
                )
                .setColor(0x2B2D31)
                .setFooter({ text: `Atualizado automaticamente • ${moment().format('DD/MM/YYYY HH:mm')}\nDesenvolvido por SnowDeve ⛄` });

            await interaction.followUp({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error(error);
            await interaction.followUp({ content: 'Ocorreu um erro crítico ao gerar o relatório.' });
        }
    },
};
