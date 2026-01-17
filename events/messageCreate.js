const { PermissionsBitField, ContainerBuilder, SectionBuilder, MessageFlags } = require('discord.js');
const GuildSettings = require('../schemas/GuildSettings'); // <--- Import Schema

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // 1. Load Settings (Async)
        let settings = await GuildSettings.findOne({ guildId: message.guild.id });
        if (!settings) return; // If setup was never run, do nothing (or use defaults)

        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        let violation = null;
        let violationColor = 0x888888;

        // Anti-Invite
        if (settings.antiInvite) {
            const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;
            if (inviteRegex.test(message.content)) {
                violation = "Server Invite";
                violationColor = 0xFEE75C;
            }
        }

        // Anti-Mention
        if (!violation && settings.antiMention) {
            const mentionRegex = /@(everyone|here)/;
            if (mentionRegex.test(message.content) && !message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
                violation = "Illegal Mention";
                violationColor = 0xED4245;
            }
        }

        // Bad Words
        if (!violation && settings.antiBadWords) {
            const content = message.content.toLowerCase();
            if (settings.badWordsList.some(w => content.includes(w))) {
                violation = "Profanity";
                violationColor = 0x5865F2;
            }
        }

        // Punish
        if (violation) {
            try {
                if (message.deletable) await message.delete();
                const warning = await message.channel.send(`⛔ ${message.author}, **${violation}** is disabled on this server.`);
                setTimeout(() => warning.delete().catch(() => {}), 5000);

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
