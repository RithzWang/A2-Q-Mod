const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const mongoose = require('mongoose'); // <--- Import Mongoose
require('./keep_alive.js'); 
// const config = require('./config.json'); // On Render, use Environment Variables instead!

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

// --- 1. LOAD COMMANDS ---
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

// --- 2. LOAD EVENTS ---
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

// --- 3. CONNECT TO DATABASE & START ---
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Connect to MongoDB
    if (!process.env.MONGO_URI) return console.log('❌ Missing MONGO_URI in Render Environment Variables');
    
    await mongoose.connect(process.env.MONGO_URI).then(() => {
        console.log('✅ Connected to MongoDB');
    }).catch((err) => {
        console.log('❌ MongoDB Connection Error:', err);
    });

    // Deploy Commands
    try {
        console.log('Refreshing slash commands...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered commands.');
    } catch (error) {
        console.error(error);
    }
});

client.login(process.env.TOKEN);
