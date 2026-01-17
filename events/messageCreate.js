const { PermissionsBitField, EmbedBuilder, ContainerBuilder, SectionBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // Load Settings for THIS specific guild
        const settings = db.getGuild(message.guild.id);

        // Ignore Admins
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        let violation = null;
        let violationColor = 0x888888;

        // 1. Anti-Invite
        if (settings.antiInvite) {
            const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;
            if (inviteRegex.test(message.content)) {
                violation = "Server Invite";
                violationColor = 0xFEE75C;
            }
        }

        // 2. Anti-Mention
        if (!violation && settings.antiMention) {
            const mentionRegex = /@(everyone|here)/;
            if (mentionRegex.test(message.content) && !message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
                violation = "Illegal Mention";
                violationColor = 0xED4245;
            }
        }

        // 3. Bad Words
        if (!violation && settings.antiBadWords) {
            const content = message.content.toLowerCase();
            const words = settings.badWordsList || [];
            if (words.some(w => content.includes(w))) {
                violation = "Profanity";
                violationColor = 0x5865F2;
            }
        }

        // --- PUNISH ---
        if (violation) {
            try {
                if (message.deletable) await message.delete();

                const warning = await message.channel.send(`⛔ ${message.author}, **${violation}** is disabled on this server.`);
                setTimeout(() => warning.delete().catch(() => {}), 5000);

                // Log if channel is set
                if (settings.logChannelId) {
                    const logChannel = message.guild.channels.cache.get(settings.logChannelId);
                    if (logChannel) {
                        const container = new ContainerBuilder().setAccentColor(violationColor);
                        const section = new SectionBuilder()
                            .addTextDisplayComponents(t => t.setContent(`### 🛡️ AutoMod: ${violation}`))
                            .addTextDisplayComponents(t => t.setContent(`**User:** ${message.author}\n**Content:** \`${message.content}\``))
                            .setThumbnailAccessory(thumb => thumb.setURL(message.author.displayAvatarURL()));
                        
                        container.addSectionComponents(section);
                        await logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
                    }
                }
            } catch (e) { console.error(e); }
        }
    },
};
