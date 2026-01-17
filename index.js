const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const config = require('./config.json'); // Your Token

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Deploy Commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN || config.token); // Use config.token if no env
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
        console.log('Refreshing slash commands...');
        // Registers commands globally (might take 1 hour) or to a specific guild (instant)
        // For testing, just use global:
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered commands.');
    } catch (error) {
        console.error(error);
    }
});

client.login(process.env.TOKEN || config.token);
