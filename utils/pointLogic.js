const pool = require('../database/connection');
const moment = require('moment');
const { WebhookClient, EmbedBuilder } = require('discord.js');

async function sendWebhookLog(connection, org, guildId, embed, messageId = null) {
    try {
        const [rows] = await connection.query('SELECT webhook, log_title, icon_url FROM mri_orgs_config WHERE LOWER(TRIM(job_name)) = LOWER(TRIM(?)) AND guild_id = ?', [org, guildId]);
        if (rows.length > 0 && rows[0].webhook) {
            const cleanUrl = rows[0].webhook.trim();
            const webhookClient = new WebhookClient({ url: cleanUrl });
            if (rows[0].log_title) {
                // Ao invés de usar author, vamos colocar no footer como a imagem mostrou
                embed.setFooter({ text: `${rows[0].log_title} • ${moment().format('DD/MM/YYYY HH:mm:ss')}\nDesenvolvido por SnowDeve ⛄` });
            } else {
                embed.setFooter({ text: `Atualizado automaticamente • ${moment().format('DD/MM/YYYY HH:mm:ss')}\nDesenvolvido por SnowDeve ⛄` });
            }
            if (rows[0].icon_url) {
                embed.setThumbnail(rows[0].icon_url);
            }
            
            // Opções do envio principal do webhook
            const webhookOptions = {
                username: rows[0].log_title || 'Sistema de Ponto',
                embeds: [embed]
            };
            if (rows[0].icon_url) {
                webhookOptions.avatarURL = rows[0].icon_url;
            }

            if (messageId) {
                try {
                    await webhookClient.editMessage(messageId, webhookOptions);
                    return messageId;
                } catch (editError) {
                    console.error('[Webhook] Mensagem original não encontrada (deletada?). Criando nova...');
                    const msg = await webhookClient.send(webhookOptions);
                    return msg.id;
                }
            } else {
                const msg = await webhookClient.send(webhookOptions);
                return msg.id;
            }
        } else {
            console.log(`[Webhook] Nenhuma configuração encontrada ou URL vazia para a org: "${org}"`);
            return null;
        }
    } catch (e) {
        console.error('[ERRO] Falha ao enviar webhook de log. URL inválida ou API indisponível:', e);
        return null;
    }
}

