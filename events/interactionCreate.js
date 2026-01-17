const { Events } = require('discord.js');
const db = require('../utils/db');
// Import the dashboard renderer function logic (We can duplicate it or export it. 
// For simplicity, I will re-implement the db update logic here effectively)

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle Chat Commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
            }
        }

        // Handle Dashboard Menus
        if (interaction.isStringSelectMenu() && interaction.customId === 'setup_toggle') {
            const guildId = interaction.guild.id;
            const settingKey = interaction.values[0]; // 'antiInvite', etc.
            
            const currentSettings = db.getGuild(guildId);
            const newValue = !currentSettings[settingKey]; // Toggle true/false
            
            db.updateGuild(guildId, settingKey, newValue);

            // Re-run the command logic to refresh the dashboard
            const command = interaction.client.commands.get('setup');
            // We trick the command into thinking it's a "dashboard" request
            // Ideally you export the sendDashboard function, but triggering execute works if structured right.
            // For now, let's reply manually or require the setup file
            await require('../commands/setup').execute(interaction);
        }

        if (interaction.isChannelSelectMenu() && interaction.customId === 'setup_channel') {
            const guildId = interaction.guild.id;
            const channelId = interaction.values[0];
            
            db.updateGuild(guildId, 'logChannelId', channelId);
            await require('../commands/setup').execute(interaction);
        }
    },
};
