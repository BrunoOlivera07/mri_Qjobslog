const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../database/connection');
const ExcelJS = require('exceljs');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('relatorio_org')
        .setDescription('Gera um relatório completo de ponto da organização (em arquivo Excel)')
        .addStringOption(option => 
            option.setName('organizacao')
                .setDescription('Tag da organização (ex: police)')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('dias')
                .setDescription('Quantidade de dias para puxar o histórico (ex: 7)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // Permissão exigida para gerentes
    async execute(interaction) {
        // Precisamos deferReply para dar tempo para gerar a planilha
        await interaction.deferReply({ ephemeral: true });

        const org = interaction.options.getString('organizacao');
        const dias = interaction.options.getInteger('dias');
        const guildId = interaction.guildId;

        try {
            const connection = await pool.getConnection();

            // Buscar Logs dos ultimos X dias apenas para este servidor
            const query = `
                SELECT * FROM mri_duty_logs
                WHERE job = ? AND guild_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY created_at DESC
            `;

            const [logs] = await connection.query(query, [org, guildId, dias]);

            // Buscar a configuração de canal de relatório
            const [orgConfigRow] = await connection.query('SELECT report_channel_id FROM mri_orgs_config WHERE job_name = ? AND guild_id = ?', [org, guildId]);
            const reportChannelId = orgConfigRow.length > 0 ? orgConfigRow[0].report_channel_id : null;

            connection.release();

            if (logs.length === 0) {
                return interaction.followUp({ content: `Nenhum log encontrado para a organização **${org}** nos últimos ${dias} dias.` });
            }

            // ---------- Criar Arquivo Excel (ExcelJS) ----------
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Bot de Ponto';
            workbook.created = new Date();

            const worksheet = workbook.addWorksheet(`Relatório - ${org.toUpperCase()}`);

            // Estilos de Coluna
            worksheet.columns = [
                { header: 'ID Log', key: 'id', width: 10 },
                { header: 'Nome', key: 'name', width: 25 },
                { header: 'Passaporte', key: 'citizenid', width: 15 },
                { header: 'Discord ID', key: 'discord_id', width: 25 },
                { header: 'Entrada', key: 'started', width: 25 },
                { header: 'Saída', key: 'ended', width: 25 },
                { header: 'Pausas (Min)', key: 'paused_time', width: 15 },
                { header: 'Duração Líquida (Min)', key: 'duration', width: 20 },
                { header: 'Status Final', key: 'status', width: 15 }
            ];

            let totalMinutos = 0;

            // Formatação do header
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            // Inserir dos Dados
            for (const log of logs) {
                
                // Calculando hora de Saída real caso o cara já tenha saído.
                // Na nossa lógica, "created_at" é a Entrada. "Saída" = created_at + gross_time
                let endedAtStr = 'Pendente';
                if (log.status === 'Saiu') {
                    // Duração total bruta
                    const totalGrossTime = log.duration + log.total_pause_time; 
                    const endedMoment = moment(log.created_at).add(totalGrossTime, 'minutes');
                    endedAtStr = endedMoment.format('DD/MM/YYYY HH:mm:ss');
                    totalMinutos += log.duration;
                }

                worksheet.addRow({
                    id: log.id,
                    name: log.player_name || 'Desconhecido',
                    citizenid: log.citizenid,
                    discord_id: log.discord_id,
                    started: moment(log.created_at).format('DD/MM/YYYY HH:mm:ss'),
                    ended: endedAtStr,
                    paused_time: log.total_pause_time || 0,
                    duration: log.duration || 0,
                    status: log.status
                });
            }

            // Somatorio Total no rodapé
            worksheet.addRow({});
            const totalRow = worksheet.addRow({
                name: 'TOTAL LÍQUIDO GERAL:',
                duration: totalMinutos
            });
            totalRow.font = { bold: true };

            // Transformar num buffer em RAM
            const buffer = await workbook.xlsx.writeBuffer();
            
            // Criar Anexo pro Discord
            const attachment = new AttachmentBuilder(buffer, { name: `Relatorio_${org.toUpperCase()}_${dias}dias.xlsx` });

            // Criar Embed de Resumo (Padrão Screenshot 2)
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
            
            const adminName = interaction.user.globalName || interaction.user.username;
            const adminId = interaction.user.id;
            
            const startDay = moment().subtract(dias, 'days').format('DD/MM');
            const endDay = moment().format('DD/MM');

            const embed = new EmbedBuilder()
                .setTitle(`📊 Relatório de Tempo Gerado`)
                .setDescription(`**Organização:** ${org.toLowerCase()}`)
                .addFields(
                    { name: '👮 Relatório Exportado por', value: `${adminName}`, inline: true },
                    { name: '🆔 Info do Executor', value: `Discord: <@${adminId}>`, inline: true },
                    { name: '🏅 Cargo', value: `Gerência`, inline: true },
                    { name: '📅 Relatório Completo Exportado', value: `Dia: ${startDay}\nAté: ${endDay}\n*(Tempo Total: ${timeString})*`, inline: false },
                    { name: '📁 Arquivo', value: `O relatório detalhado segue em anexo para baixar`, inline: false }
                )
                .setColor(0x2B2D31) // Cor mais escura de embed do discord
                .setFooter({ text: `Atualizado automaticamente • ${moment().format('DD/MM/YYYY HH:mm')}\nDesenvolvido por SnowDeve ⛄` });

            // Enviar Resposta
            if (reportChannelId) {
                try {
                    const targetChannel = await interaction.client.channels.fetch(reportChannelId);
                    if (targetChannel) {
                        await targetChannel.send({ embeds: [embed], files: [attachment] });
                        await interaction.followUp({ content: `✅ Relatório gerado e enviado com sucesso para o canal <#${reportChannelId}>!` });
                        return;
                    }
                } catch(e) {
                    console.log("Falha ao enviar relatório para o canal configurado", e);
                }
            }
            
            // Fallback (Se nao tiver sido configurado, manda onde o comando foi digitado)
            await interaction.followUp({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error(error);
            await interaction.followUp({ content: 'Ocorreu um erro crítico ao gerar o relatório XLSX.' });
        }
    },
};
