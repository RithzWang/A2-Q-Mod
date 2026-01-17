const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField, 
    Partials,
    // V2 Imports
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');

const config = require('./config.json');

// --- CLIENT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // CRITICAL
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel]
});

// --- READY EVENT ---
client.once('ready', () => {
    console.log(`🛡️  AutoMod is active as ${client.user.tag}`);
    console.log(`📝 Logging to channel ID: ${config.logChannelId}`);
});

// --- AUTOMOD LOGIC ---
client.on('messageCreate', async (message) => {
    // 1. Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    // 2. IGNORE ADMINS/STAFF
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
        message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return;
    }

    const content = message.content.toLowerCase();
    let violation = null;
    let userWarning = "";
    let color = 0x888888; // Default Gray

    // ============================================
    // CHECK A: ANTI-MENTION (@everyone / @here)
    // ============================================
    const mentionRegex = /@(everyone|here)/;
    if (mentionRegex.test(message.content)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
            violation = "Illegal Mention";
            userWarning = config.messages.mention;
            color = 0xED4245; // 🔴 Red
        }
    }

    // ============================================
    // CHECK B: ANTI-INVITE (Discord Links)
    // ============================================
    const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;
    if (!violation && inviteRegex.test(message.content)) {
        violation = "Server Invite";
        userWarning = config.messages.invite;
        color = 0xFEE75C; // 🟠 Orange/Yellow
    }

    // ============================================
    // CHECK C: BAD WORDS
    // ============================================
    if (!violation && config.badWords.length > 0) {
        const foundBadWord = config.badWords.some(word => content.includes(word));
        if (foundBadWord) {
            violation = "Profanity";
            userWarning = config.messages.badword;
            color = 0x5865F2; // 🔵 Blue
        }
    }

    // ============================================
    // ⛔ EXECUTE PUNISHMENT
    // ============================================
    if (violation) {
        try {
            const originalContent = message.content;
            const author = message.author;
            const channel = message.channel;

            // 1. Delete the bad message
            if (message.deletable) {
                await message.delete();
            }

            // 2. Send Temporary Warning to Chat
            const warningMsg = await channel.send(`${author} ${userWarning}`);
            setTimeout(() => warningMsg.delete().catch(() => {}), 5000);

            // 3. Send CONTAINER Log to Staff Channel
            const logChannel = client.channels.cache.get(config.logChannelId);
            if (logChannel) {
                
                const container = new ContainerBuilder()
                    .setAccentColor(color);

                // Create Section with Info and Avatar
                const section = new SectionBuilder()
                    .addTextDisplayComponents((text) => 
                        text.setContent(`### 🛡️ AutoMod: ${violation}`)
                    )
                    .addTextDisplayComponents((text) => 
                        text.setContent(
                            `**User:** ${author} (\`${author.id}\`)\n` +
                            `**Channel:** ${channel}\n` +
                            `**Content:** \`${originalContent}\``
                        )
                    )
                    .setThumbnailAccessory((thumb) =>
                        thumb.setURL(author.displayAvatarURL())
                    );

                container.addSectionComponents(section);

                await logChannel.send({ 
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 
                });
            }

        } catch (error) {
            console.error(`Failed to handle violation (${violation}):`, error);
        }
    }
});

// --- LOGIN ---
client.login(process.env.TOKEN);
