const { 
    SlashCommandBuilder, 
    PermissionsBitField, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    MessageFlags,
    // V2 Components
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure the AutoMod system')
        .addSubcommand(sub => 
            sub.setName('dashboard').setDescription('View and edit AutoMod settings')
        )
        .addSubcommand(sub => 
            sub.setName('badword').setDescription('Add a word to the blocklist')
            .addStringOption(opt => opt.setName('word').setDescription('Word to block').setRequired(true))
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const settings = db.getGuild(guildId);
        const subcommand = interaction.options.getSubcommand();

        // --- SUBCOMMAND: ADD BAD WORD ---
        if (subcommand === 'badword') {
            const word = interaction.options.getString('word').toLowerCase();
            const currentList = settings.badWordsList || [];
            if (!currentList.includes(word)) {
                currentList.push(word);
                db.updateGuild(guildId, 'badWordsList', currentList);
                return interaction.reply({ content: `✅ Added **${word}** to the blocklist.`, flags: MessageFlags.Ephemeral });
            }
            return interaction.reply({ content: `⚠️ **${word}** is already blocked.`, flags: MessageFlags.Ephemeral });
        }

        // --- SUBCOMMAND: DASHBOARD ---
        if (subcommand === 'dashboard') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await sendDashboard(interaction, settings);
        }
    }
};

// --- HELPER: RENDER DASHBOARD ---
async function sendDashboard(interaction, settings) {
    const isUpdate = interaction.isStringSelectMenu() || interaction.isChannelSelectMenu();
    
    // 1. Build the Container
    const container = new ContainerBuilder()
        .setAccentColor(0x5865F2); // Blurple

    // Header
    container.addSectionComponents(new SectionBuilder()
        .addTextDisplayComponents(t => t.setContent('# 🛡️ AutoMod Dashboard'))
        .addTextDisplayComponents(t => t.setContent('Use the menu below to toggle modules on or off.'))
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    // Status Section
    const statusSection = new SectionBuilder();
    
    // Helper to format status text
    const getStatus = (isEnabled) => isEnabled ? '✅ **Active**' : '🔴 **Disabled**';

    statusSection.addTextDisplayComponents(t => t.setContent(`### 🔗 Anti-Invite\n${getStatus(settings.antiInvite)}`));
    statusSection.addTextDisplayComponents(t => t.setContent(`### 📢 Anti-Mention\n${getStatus(settings.antiMention)}`));
    statusSection.addTextDisplayComponents(t => t.setContent(`### 🤬 Anti-BadWords\n${getStatus(settings.antiBadWords)}`));
    
    const logChannelName = settings.logChannelId ? `<#${settings.logChannelId}>` : 'Not Set';
    statusSection.addTextDisplayComponents(t => t.setContent(`### 📝 Log Channel\n${logChannelName}`));

    container.addSectionComponents(statusSection);

    // 2. Build Interactive Menus (Select Menu)
    const toggleMenu = new StringSelectMenuBuilder()
        .setCustomId('setup_toggle')
        .setPlaceholder('Toggle a Module...')
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Toggle Anti-Invite').setValue('antiInvite').setEmoji('🔗'),
            new StringSelectMenuOptionBuilder().setLabel('Toggle Anti-Mention').setValue('antiMention').setEmoji('📢'),
            new StringSelectMenuOptionBuilder().setLabel('Toggle Bad Words').setValue('antiBadWords').setEmoji('🤬')
        );

    const channelMenu = new ChannelSelectMenuBuilder()
        .setCustomId('setup_channel')
        .setPlaceholder('Select Log Channel...')
        .setChannelTypes(ChannelType.GuildText);

    const row1 = new ActionRowBuilder().addComponents(toggleMenu);
    const row2 = new ActionRowBuilder().addComponents(channelMenu);

    // 3. Send/Update Message
    const payload = {
        content: '',
        components: [container, row1, row2],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    };

    if (isUpdate) {
        await interaction.update(payload);
    } else {
        await interaction.editReply(payload);
    }
}
