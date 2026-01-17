const { Events } = require('discord.js');
const GuildSettings = require('../schemas/GuildSettings'); // <--- Import Schema

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try { await command.execute(interaction); } catch (error) { console.error(error); }
        }

        // --- DASHBOARD LOGIC ---
        if (interaction.isStringSelectMenu() && interaction.customId === 'setup_toggle') {
            const guildId = interaction.guild.id;
            const settingKey = interaction.values[0]; 
            
            // Find, Update, Save
            const settings = await GuildSettings.findOne({ guildId });
            if (settings) {
                settings[settingKey] = !settings[settingKey]; // Toggle
                await settings.save();
                
                // Re-render dashboard
                // (We manually import the helper from setup command or just rerun execute)
                // For simplicity, we assume you copied sendDashboard logic or required the command:
                await require('../commands/setup').execute(interaction); 
            }
        }

        if (interaction.isChannelSelectMenu() && interaction.customId === 'setup_channel') {
            const guildId = interaction.guild.id;
            const channelId = interaction.values[0];
            
            await GuildSettings.findOneAndUpdate({ guildId }, { logChannelId: channelId });
            await require('../commands/setup').execute(interaction);
        }
    },
};
