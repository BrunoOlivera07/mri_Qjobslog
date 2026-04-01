require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.buttons = new Collection();

// Carregar comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

// Carregar lógicas de ponto
const { handlePontoButton } = require('./utils/pointLogic');

// Iniciar Motor da API Web do Dashboard SaaS
const initApi = require('./api/index.js');

client.once('ready', () => {
    console.log(`[Bot] Conectado como ${client.user.tag}`);
    // Inicia a API Web depois que o Client Discord está pronto
    initApi(client);
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction);
        } else if (interaction.isButton()) {
            // Verifica se é um botão do sistema de ponto (inicia com ponto_)
            if (interaction.customId.startsWith('ponto_')) {
                await handlePontoButton(interaction);
            }
        }
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Ocorreu um erro ao executar isso!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Ocorreu um erro ao executar isso!', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
