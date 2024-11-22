const { EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadServerLogsChannelId, currentDateTime } = require('../utils/imports');

class EmojiEvents {
    constructor(client) {
        this.client = client;
    }

    async handleEmojiUpdate(guild, oldEmojis, newEmojis) {
        try {
            const channelLogId = await loadServerLogsChannelId(guild.id);
            const logsChannel = guild.channels.cache.get(channelLogId);
            
            if (!logsChannel) return;

            const serverLanguage = await getServerLanguage(guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const addedEmojis = newEmojis.filter(emoji => !oldEmojis.find(e => e.id === emoji.id));
            if (addedEmojis.length > 0) {
                const addedEmojisStr = addedEmojis.map(emoji => `${emoji} (:${emoji.name}:)`).join('\n');
                const auditLogs = await guild.fetchAuditLogs({
                    type: 60,
                    limit: addedEmojis.length
                });

                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.EMOJIS_ADDED_TITLE)
                    .setColor('#00FF00')
                    .addFields(
                        { name: languageStrings.NEW_EMOJIS, value: addedEmojisStr || 'Unknown Emoji', inline: false }
                    );

                for (const emoji of addedEmojis) {
                    const auditEntry = auditLogs.entries.find(entry => entry.target?.id === emoji.id);
                    const user = auditEntry?.executor || 'Unknown';
                    const member = await guild.members.fetch(user.id).catch(() => null);
                    const nickname = member ? member.nickname || user.username : user.username;
                    
                    embed.addFields({
                        name: languageStrings.ADDED_BY,
                        value: user !== 'Unknown' ? `<@${user.id}> (${nickname})` : 'Unknown',
                        inline: false
                    });
                }

                embed.addFields({ name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true });
                await logsChannel.send({ embeds: [embed] });
            }

            const removedEmojis = oldEmojis.filter(emoji => !newEmojis.find(e => e.id === emoji.id));
            if (removedEmojis.length > 0) {
                const removedEmojisStr = removedEmojis.map(emoji => `${emoji}`).join('\n');
                const auditLogs = await guild.fetchAuditLogs({
                    type: 62,
                    limit: removedEmojis.length
                });

                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.EMOJIS_REMOVED_TITLE)
                    .setColor('#FF0000')
                    .addFields(
                        { name: languageStrings.REMOVED_EMOJIS, value: removedEmojisStr || 'Unknown Emoji', inline: false }
                    );

                for (const emoji of removedEmojis) {
                    const auditEntry = auditLogs.entries.find(entry => entry.target?.id === emoji.id);
                    const user = auditEntry?.executor || 'Unknown';
                    const member = await guild.members.fetch(user.id).catch(() => null);
                    const nickname = member ? member.nickname || user.username : user.username;
                    
                    embed.addFields({
                        name: languageStrings.REMOVED_BY,
                        value: user !== 'Unknown' ? `<@${user.id}> (${nickname})` : 'Unknown',
                        inline: false
                    });
                }

                embed.addFields({ name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true });
                await logsChannel.send({ embeds: [embed] });
            }

            const renamedEmojis = oldEmojis.filter(oldEmoji => {
                const newEmoji = newEmojis.find(e => e.id === oldEmoji.id);
                return newEmoji && oldEmoji.name !== newEmoji.name;
            });

            if (renamedEmojis.length > 0) {
                const auditLogs = await guild.fetchAuditLogs({
                    type: 61,
                    limit: renamedEmojis.length
                });

                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.EMOJIS_RENAMED_TITLE)
                    .setColor('#FFA500');

                for (const oldEmoji of renamedEmojis) {
                    const newEmoji = newEmojis.find(e => e.id === oldEmoji.id);
                    const auditEntry = auditLogs.entries.find(entry => entry.target?.id === oldEmoji.id);
                    const user = auditEntry?.executor || 'Unknown';
                    const member = await guild.members.fetch(user.id).catch(() => null);
                    const nickname = member ? member.nickname || user.username : user.username;

                    embed.addFields({
                        name: languageStrings.EMOJI_RENAMED,
                        value: `${oldEmoji} (:${oldEmoji.name}:) ${languageStrings.TO_EMOJI} (:${newEmoji.name}:) ${languageStrings.BY} ${user !== 'Unknown' ? `<@${user.id}> (${nickname})` : 'Unknown'}`,
                        inline: false
                    });
                }

                embed.addFields({ name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true });
                await logsChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in handleEmojiUpdate:', error);
        }
    }
}

module.exports = {
    name: Events.GuildEmojiCreate,
    once: false,
    async execute(emoji) {
        const guild = emoji.guild;
        const emojiEvents = new EmojiEvents(emoji.client);
        await emojiEvents.handleEmojiUpdate(guild, [], [emoji]);
    }
};

module.exports.emojiDelete = {
    name: Events.GuildEmojiDelete,
    once: false,
    async execute(emoji) {
        const guild = emoji.guild;
        const emojiEvents = new EmojiEvents(emoji.client);
        await emojiEvents.handleEmojiUpdate(guild, [emoji], []);
    }
};

module.exports.emojiUpdate = {
    name: Events.GuildEmojiUpdate,
    once: false,
    async execute(oldEmoji, newEmoji) {
        const guild = oldEmoji.guild;
        const emojiEvents = new EmojiEvents(oldEmoji.client);
        await emojiEvents.handleEmojiUpdate(guild, [oldEmoji], [newEmoji]);
    }
};