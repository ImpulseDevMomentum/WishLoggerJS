const { EmbedBuilder, Events, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadReactionLogsChannelId, currentDateTime } = require('../utils/imports');
const { updateStickerEmoji, getStickerEmoji, removeSticker } = require('../utils/stickerCache');

class StickerEvents {
    constructor(client) {
        this.client = client;
    }

    async handleStickerUpdate(guild, oldStickers = [], newStickers = []) {
        try {
            const channelLogId = await loadReactionLogsChannelId(guild.id);
            const logsChannel = guild.channels.cache.get(channelLogId);
            if (!logsChannel) return;

            const serverLanguage = await getServerLanguage(guild.id);
            const languageStrings = JSON.parse(fs.readFileSync(`language/${serverLanguage}.json`, 'utf8'));

            for (const sticker of newStickers.filter(sticker => !oldStickers.some(s => s?.id === sticker.id))) {
                console.log('Processing sticker:', sticker);

                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.StickerCreate,
                    limit: 1
                }).catch(error => {
                    // console.error('Error fetching audit logs:', error);
                    return null;
                });

                // console.log('Fetched audit logs:', auditLogs);
                
                if (!auditLogs) {
                    console.log('No audit logs found');
                    const embed = new EmbedBuilder()
                        .setTitle(languageStrings.STICKER_ADDED_TITLE)
                        .setColor('#00FF00')
                        .addFields(
                            { name: languageStrings.NEW_STICKER, value: sticker.name, inline: false },
                            { name: languageStrings.ADDED_BY, value: 'Unknown', inline: false }
                        )
                        .setImage(sticker.url);

                    await logsChannel.send({ embeds: [embed] });
                    continue;
                }

                const auditEntry = auditLogs.entries.first();
                console.log('Audit entry:', auditEntry);

                let userDisplay = 'Unknown';
                let user = null;

                if (auditEntry && auditEntry.executor) {
                    console.log('Found executor:', auditEntry.executor);
                    user = auditEntry.executor;
                    try {
                        const member = await guild.members.fetch(user.id);
                        const nickname = member ? member.nickname || user.username : user.username;
                        userDisplay = `<@${user.id}> (${nickname})`;
                        // console.log('User info:', userDisplay);
                    } catch (error) {
                        // console.error('Error fetching member:', error);
                        userDisplay = `<@${user.id}> (${user.username})`;
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.STICKER_ADDED_TITLE)
                    .setColor('#00FF00')
                    .addFields(
                        { name: languageStrings.NEW_STICKER, value: sticker.name, inline: false },
                        { name: languageStrings.ADDED_BY, value: userDisplay, inline: false }
                    )
                    .setImage(sticker.url);

                // console.log('Sticker full object:', sticker);
                // console.log('Sticker tags:', sticker.tags);
                // console.log('Sticker format:', sticker.format);
                // console.log('Sticker type:', sticker.type);

                let relatedEmoji = null;

                if (typeof sticker.tags === 'string') {
                    relatedEmoji = sticker.tags;
                } else if (Array.isArray(sticker.tags) && sticker.tags.length > 0) {
                    relatedEmoji = sticker.tags[0];
                } else if (sticker.format === 2) {
                    relatedEmoji = sticker.tags;
                }

                // console.log('Related emoji found:', relatedEmoji);

                if (relatedEmoji) {
                    embed.addFields({
                        name: 'Related Emoji',
                        value: relatedEmoji,
                        inline: false
                    });
                    updateStickerEmoji(guild.id, sticker.id, relatedEmoji);
                }

                if (sticker.description) {
                    embed.addFields({
                        name: languageStrings.DESCRIPTION_STICKER,
                        value: sticker.description,
                        inline: false
                    });
                }

                embed.addFields({ 
                    name: languageStrings.TODAY_AT, 
                    value: currentDateTime(), 
                    inline: true 
                });

                await logsChannel.send({ embeds: [embed] });
            }

            for (const sticker of oldStickers.filter(sticker => !newStickers.some(s => s?.id === sticker.id))) {
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.StickerDelete,
                    limit: 1
                }).catch(error => {
                    // console.error('Error fetching audit logs:', error);
                    return null;
                });

                // console.log('Delete audit logs:', auditLogs);

                let userDisplay = 'Unknown';
                let user = null;

