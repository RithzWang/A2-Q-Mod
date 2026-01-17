const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField, 
    Partials,
    ActivityType, // <--- 1. Added this import
    // V2 Imports
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');

const keep_alive = require('./keep_alive.js'); // Ensure this file exists
const config = require('./config.json');

// --- CLIENT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel]
});

// --- READY EVENT ---
// 2. Changed 'clientReady' to 'ready'
client.once('ready', () => {
    console.log(`🛡️  AutoMod is active as ${client.user.tag}`);
    console.log(`📝 Logging to channel ID: ${config.logChannelId}`);

    client.user.setPresence({
        activities: [{ 
            name: 'customstatus', 
            type: ActivityType.Custom, 
            state: `⚠️ Be Careful` 
        }],
        status: 'dnd'
    });
}); // <--- 3. Removed the extra }); that was here before

// --- AUTOMOD LOGIC ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // IGNORE ADMINS/STAFF
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
        message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return;
    }

    const content = message.content.toLowerCase();
    let violation = null;
    let userWarning = "";
    let color = 0x888888; 

    // A: ANTI-MENTION
    const mentionRegex = /@(everyone|here)/;
    if (mentionRegex.test(message.content)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
            violation = "Illegal Mention";
            userWarning = config.messages.mention;
            color = 0xED4245; 
        }
    }

    // B: ANTI-INVITE
    const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;
    if (!violation && inviteRegex.test(message.content)) {
        violation = "Server Invite";
        userWarning = config.messages.invite;
        color = 0xFEE75C; 
    }

    // C: BAD WORDS
    if (!violation && config.badWords.length > 0) {
        const foundBadWord = config.badWords.some(word => content.includes(word));
        if (foundBadWord) {
            violation = "Profanity";
            userWarning = config.messages.badword;
            color = 0x5865F2; 
        }
    }

    // PUNISHMENT
    if (violation) {
        try {
            const originalContent = message.content;
            const author = message.author;
            const channel = message.channel;

            if (message.deletable) {
                await message.delete();
            }

            const warningMsg = await channel.send(`${author} ${userWarning}`);
            setTimeout(() => warningMsg.delete().catch(() => {}), 5000);

            const logChannel = client.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const container = new ContainerBuilder().setAccentColor(color);

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
// Make sure your token is actually in process.env.TOKEN
// If it is in config.json, change this to: client.login(config.token);
client.login(process.env.TOKEN);
