const { EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadServerLogsChannelId, currentDateTime } = require('../utils/imports');


class ThreadEvents {
    constructor(client) {
        this.client = client;
    }

    formatTime(seconds, languageStrings) {
        if (seconds < 60) {
            return `${seconds} ${languageStrings.SECONDS}`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes} ${languageStrings.MINUTES}`;
        } else {
            const hours = Math.floor(seconds / 3600);
            return `${hours} ${languageStrings.HOURS}`;
        }
    }
    async handleThreadDelete(thread) {
        try {
            const channelLogId = await loadServerLogsChannelId(thread.guild.id);
            const serverLanguage = await getServerLanguage(thread.guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            if (!channelLogId) return;
            const logsChannel = thread.guild.channels.cache.get(channelLogId);

            if (!logsChannel) return;

            const auditLogs = await thread.guild.fetchAuditLogs({
                type: 112,
                limit: 1
            });

            const auditEntry = auditLogs.entries.first();
            if (!auditEntry) return;
            const moderator = auditEntry.executor;
            const embed = new EmbedBuilder()
                .setTitle(languageStrings.THREAD_DELETED_TITLE)
                .setColor('#FF0000')
                .addFields(
                    { name: languageStrings.THREAD_NAME, value: thread.name, inline: false },
                    { name: languageStrings.MODERATOR, value: moderator.toString(), inline: false },
                    { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false },
                    { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                );

            await logsChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleThreadDelete:', error);
        }
    }

    async handleThreadCreate(thread) {
        try {
            const channelLogId = await loadServerLogsChannelId(thread.guild.id);
            const serverLanguage = await getServerLanguage(thread.guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            if (!channelLogId) return;

            const logsChannel = thread.guild.channels.cache.get(channelLogId);

            if (!logsChannel) return;

            const auditLogs = await thread.guild.fetchAuditLogs({
                type: 110,
                limit: 1
            });

            const auditEntry = auditLogs.entries.first();

            if (!auditEntry) return;

            const moderator = auditEntry.executor;
            const embed = new EmbedBuilder()

                .setTitle(languageStrings.THREAD_CREATED_TITLE)
                .setColor('#00FF00')
                .addFields(
                    { name: languageStrings.THREAD_NAME, value: `<#${thread.id}>`, inline: false },
                    { name: languageStrings.MODERATOR, value: moderator.toString(), inline: false },
                    { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false },
                    { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                );
            await logsChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleThreadCreate:', error);
        }
    }

    async handleThreadUpdate(oldThread, newThread) {
        try {
            const channelLogId = await loadServerLogsChannelId(newThread.guild.id);
            const serverLanguage = await getServerLanguage(newThread.guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );
            if (!channelLogId) return;



            const logsChannel = newThread.guild.channels.cache.get(channelLogId);

            if (!logsChannel) return;

            const auditLogs = await newThread.guild.fetchAuditLogs({
                type: 111,
                limit: 1
            });

            const auditEntry = auditLogs.entries.first();
            if (!auditEntry) return;

            const moderator = auditEntry.executor;
            const embed = new EmbedBuilder()

                .setTitle(languageStrings.THREAD_UPDATED_TITLE)
                .setColor('#0000FF')
                .addFields(
                    { name: languageStrings.THREAD_NAME, value: `<#${newThread.id}>`, inline: false },
                    { name: languageStrings.MODERATOR, value: moderator.toString(), inline: false },
                    { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false }
                );

            if (oldThread.name !== newThread.name) {
                embed.addFields({
                    name: languageStrings.THREAD_NAME_CHANGE,
                    value: `${oldThread.name} -> ${newThread.name}`,
                    inline: false
                });
            }

            if (!oldThread.archived && newThread.archived) {
                embed.addFields({
                    name: languageStrings.THREAD_ARCHIVED_CHANGE,
                    value: "<:On:1309252481967984710>",
                    inline: false
                });
            } else if (oldThread.archived && !newThread.archived) {
                embed.addFields({
                    name: languageStrings.THREAD_ARCHIVED_CHANGE,
                    value: "<:Off:1309252480475074625>",
                    inline: false
                });
            }
            if (!oldThread.locked && newThread.locked) {
                embed.addFields({
                    name: languageStrings.THREAD_LOCKED_TITLE,
                    value: "<:On:1309252481967984710>",
                    inline: false
                });
            } else if (oldThread.locked && !newThread.locked) {
                embed.addFields({
                    name: languageStrings.THREAD_LOCKED_TITLE,
                    value: "<:Off:1309252480475074625>",
                    inline: false
                });
            }
            if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
                if (newThread.rateLimitPerUser > 0) {
                    const formattedTime = this.formatTime(newThread.rateLimitPerUser, languageStrings);
                    embed.addFields({
                        name: languageStrings.THREAD_SLOWMODE_CHANGED,
                        value: formattedTime,
                        inline: false
                    });
                } else {
                    embed.addFields({
                        name: languageStrings.THREAD_SLOWMODE_DISABLED,
                        value: '\u200B',
                        inline: false
                    });
                }
            }
            embed.addFields({ name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true });
            await logsChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleThreadUpdate:', error);
        }
    }
}

const createEvent = {
    name: Events.ThreadCreate,
    once: false,
    async execute(thread) {
        const threadEvents = new ThreadEvents(thread.client);
        await threadEvents.handleThreadCreate(thread);
    }
};

const deleteEvent = {
    name: Events.ThreadDelete,
    once: false,
    async execute(thread) {
        const threadEvents = new ThreadEvents(thread.client);
        await threadEvents.handleThreadDelete(thread);
    }
};

const updateEvent = {
    name: Events.ThreadUpdate,
    once: false,
    async execute(oldThread, newThread) {
        const threadEvents = new ThreadEvents(oldThread.client);
        await threadEvents.handleThreadUpdate(oldThread, newThread);
    }
};
module.exports = { createEvent, deleteEvent, updateEvent };