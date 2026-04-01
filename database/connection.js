const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'fivem', // Nome padrão em muitos scripts locais,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function updateDatabaseSchema() {
    try {
        const connection = await pool.getConnection();

        // Tabela original (caso não exista, apesar de já existir pelo script Lua)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS mri_duty_logs (
                id int(11) NOT NULL AUTO_INCREMENT,
                job varchar(50) DEFAULT NULL,
                player_name varchar(100) DEFAULT NULL,
                citizenid varchar(50) DEFAULT NULL,
                grade varchar(50) DEFAULT NULL,
                discord_id varchar(50) DEFAULT NULL,
                status varchar(50) DEFAULT NULL,
                duration int(11) DEFAULT 0,
                created_at timestamp NULL DEFAULT current_timestamp(),
                PRIMARY KEY (id),
                KEY job_idx (job),
                KEY created_at_idx (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Adicionar colunas de pausa se não existirem
        const [columns] = await connection.query(`SHOW COLUMNS FROM mri_duty_logs LIKE 'paused_at'`);
        if (columns.length === 0) {
            await connection.query(`ALTER TABLE mri_duty_logs ADD COLUMN paused_at timestamp NULL DEFAULT NULL`);
            await connection.query(`ALTER TABLE mri_duty_logs ADD COLUMN total_pause_time int(11) DEFAULT 0`);
            console.log('[Banco de Dados] Colunas de pausa adicionadas com sucesso à tabela mri_duty_logs.');
        }

        // Adicionar coluna para armazenar o ID da mensagem do Webhook para edições
        const [msgIds] = await connection.query(`SHOW COLUMNS FROM mri_duty_logs LIKE 'message_id'`);
        if (msgIds.length === 0) {
            await connection.query(`ALTER TABLE mri_duty_logs ADD COLUMN message_id varchar(100) DEFAULT NULL`);
            console.log('[Banco de Dados] Coluna message_id adicionada com sucesso à tabela mri_duty_logs.');
        }

        // Tabela de usuários para bot de ponto (Discord -> Passaporte)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS mri_users (
                discord_id varchar(50) NOT NULL,
                citizenid varchar(50) NOT NULL,
                name varchar(100) DEFAULT NULL,
                grade varchar(50) DEFAULT NULL,
                guild_id varchar(50) NOT NULL DEFAULT 'NOT_SET',
                created_at timestamp NULL DEFAULT current_timestamp(),
                PRIMARY KEY (discord_id, guild_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Adicionar a coluna grade caso a tabela já exista
        const [userCols] = await connection.query(`SHOW COLUMNS FROM mri_users LIKE 'grade'`);
        if (userCols.length === 0) {
            await connection.query(`ALTER TABLE mri_users ADD COLUMN grade varchar(50) DEFAULT NULL`);
            console.log('[Banco de Dados] Coluna grade adicionada com sucesso à tabela mri_users.');
        }

        // Tabela mri_orgs_config para webhooks (caso não tenha o script original do FiveM rodando)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS mri_orgs_config (
                job_name varchar(50) NOT NULL,
                guild_id varchar(50) NOT NULL DEFAULT 'NOT_SET',
                webhook text DEFAULT NULL,
                report_webhook text DEFAULT NULL,
                panel_channel_id varchar(50) DEFAULT NULL,
                report_channel_id varchar(50) DEFAULT NULL,
                min_grade int(11) DEFAULT 0,
                log_title varchar(255) DEFAULT NULL,
                color varchar(50) DEFAULT NULL,
                icon_url text DEFAULT NULL,
                PRIMARY KEY (job_name, guild_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // ================= ADIÇÃO DE COLUNAS GUILD_ID RETROATIVAS =================
        const [dutyCols] = await connection.query(`SHOW COLUMNS FROM mri_duty_logs LIKE 'guild_id'`);
        if (dutyCols.length === 0) {
            await connection.query(`ALTER TABLE mri_duty_logs ADD COLUMN guild_id varchar(50) NOT NULL DEFAULT 'NOT_SET'`);
            console.log('[Banco de Dados] Coluna guild_id adicionada à tabela mri_duty_logs.');
        }

        const [usrCols2] = await connection.query(`SHOW COLUMNS FROM mri_users LIKE 'guild_id'`);
        if (usrCols2.length === 0) {
            await connection.query(`ALTER TABLE mri_users ADD COLUMN guild_id varchar(50) NOT NULL DEFAULT 'NOT_SET'`);
            // Se existia pk antiga, recriar
            await connection.query(`ALTER TABLE mri_users DROP PRIMARY KEY, ADD PRIMARY KEY (discord_id, guild_id)`);
            console.log('[Banco de Dados] Coluna guild_id adicionada à tabela mri_users.');
        }

        const [orgCols] = await connection.query(`SHOW COLUMNS FROM mri_orgs_config LIKE 'guild_id'`);
        if (orgCols.length === 0) {
            await connection.query(`ALTER TABLE mri_orgs_config ADD COLUMN guild_id varchar(50) NOT NULL DEFAULT 'NOT_SET'`);
            await connection.query(`ALTER TABLE mri_orgs_config DROP PRIMARY KEY, ADD PRIMARY KEY (job_name, guild_id)`);
            console.log('[Banco de Dados] Coluna guild_id adicionada à tabela mri_orgs_config.');
        }

        const [panelCols] = await connection.query(`SHOW COLUMNS FROM mri_orgs_config LIKE 'panel_channel_id'`);
        if (panelCols.length === 0) {
            await connection.query(`ALTER TABLE mri_orgs_config ADD COLUMN panel_channel_id varchar(50) DEFAULT NULL`);
            console.log('[Banco de Dados] Coluna panel_channel_id adicionada à tabela mri_orgs_config.');
        }

        const [reportCols] = await connection.query(`SHOW COLUMNS FROM mri_orgs_config LIKE 'report_channel_id'`);
        if (reportCols.length === 0) {
            await connection.query(`ALTER TABLE mri_orgs_config ADD COLUMN report_channel_id varchar(50) DEFAULT NULL`);
            console.log('[Banco de Dados] Coluna report_channel_id adicionada à tabela mri_orgs_config.');
        }

        connection.release();
        console.log('[Banco de Dados] Conexão estabelecida e estrutura atualizada conectada.');
    } catch (error) {
        console.error('[Banco de Dados] Erro ao conectar ou atualizar as tabelas:', error);
    }
}

updateDatabaseSchema();

module.exports = pool;