async function handlePontoButton(interaction) {
    const customId = interaction.customId; 
    const parts = customId.split('_');
    const action = parts[1]; // entrar, pausar, sair
    const org = parts[2];

    const discordId = interaction.user.id;
    const guildId = interaction.guildId;

    try {
        const connection = await pool.getConnection();

        // 1. Verificar se usuário possui registro neste servidor
        const [users] = await connection.query('SELECT * FROM mri_users WHERE discord_id = ? AND guild_id = ?', [discordId, guildId]);
        if (users.length === 0) {
            connection.release();
            return interaction.reply({ content: '❌ Você não está registrado neste servidor! Use o comando `/registrar` antes de usar o painel.', ephemeral: true });
        }
        
        const user = users[0];
        
        // 2. Buscar último log aberto neste servidor
        const [logs] = await connection.query(
            'SELECT * FROM mri_duty_logs WHERE discord_id = ? AND guild_id = ? AND status IN ("Entrou", "Pausado") ORDER BY id DESC LIMIT 1', 
            [discordId, guildId]
        );
        const activeLog = logs.length > 0 ? logs[0] : null;

        if (action === 'entrar') {
            if (activeLog) {
                connection.release();
                return interaction.reply({ content: `⚠️ Você já possui um serviço em andamento na organização **${activeLog.job}**.`, ephemeral: true });
            }

            const [result] = await connection.execute(
                'INSERT INTO mri_duty_logs (job, player_name, citizenid, grade, discord_id, guild_id, status, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [org, user.name, user.citizenid, user.grade || 'Membro', discordId, guildId, 'Entrou', 0]
            );
            const insertedId = result.insertId;

            const logEmbed = new EmbedBuilder()
                .setTitle('🟢 Iniciou Expediente')
                .addFields(
                    { name: '👤 Colaborador', value: `${user.name}\n🆔 **Passaporte:**\n\`${user.citizenid}\``, inline: true },
                    { name: '🎮 Player INFO', value: `🎮 Discord: <@${discordId}>`, inline: true },
                    { name: '👮 Cargo', value: `${org.toUpperCase()} | ${user.grade || 'Membro'}`, inline: true },
                    { name: '📥 Entrou', value: `${moment().format('HH:mm DD/MM/YYYY')}`, inline: true }
                )
                .setColor(0x57F287);
                
            const messageId = await sendWebhookLog(connection, org, guildId, logEmbed);

            if (messageId) {
                await connection.execute('UPDATE mri_duty_logs SET message_id = ? WHERE id = ?', [messageId, insertedId]);
            }

            connection.release();
            return interaction.reply({ content: `🟢 **Serviço Iniciado** com sucesso na organização \`${org}\`!`, ephemeral: true });
        }

        if (action === 'pausar') {
            if (!activeLog) {
                connection.release();
                return interaction.reply({ content: `⚠️ Você não tem nenhum serviço iniciado para pausar.`, ephemeral: true });
            }

            if (activeLog.status === 'Entrou') {
                // Pausar
                await connection.execute(
                    'UPDATE mri_duty_logs SET status = ?, paused_at = NOW() WHERE id = ?',
                    ['Pausado', activeLog.id]
                );

                const logEmbed = new EmbedBuilder()
                    .setTitle('🟡 Expediente em Pausa')
                    .addFields(
                        { name: '👤 Colaborador', value: `${user.name}\n🆔 **Passaporte:**\n\`${user.citizenid}\``, inline: true },
                        { name: '🎮 Player INFO', value: `🎮 Discord: <@${discordId}>`, inline: true },
                        { name: '👮 Cargo', value: `${org.toUpperCase()} | ${user.grade || 'Membro'}`, inline: true },
                        { name: '📥 Entrou', value: `${moment(activeLog.created_at).format('HH:mm DD/MM/YYYY')}`, inline: true },
                        { name: '⏸️ Iniciou Pausa', value: `${moment().format('HH:mm DD/MM/YYYY')}`, inline: true }
                    )
                    .setColor(0xFEE75C);
                    
                const messageId = await sendWebhookLog(connection, org, guildId, logEmbed, activeLog.message_id);
                if (messageId && messageId !== activeLog.message_id) {
                     await connection.execute('UPDATE mri_duty_logs SET message_id = ? WHERE id = ?', [messageId, activeLog.id]);
                }

                connection.release();
                return interaction.reply({ content: `🟡 **Serviço Pausado!** O tempo parou de contar.`, ephemeral: true });

            } else if (activeLog.status === 'Pausado') {
                // Retomar e somar o tempo
                const pausedAt = moment(activeLog.paused_at);
                const now = moment();
                const diffMinutes = now.diff(pausedAt, 'minutes');

                await connection.execute(
                    'UPDATE mri_duty_logs SET status = ?, paused_at = NULL, total_pause_time = total_pause_time + ? WHERE id = ?',
                    ['Entrou', diffMinutes, activeLog.id]
                );

                const logEmbed = new EmbedBuilder()
                    .setTitle('🟢 Retornou ao Expediente')
                    .addFields(
                        { name: '👤 Colaborador', value: `${user.name}\n🆔 **Passaporte:**\n\`${user.citizenid}\``, inline: true },
                        { name: '🎮 Player INFO', value: `🎮 Discord: <@${discordId}>`, inline: true },
                        { name: '👮 Cargo', value: `${org.toUpperCase()} | ${user.grade || 'Membro'}`, inline: true },
                        { name: '📥 Entrou', value: `${moment(activeLog.created_at).format('HH:mm DD/MM/YYYY')}`, inline: true },
                        { name: '▶️ Retornou', value: `${moment().format('HH:mm DD/MM/YYYY')}\n(Pausa de ${diffMinutes}m)`, inline: true }
                    )
                    .setColor(0x57F287);
                    
                const messageId = await sendWebhookLog(connection, org, guildId, logEmbed, activeLog.message_id);
                if (messageId && messageId !== activeLog.message_id) {
                     await connection.execute('UPDATE mri_duty_logs SET message_id = ? WHERE id = ?', [messageId, activeLog.id]);
                }

                connection.release();
                return interaction.reply({ content: `▶️ **Serviço Retomado!** O tempo voltou a contar. (Pausado por ${diffMinutes} min)`, ephemeral: true });
            }
        }

        if (action === 'sair') {
            if (!activeLog) {
                connection.release();
                return interaction.reply({ content: `⚠️ Você não tem nenhum serviço em andamento para sair.`, ephemeral: true });
            }

            const createdAt = moment(activeLog.created_at);
            const now = moment();
            let grossDurationMinutes = now.diff(createdAt, 'minutes');
            let extraPauseTime = 0;

            if (activeLog.status === 'Pausado') {
                const pausedAt = moment(activeLog.paused_at);
                extraPauseTime = now.diff(pausedAt, 'minutes');
            }

            let finalPauseTime = activeLog.total_pause_time + extraPauseTime;
            let netDurationMinutes = grossDurationMinutes - finalPauseTime;
            if (netDurationMinutes < 0) netDurationMinutes = 0; // Prevenção de bug

            await connection.execute(
                'UPDATE mri_duty_logs SET status = ?, paused_at = NULL, total_pause_time = ?, duration = ? WHERE id = ?',
                ['Saiu', finalPauseTime, netDurationMinutes, activeLog.id]
            );

            const totalSecsRaw = now.diff(createdAt, 'seconds');
            const netSecs = totalSecsRaw - (finalPauseTime * 60);
            const absoluteSecs = Math.max(0, netSecs);
            
            const hours = Math.floor(absoluteSecs / 3600);
            const minutes = Math.floor((absoluteSecs % 3600) / 60);
            const seconds = absoluteSecs % 60;
            const formattedTime = `${hours}h ${minutes}m ${seconds}s`;

            const logEmbed = new EmbedBuilder()
                .setTitle('🔴 Finalizou Expediente')
                .addFields(
                    { name: '⏱️ TEMPO TOTAL', value: `\`\`\`\n${formattedTime}\n\`\`\``, inline: false },
                    { name: '👤 Colaborador', value: `${user.name}\n🆔 **Passaporte:**\n\`${user.citizenid}\``, inline: true },
                    { name: '🎮 Player INFO', value: `🎮 Discord: <@${discordId}>`, inline: true },
                    { name: '👮 Cargo', value: `${org.toUpperCase()} | ${user.grade || 'Membro'}`, inline: true },
                    { name: '📥 Entrou', value: `${moment(activeLog.created_at).format('HH:mm DD/MM/YYYY')}`, inline: true },
                    { name: '📤 Saiu', value: `${moment(now).format('HH:mm DD/MM/YYYY')}`, inline: true }
                )
                .setColor(0xED4245);
                
            const messageId = await sendWebhookLog(connection, org, guildId, logEmbed, activeLog.message_id);
            if (messageId && messageId !== activeLog.message_id) {
                 await connection.execute('UPDATE mri_duty_logs SET message_id = ? WHERE id = ?', [messageId, activeLog.id]);
            }
            
            connection.release();
            return interaction.reply({ 
                content: `🔴 **Serviço Encerrado!**\n⏱️ **Tempo Bruto:** ${grossDurationMinutes} min\n⏸️ **Tempo Pausado:** ${finalPauseTime} min\n✅ **Tempo Líquido:** ${netDurationMinutes} min`, 
                ephemeral: true 
            });
        }

    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Ocorreu um erro interno ao processar o ponto.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Ocorreu um erro interno ao processar o ponto.', ephemeral: true });
        }
    }
}

module.exports = { handlePontoButton };
