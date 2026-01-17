const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField, 
    EmbedBuilder, 
    Partials 
} = require('discord.js');

const config = require('./config.json');

// --- CLIENT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // CRITICAL: Needed to read messages
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

    // 2. IGNORE ADMINS (Admins/Staff can do anything)
    // We check for Administrator permission OR "Manage Messages"
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
        message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return;
    }

    const content = message.content.toLowerCase();
    let violation = null;
    let userWarning = "";

    // ============================================
    // CHECK A: ANTI-MENTION (@everyone / @here)
    // ============================================
    const mentionRegex = /@(everyone|here)/;
    if (mentionRegex.test(message.content)) {
        // Check if they specifically lack the permission to ping everyone
        if (!message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
            violation = "Illegal Mention";
            userWarning = config.messages.mention;
        }
    }

    // ============================================
    // CHECK B: ANTI-INVITE (Discord Links)
    // ============================================
    const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;
    if (!violation && inviteRegex.test(message.content)) {
        violation = "Server Invite";
        userWarning = config.messages.invite;
    }

    // ============================================
    // CHECK C: BAD WORDS
    // ============================================
    if (!violation && config.badWords.length > 0) {
        const foundBadWord = config.badWords.some(word => content.includes(word.toLowerCase()));
        if (foundBadWord) {
            violation = "Profanity";
            userWarning = config.messages.badword;
        }
    }

    // ============================================
    // ⛔ EXECUTE PUNISHMENT
    // ============================================
    if (violation) {
        try {
            // 1. Save content for the log
            const originalContent = message.content;
            const author = message.author;
            const channel = message.channel;

            // 2. Delete the bad message
            if (message.deletable) {
                await message.delete();
            }

            // 3. Send Temporary Warning to Chat
            const warningMsg = await channel.send(`${author} ${userWarning}`);
            setTimeout(() => warningMsg.delete().catch(() => {}), 5000);

            // 4. Send LOG to Staff Channel
            const logChannel = client.channels.cache.get(config.logChannelId);
            if (logChannel) {
                // Determine Color based on severity
                let color = 0xFEE75C; // Yellow (Default)
                if (violation === "Server Invite") color = 0xE67E22; // Orange
                if (violation === "Illegal Mention") color = 0xED4245; // Red

                const embed = new EmbedBuilder()
                    .setTitle(`🛡️ AutoMod: ${violation}`)
                    .setColor(color)
                    .setThumbnail(author.displayAvatarURL())
                    .addFields(
                        { name: 'User', value: `${author} (\`${author.id}\`)`, inline: true },
                        { name: 'Channel', value: `${channel}`, inline: true },
                        { name: 'Content', value: `\`\`\`${originalContent}\`\`\`` }
                    )
                    .setFooter({ text: 'Action: Message Deleted' })
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error(`Failed to handle violation (${violation}):`, error);
        }
    }
});

// --- LOGIN ---
client.login(process.env.TOKEN);
