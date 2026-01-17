const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    MessageFlags,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

const GuildSettings = require('../schemas/GuildSettings'); // <--- Import Schema

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure the AutoMod system')
        .addSubcommand(sub => sub.setName('dashboard').setDescription('View and edit AutoMod settings'))
        .addSubcommand(sub => 
            sub.setName('badword').setDescription('Add a word to the blocklist')
            .addStringOption(opt => opt.setName('word').setDescription('Word to block').setRequired(true))
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        // 1. Fetch or Create Settings (Async)
        let settings = await GuildSettings.findOne({ guildId });
        if (!settings) {
            settings = await GuildSettings.create({ guildId });
        }

        const subcommand = interaction.options.getSubcommand();

        // --- SUBCOMMAND: ADD BAD WORD ---
        if (subcommand === 'badword') {
            const word = interaction.options.getString('word').toLowerCase();
            if (!settings.badWordsList.includes(word)) {
                settings.badWordsList.push(word);
                await settings.save(); // <--- Must Save
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
    
    // Container
    const container = new ContainerBuilder().setAccentColor(0x5865F2);

    container.addSectionComponents(new SectionBuilder()
        .addTextDisplayComponents(t => t.setContent('# 🛡️ AutoMod Dashboard'))
        .addTextDisplayComponents(t => t.setContent('Use the menu below to toggle modules on or off.'))
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    // Status Section
    const statusSection = new SectionBuilder();
    const getStatus = (isEnabled) => isEnabled ? '✅ **Active**' : '🔴 **Disabled**';

    statusSection.addTextDisplayComponents(t => t.setContent(`### 🔗 Anti-Invite\n${getStatus(settings.antiInvite)}`));
    statusSection.addTextDisplayComponents(t => t.setContent(`### 📢 Anti-Mention\n${getStatus(settings.antiMention)}`));
    statusSection.addTextDisplayComponents(t => t.setContent(`### 🤬 Anti-BadWords\n${getStatus(settings.antiBadWords)}`));
    
    const logChannelName = settings.logChannelId ? `<#${settings.logChannelId}>` : 'Not Set';
    statusSection.addTextDisplayComponents(t => t.setContent(`### 📝 Log Channel\n${logChannelName}`));
    container.addSectionComponents(statusSection);

    // Menus
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
