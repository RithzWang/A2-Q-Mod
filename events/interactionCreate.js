const { 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder 
} = require('discord.js');
const GuildSettings = require('../schemas/GuildSettings');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // 1. Handle Chat Commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (command) await command.execute(interaction);
        }

        const guildId = interaction.guild.id;

        // 2. Handle "Add Bad Word" Button -> SHOW MODAL
        if (interaction.isButton() && interaction.customId === 'setup_addword_btn') {
            const modal = new ModalBuilder()
                .setCustomId('setup_addword_modal')
                .setTitle('Add Forbidden Word');

            const wordInput = new TextInputBuilder()
                .setCustomId('word_input')
                .setLabel("Type the word to block")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(wordInput));
            
            await interaction.showModal(modal);
        }

        // 3. Handle Modal Submit -> SAVE WORD
        if (interaction.isModalSubmit() && interaction.customId === 'setup_addword_modal') {
            const word = interaction.fields.getTextInputValue('word_input').toLowerCase();
            
            const settings = await GuildSettings.findOne({ guildId });
            if (settings && !settings.badWordsList.includes(word)) {
                settings.badWordsList.push(word);
                await settings.save();
            }

            // Acknowledge and Refresh Dashboard
            // Since we can't "update" a modal into a dashboard easily, we just edit the original message if possible
            // OR we just send a new ephemeral confirmation
            await interaction.deferUpdate(); // Close the modal loading state
            
            // To refresh the dashboard behind the modal, we need to call the setup logic again
            // But usually, the user has to click "Refresh" or we rely on the next interaction.
            // A simple trick is to follow up:
            await interaction.followUp({ content: `✅ Added **${word}**`, ephemeral: true });
        }

        // 4. Handle "Clear Words" Button
        if (interaction.isButton() && interaction.customId === 'setup_clearwords_btn') {
            await GuildSettings.findOneAndUpdate({ guildId }, { badWordsList: [] });
            await require('../commands/setup').execute(interaction); // Refresh
        }

        // 5. Handle Refresh Button
        if (interaction.isButton() && interaction.customId === 'setup_refresh') {
            await require('../commands/setup').execute(interaction);
        }

        // 6. Handle Toggles (Select Menu)
        if (interaction.isStringSelectMenu() && interaction.customId === 'setup_toggle') {
            const settingKey = interaction.values[0];
            const settings = await GuildSettings.findOne({ guildId });
            if (settings) {
                settings[settingKey] = !settings[settingKey];
                await settings.save();
                await require('../commands/setup').execute(interaction);
            }
        }

        // 7. Handle Channel Select
        if (interaction.isChannelSelectMenu() && interaction.customId === 'setup_channel') {
            await GuildSettings.findOneAndUpdate({ guildId }, { logChannelId: interaction.values[0] });
            await require('../commands/setup').execute(interaction);
        }
    },
};
