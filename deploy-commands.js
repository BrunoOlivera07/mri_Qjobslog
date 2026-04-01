const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[AVISO] O comando em ${file} não possui "data" ou "execute" obrigatórios.`);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Iniciando o deploy de ${commands.length} comandos slash (/) na API do Discord...`);

        // Use Routes.applicationCommands(clientId) para registrar globalmente, ou applicationGuildCommands(clientId, guildId) para um server específico.
        const clientId = process.env.CLIENT_ID;
        const guildId = process.env.GUILD_ID;
        
        let data;
        if (guildId) {
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            console.log(`Sucesso: ${data.length} comandos registrados no servidor (Guild ID: ${guildId}).`);
        } else {
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            console.log(`Sucesso: ${data.length} comandos registrados globalmente.`);
        }
    } catch (error) {
        console.error(error);
    }
})();
