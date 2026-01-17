const mongoose = require('mongoose');

const GuildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    antiInvite: { type: Boolean, default: false },
    antiMention: { type: Boolean, default: false },
    antiBadWords: { type: Boolean, default: false },
    logChannelId: { type: String, default: null },
    badWordsList: { type: [String], default: ['badword1', 'swearword'] }
});

module.exports = mongoose.model('GuildSettings', GuildSettingsSchema);
