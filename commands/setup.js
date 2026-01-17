const { 
    SlashCommandBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    MessageFlags,
    ContainerBuilder,
    ButtonStyle,
    ButtonBuilder, // <--- 👈 I ADDED THIS (It was missing)
    ActionRowBuilder
} = require('discord.js');

const GuildSettings = require('../schemas/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Open the Advanced AutoMod Dashboard'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        // 1. Fetch/Create Settings
        let settings = await GuildSettings.findOne({ guildId });
        if (!settings) {
            settings = await GuildSettings.create({ guildId });
        }

        // 2. Send Dashboard
        // We use ephemeral so only the admin sees it
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await sendDashboard(interaction, settings);
    }
};

// --- HELPER: RENDER DASHBOARD ---
async function sendDashboard(interaction, settings) {
    const isUpdate = interaction.isMessageComponent(); 
    
    const getStatus = (isEnabled) => isEnabled ? '✅ **Active**' : '🔴 **Disabled**';
    const logChannelName = settings.logChannelId ? `<#${settings.logChannelId}>` : 'Not Set';
    const wordCount = settings.badWordsList.length;

    const container = new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents((text) =>
            text.setContent('# 🛡️ AutoMod Dashboard')
        )
        // Status Section
        .addSectionComponents((section) => 
            section
                .addTextDisplayComponents((text) =>
                    text.setContent(
                        `### Current Status\n` +
                        `**Anti-Invite:** ${getStatus(settings.antiInvite)}\n` +
                        `**Anti-Mention:** ${getStatus(settings.antiMention)}\n` +
                        `**Bad Words:** ${getStatus(settings.antiBadWords)} (${wordCount} words)\n` +
                        `**Log Channel:** ${logChannelName}`
                    )
                )
                // REFRESH BUTTON
                .setButtonAccessory((btn) => 
                    btn.setCustomId('setup_refresh')
                       .setLabel('Refresh')
                       .setStyle(ButtonStyle.Secondary)
                )
        )
        .addSeparatorComponents((sep) => sep)
        // TOGGLE MENU
        .addActionRowComponents((row) => 
            row.setComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('setup_toggle')
                    .setPlaceholder('🔻 Toggle Modules')
                    .addOptions(
                        new StringSelectMenuOptionBuilder().setLabel('Anti-Invite').setValue('antiInvite').setEmoji('🔗'),
                        new StringSelectMenuOptionBuilder().setLabel('Anti-Mention').setValue('antiMention').setEmoji('📢'),
                        new StringSelectMenuOptionBuilder().setLabel('Bad Words').setValue('antiBadWords').setEmoji('🤬')
                    )
            )
        )
        // CHANNEL MENU
        .addActionRowComponents((row) => 
            row.setComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('setup_channel')
                    .setPlaceholder('📝 Select Log Channel')
                    .setChannelTypes(ChannelType.GuildText)
            )
        )
        // ADD BAD WORD BUTTONS
        .addActionRowComponents((row) => 
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('setup_addword_btn')
                    .setLabel('➕ Add Bad Word')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('setup_clearwords_btn')
                    .setLabel('🗑️ Clear All Words')
                    .setStyle(ButtonStyle.Danger)
            )
        );

    const payload = {
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    };

    if (isUpdate) {
        await interaction.update(payload);
    } else {
        await interaction.editReply(payload);
    }
}