                if (auditLogs) {
                    const auditEntry = auditLogs.entries.first();
                    // console.log('Delete audit entry:', auditEntry);

                    if (auditEntry && auditEntry.executor) {
                        // console.log('Found delete executor:', auditEntry.executor);
                        user = auditEntry.executor;
                        try {
                            const member = await guild.members.fetch(user.id);
                            const nickname = member ? member.nickname || user.username : user.username;
                            userDisplay = `<@${user.id}> (${nickname})`;
                            // console.log('Delete user info:', userDisplay);
                        } catch (error) {
                            // console.error('Error fetching member:', error);
                            userDisplay = `<@${user.id}> (${user.username})`;
                        }
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.STICKER_REMOVED_TITLE)
                    .setColor('#FF0000')
                    .addFields(
                        { name: languageStrings.REMOVED_STICKER, value: sticker.name, inline: false },
                        { name: languageStrings.REMOVED_BY, value: userDisplay, inline: false }
                    )
                    .setImage(sticker.url);

                const cachedEmoji = getStickerEmoji(guild.id, sticker.id);
                if (cachedEmoji) {
                    embed.addFields({
                        name: languageStrings.RELATED_EMOJI,
                        value: cachedEmoji,
                        inline: false
                    });
                }

                embed.addFields({ 
                    name: languageStrings.TODAY_AT, 
                    value: currentDateTime(), 
                    inline: true 
                });

                await logsChannel.send({ embeds: [embed] });
                // console.log(`Removing sticker ${sticker.id} from cache for server ${guild.id}`);
                removeSticker(guild.id, sticker.id);
            }

            for (const oldSticker of oldStickers.filter(oldSticker => {
                const newSticker = newStickers.find(s => s.id === oldSticker.id);
                return newSticker && (
                    oldSticker.name !== newSticker.name ||
                    oldSticker.description !== newSticker.description
                );
            })) {
                const newSticker = newStickers.find(s => s.id === oldSticker.id);
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.StickerUpdate,
                    limit: 1
                });

                const auditEntry = auditLogs.entries.find(entry => entry.target?.id === oldSticker.id);
                const user = auditEntry?.executor || 'Unknown';
                const member = await guild.members.fetch(user.id).catch(() => null);
                const nickname = member ? member.nickname || user.username : user.username;

                let description = '';
                if (oldSticker.name !== newSticker.name) {
                    description += `${languageStrings.NAME_STICKER}: ${oldSticker.name} ${languageStrings.TO_STICKER} ${newSticker.name}\n`;
                }
                if (oldSticker.description !== newSticker.description) {
                    description += `${languageStrings.DESCRIPTION_STICKER}: ${oldSticker.description || 'None'} ${languageStrings.TO_STICKER} ${newSticker.description || 'None'}\n`;
                }

                if (!description) {
                    description = languageStrings.NO_CHANGES_DETECTED;
                }

                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.STICKERS_UPDATED_TITLE)
                    .setColor('#FFA500')
                    .addFields(
                        { name: oldSticker.name, value: description, inline: false }
                    );

                if (newSticker.tags && newSticker.tags[0]) {
                    embed.addFields({
                        name: 'Related Emoji',
                        value: newSticker.tags[0],
                        inline: false
                    });
                    updateStickerEmoji(guild.id, newSticker.id, newSticker.tags[0]);
                }

                if (user !== 'Unknown') {
                    embed.addFields({
                        name: languageStrings.MODIFIED_BY,
                        value: `<@${user.id}> (${nickname})`,
                        inline: false
                    });
                } else {
                    embed.addFields({
                        name: languageStrings.MODIFIED_BY,
                        value: 'Unknown',
                        inline: false
                    });
                }

                embed.addFields({ 
                    name: languageStrings.TODAY_AT, 
                    value: currentDateTime(), 
                    inline: true 
                })
                .setImage(newSticker.url);

                await logsChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in handleStickerUpdate:', error);
        }
    }
}

const createEvent = {
    name: Events.GuildStickerCreate,
    once: false,
    execute: async sticker => {
        const stickerEvents = new StickerEvents(sticker.client);
        await stickerEvents.handleStickerUpdate(sticker.guild, [], [sticker]);
    }
};

const deleteEvent = {
    name: Events.GuildStickerDelete,
    once: false,
    execute: async sticker => {
        const stickerEvents = new StickerEvents(sticker.client);
        await stickerEvents.handleStickerUpdate(sticker.guild, [sticker], []);
    }
};

const updateEvent = {
    name: Events.GuildStickerUpdate,
    once: false,
    execute: async (oldSticker, newSticker) => {
        const stickerEvents = new StickerEvents(oldSticker.client);
        await stickerEvents.handleStickerUpdate(oldSticker.guild, [oldSticker], [newSticker]);
    }
};

module.exports = { createEvent, deleteEvent, updateEvent };