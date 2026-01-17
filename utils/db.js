const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.json');

// Default settings for a new server
const defaultSettings = {
    antiInvite: false,
    antiMention: false,
    antiBadWords: false,
    logChannelId: null,
    badWordsList: ['badword1', 'swearword']
};

function loadDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}, null, 4));
        return {};
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
}

module.exports = {
    getGuild: (guildId) => {
        const data = loadDB();
        if (!data[guildId]) {
            data[guildId] = { ...defaultSettings };
            saveDB(data);
        }
        return data[guildId];
    },
    updateGuild: (guildId, key, value) => {
        const data = loadDB();
        if (!data[guildId]) data[guildId] = { ...defaultSettings };
        
        data[guildId][key] = value;
        saveDB(data);
        return data[guildId];
    }
};
