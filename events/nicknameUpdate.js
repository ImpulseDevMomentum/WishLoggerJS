const fs = require('fs');
const { currentDateTime } = require('../utils/imports');

const NICKNAME_HISTORY_FILE = "nicknames.json";
const MAX_HISTORY_ENTRIES = 6;

function loadNicknameHistory() {
    try {
        if (fs.existsSync(NICKNAME_HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(NICKNAME_HISTORY_FILE, 'utf8'));
        }
        return {};
    } catch (error) {
        console.error('Error loading nickname history:', error);
        return {};
    }
}

function saveNicknameHistory(state) {
    try {
        fs.writeFileSync(NICKNAME_HISTORY_FILE, JSON.stringify(state, null, 4));
    } catch (error) {
        console.error('Error saving nickname history:', error);
    }
}

async function updateNicknameHistory(oldMember, newMember) {
    if (oldMember.nickname !== newMember.nickname) {
        const guildId = newMember.guild.id.toString();
        const userId = newMember.id.toString();
        const state = loadNicknameHistory();

        if (!state[guildId]) {
            state[guildId] = {};
        }

        if (!state[guildId][userId]) {
            state[guildId][userId] = [];
        }

        const oldNick = oldMember.nickname || oldMember.user.username;
        const newNick = newMember.nickname || newMember.user.username;

        state[guildId][userId].push({
            old_nick: oldNick,
            new_nick: newNick,
            changed_at: currentDateTime()
        });

        saveNicknameHistory(state);
    }
}

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        await updateNicknameHistory(oldMember, newMember);
    }
}; 