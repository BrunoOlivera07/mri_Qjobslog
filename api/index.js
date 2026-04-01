const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const pool = require('../database/connection');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

function initApi(client) {
    const app = express();
    const PORT = process.env.API_PORT || 3001;
    const JWT_SECRET = process.env.JWT_SECRET || 'secret_para_dev_mudar_depois';
    
    // Configurações do OAuth2 Discord
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const REDIRECT_URI = process.env.OAUTH2_REDIRECT_URI || `${FRONTEND_URL}/callback`;

    app.use(cors({ origin: FRONTEND_URL, credentials: true })); // Para o Vite React Dev Server
    app.use(express.json());
    app.use('/uploads', express.static(uploadDir));

    // --- MIDDLEWARE DE AUTENTICAÇÃO ---
    const authenticate = (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });
        
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (e) {
            return res.status(401).json({ error: 'Token inválido ou expirado' });
        }
    };

    // --- ROTAS DE AUTENTICAÇÃO ---
    app.get('/api/auth/login', (req, res) => {
        const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
        res.redirect(url);
    });

    app.post('/api/auth/callback', async (req, res) => {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'No code provided' });

        try {
            const params = new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI
            });

            const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const accessToken = tokenResponse.data.access_token;

            // Busca os dados do usuário
            const userResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const user = userResponse.data;

            // Criar nosso JWT contendo o access_token do discord e o ID
            const token = jwt.sign(
                { id: user.id, username: user.username, avatar: user.avatar, discord_token: accessToken },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({ token, user: { id: user.id, username: user.username, avatar: user.avatar } });
        } catch (error) {
            console.error('Erro no callback OAuth:', error.response?.data || error.message);
            res.status(500).json({ error: 'Falha na autenticação com o Discord' });
        }
    });

    // --- ROTAS DO DASHBOARD ---
    app.get('/api/guilds', authenticate, async (req, res) => {
        try {
            // Busca guilds do usuário na API do Discord
            const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${req.user.discord_token}` }
            });

            const userGuilds = guildsResponse.data;

            // Filtra guilds onde o usuário tem MANAGE_GUILD (0x20) ou ADMINISTRATOR (0x8)
            const adminGuilds = userGuilds.filter(g => {
                const perms = BigInt(g.permissions);
                return (perms & 8n) === 8n || (perms & 32n) === 32n;
            });

            // Enriquece com a informação se o bot está no servidor
            const enrichedGuilds = adminGuilds.map(g => {
                const botIsPresent = client.guilds.cache.has(g.id);
                return { ...g, botIsPresent };
            });

            res.json(enrichedGuilds);
        } catch (error) {
            console.error('Erro ao buscar guilds:', error.response?.data || error.message);
            res.status(500).json({ error: 'Falha ao buscar servidores' });
        }
    });

    // Permissão de Gerência (Middleware Rápido)
    const checkGuildAdmin = async (req, res, next) => {
        const { guildId } = req.params;
        try {
            const memberResponse = await axios.get(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
                headers: { Authorization: `Bearer ${req.user.discord_token}` }
            }).catch(() => null); // Falha se não existir/não for membro

            if (!memberResponse) {
                // Alternativa: consultar de novo todas as guilds para checar admin
                const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
                    headers: { Authorization: `Bearer ${req.user.discord_token}` }
                });
                const g = guildsResponse.data.find(x => x.id === guildId);
                if (!g) return res.status(403).json({ error: 'Acesso negado' });
                const perms = BigInt(g.permissions);
                if ((perms & 8n) !== 8n && (perms & 32n) !== 32n) return res.status(403).json({ error: 'Acesso negado' });
            }
            next();
        } catch(e) {
            next(); // Simplificação para dev
        }
    };

    // --- ENDPOINTS DE CONFIGURAÇÃO (mri_orgs_config) ---
    app.get('/api/guilds/:guildId/config', authenticate, checkGuildAdmin, async (req, res) => {
        const { guildId } = req.params;
        try {
            const connection = await pool.getConnection();
            const [rows] = await connection.query('SELECT job_name, webhook, log_title, icon_url, color, panel_channel_id, report_channel_id FROM mri_orgs_config WHERE guild_id = ?', [guildId]);
            connection.release();
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar configurações' });
        }
    });

    app.post('/api/guilds/:guildId/config', authenticate, checkGuildAdmin, upload.single('icon_file'), async (req, res) => {
        const { guildId } = req.params;
        console.log(`[API] Recebido POST para configurar Guild: ${guildId}`);
        let { job_name, webhook, log_title, icon_url, color, panel_channel_id, report_channel_id, send_panel } = req.body;
        
        // Tratativa de FormData (que converte null para a string "null")
        if (color === 'null' || color === '') color = null;
        if (log_title === 'null' || log_title === '') log_title = null;
        if (panel_channel_id === 'null' || panel_channel_id === '') panel_channel_id = null;
        if (report_channel_id === 'null' || report_channel_id === '') report_channel_id = null;

        let finalIconUrl = icon_url && icon_url !== 'null' ? icon_url : null;
        if (req.file) {
             const hostUrl = req.protocol + '://' + req.get('host');
             finalIconUrl = `${hostUrl}/uploads/${req.file.filename}`;
        }

        if (!job_name || !webhook) return res.status(400).json({ error: 'Faltam campos obrigatórios' });

        try {
            const connection = await pool.getConnection();

            const [rows] = await connection.query('SELECT * FROM mri_orgs_config WHERE job_name = ? AND guild_id = ?', [job_name, guildId]);
            if (rows.length > 0) {
                await connection.execute(
                    'UPDATE mri_orgs_config SET webhook = ?, log_title = ?, icon_url = ?, color = ?, panel_channel_id = ?, report_channel_id = ? WHERE job_name = ? AND guild_id = ?',
                    [webhook, log_title || null, finalIconUrl, color || null, panel_channel_id || null, report_channel_id || null, job_name, guildId]
                );
            } else {
                await connection.execute(
                    'INSERT INTO mri_orgs_config (job_name, webhook, log_title, icon_url, color, panel_channel_id, report_channel_id, guild_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [job_name, webhook, log_title || null, finalIconUrl, color || null, panel_channel_id || null, report_channel_id || null, guildId]
                );
            }
            
            // Retorna o atualizado para injetar no front
            const [updatedRows] = await connection.query('SELECT job_name, webhook, log_title, icon_url, color, panel_channel_id, report_channel_id FROM mri_orgs_config WHERE guild_id = ?', [guildId]);
            
            connection.release();

            // Ação: Disparar o painel pro discord se o checkbox foi marcado
            const shouldSendPanel = send_panel === 'true' || send_panel === true;
            if (shouldSendPanel && panel_channel_id) {
                try {
                    const channel = await client.channels.fetch(panel_channel_id);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setTitle(`Painel de Serviço - ${job_name.toUpperCase()}`)
                            .setDescription(`Utilize os botões abaixo para gerenciar o seu ponto de serviço.\n\n⚠️ **Aviso:** Antes de bater o ponto, faça seu registro com o comando /registrar :**[ID]:** :**[CARGO]:**. `)
                            .setColor(color || 0x0099FF)
                            .setFooter({ text: `Atualizado automaticamente • ${moment().format('DD/MM/YYYY HH:mm')}\nDesenvolvido por SnowDeve ⛄` });

                        if (finalIconUrl) embed.setThumbnail(finalIconUrl);

                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`ponto_entrar_${job_name}`).setLabel('Entrar em Serviço').setEmoji('🟢').setStyle(ButtonStyle.Success),
                                new ButtonBuilder().setCustomId(`ponto_pausar_${job_name}`).setLabel('Pausar / Retomar').setEmoji('🟡').setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId(`ponto_sair_${job_name}`).setLabel('Sair de Serviço').setEmoji('🔴').setStyle(ButtonStyle.Danger)
                            );

                        // Enviar através de Webhook do canal para habilitar Photo de Perfil e Nome da Config!
                        const webhooks = await channel.fetchWebhooks();
                        let channelWebhook = webhooks.find(wh => wh.token); // Um webhook util que nós temos acesso
                        if (!channelWebhook) {
                            // Criar um pro bot poder usar
                            channelWebhook = await channel.createWebhook({
                                name: 'Bate-Ponto Panel Webhook',
                                reason: 'Criado automaticamente para enviar o Painel com Nome e Foto de Perfil da Org configurada'
                            });
                        }

                        await channelWebhook.send({
                            username: log_title || 'Sistema de Ponto',
                            avatarURL: finalIconUrl || undefined,
                            embeds: [embed],
                            components: [row]
                        });
                    }
                } catch(e) {
                    console.error("Falha ao enviar painel para o Discord", e);
                    return res.json({ message: 'Salvo com sucesso, mas ocorreu um erro de permissão ao enviar o painel pro canal no Discord.', configs: updatedRows });
                }
            }

            res.json({ message: 'Salvo com sucesso', configs: updatedRows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao salvar configurações' });
        }
    });

    app.delete('/api/guilds/:guildId/config/:jobName', authenticate, checkGuildAdmin, async (req, res) => {
        const { guildId, jobName } = req.params;
        try {
            const connection = await pool.getConnection();
            await connection.execute('DELETE FROM mri_orgs_config WHERE job_name = ? AND guild_id = ?', [jobName, guildId]);
            connection.release();
            res.json({ message: 'Removido com sucesso' });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao excluir' });
        }
    });

    app.listen(PORT, () => {
        console.log(`[API Dashboard] Rodando na porta ${PORT}`);
    });
}

module.exports = initApi;
