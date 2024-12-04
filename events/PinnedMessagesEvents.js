const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadMessageLogsChannelId, currentDateTime } = require('../utils/imports');

function loadPreviousPinnedIds(channelId) {
    if (!fs.existsSync('pinned_messages.json')) {
        return new Set();
    }

    const data = JSON.parse(fs.readFileSync('pinned_messages.json', 'utf8'));
    return new Set(data[channelId] || []);
}

function saveCurrentPinnedIds(channelId, pinnedIds) {
    let data = {};
    if (fs.existsSync('pinned_messages.json')) {
        data = JSON.parse(fs.readFileSync('pinned_messages.json', 'utf8'));
    }

    data[channelId] = Array.from(pinnedIds);
    fs.writeFileSync('pinned_messages.json', JSON.stringify(data, null, 4));
}

class PinnedMessagesEvents {
    constructor(client) {
        this.client = client;
    }

    async findAuditLogExecutor(guild, messageId, auditLogs, languageStrings) {
        
        if (!auditLogs) {
            return languageStrings.UNKNOWN;
        }

        const auditEntry = auditLogs.entries.find(entry => {
            return entry.extra?.messageId === messageId;
        });

        if (!auditEntry?.executor) {
            return languageStrings.UNKNOWN;
        }

        const executor = auditEntry.executor;

        try {
            const member = await guild.members.fetch(executor.id);

            return `${executor.toString()} (${member.nickname || executor.username})`;
        } catch (error) {
            return executor.toString();
        }
    }

    async formatAttachments(attachments, languageStrings) {
        if (attachments.size === 0) return null;

        const attachmentDetails = attachments.map(attachment => {
            const sizeInMB = (attachment.size / (1024 * 1024)).toFixed(2);
            const type = attachment.contentType ? 
                attachment.contentType.split('/')[0].toUpperCase() : 
                languageStrings.UNKNOWN_TYPE;
            
            return `${attachment.name} (${type}, ${sizeInMB}MB)`;
        });

        return attachmentDetails.join('\n');
    }

    async handleChannelPinsUpdate(channel) {
        try {
            const guild = channel.guild;
            const serverLanguage = await getServerLanguage(guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const channelLogId = await loadMessageLogsChannelId(guild.id);
            const logsChannel = guild.channels.cache.get(channelLogId);

            if (!logsChannel) return;

            const currentPins = await channel.messages.fetchPinned();
            const currentPinnedIds = new Set(currentPins.map(pin => pin.id));
            const previousPinnedIds = loadPreviousPinnedIds(channel.id);

            const newPins = new Set([...currentPinnedIds].filter(x => !previousPinnedIds.has(x)));
            const removedPins = new Set([...previousPinnedIds].filter(x => !currentPinnedIds.has(x)));

            const [pinAuditLogs, unpinAuditLogs] = await Promise.all([
                guild.fetchAuditLogs({ 
                    type: AuditLogEvent.MessagePin, 
                    limit: 5 
                }).catch(error => {
                    console.error('Error fetching pin audit logs:', error);
                    return null;
                }),
                guild.fetchAuditLogs({ 
                    type: AuditLogEvent.MessageUnpin, 
                    limit: 5 
                }).catch(error => {
                    return null;
                })
            ]);

            for (const messageId of newPins) {
                try {
                    const message = await channel.messages.fetch(messageId);
                    
                    const pinnedBy = await this.findAuditLogExecutor(guild, messageId, pinAuditLogs, languageStrings);

                    const embed = new EmbedBuilder()
                        .setTitle(languageStrings.MESSAGE_PINNED_TITLE)
                        .setColor('#00FF00')
                        .addFields(
                            { name: languageStrings.CHANNEL, value: channel.toString(), inline: true },
                            { name: languageStrings.MESSAGE, value: message.url, inline: true },
                            { name: languageStrings.PINNED_BY, value: pinnedBy, inline: true },
                            { 
                                name: languageStrings.MESSAGE_CONTENT, 
                                value: message.content || languageStrings.NO_CONTENT, 
                                inline: false 
                            }
                        );

                    const attachmentInfo = await this.formatAttachments(message.attachments, languageStrings);
                    if (attachmentInfo) {
                        embed.addFields({
                            name: languageStrings.ATTACHMENTS,
                            value: attachmentInfo,
                            inline: false
                        });

                        const firstAttachment = message.attachments.first();
                        if (firstAttachment?.contentType?.startsWith('image/')) {
                            embed.setImage(firstAttachment.url);
                        }
                    }

                    embed.addFields({ name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true });

                    await logsChannel.send({ embeds: [embed] });
                } catch (error) {
                    console.error('Error processing new pin:', error);
                    const pinnedBy = await this.findAuditLogExecutor(guild, messageId, pinAuditLogs, languageStrings);

                    const embed = new EmbedBuilder()
                        .setTitle(languageStrings.MESSAGE_PINNED_TITLE)
                        .setColor('#00FF00')
                        .addFields(
                            { name: languageStrings.CHANNEL, value: channel.toString(), inline: true },
                            { name: languageStrings.PINNED_BY, value: pinnedBy, inline: true },
                            { 
                                name: languageStrings.MESSAGE_CONTENT, 
                                value: `${languageStrings.MESSAGE_NOT_FOUND}\n${languageStrings.MESSAGE_ID}: ${messageId}`, 
                                inline: false 
                            },
                            { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                        )
                        .setFooter({ text: languageStrings.MESSAGE_NOT_RETRIEVABLE });

                    await logsChannel.send({ embeds: [embed] });
                }
            }

            for (const messageId of removedPins) {
                try {  
                    const message = await channel.messages.fetch(messageId);
                    
                    const unpinnedBy = await this.findAuditLogExecutor(guild, messageId, unpinAuditLogs, languageStrings);

                    const embed = new EmbedBuilder()
                        .setTitle(languageStrings.MESSAGE_UNPINNED_TITLE)
                        .setColor('#FF0000')
                        .addFields(
                            { name: languageStrings.CHANNEL, value: channel.toString(), inline: true },
                            { name: languageStrings.MESSAGE, value: message.url, inline: true },
                            { name: languageStrings.UNPINNED_BY, value: unpinnedBy, inline: true },
                            { 
                                name: languageStrings.MESSAGE_CONTENT, 
                                value: message.content || languageStrings.NO_CONTENT, 
                                inline: false 
                            }
                        );

                    const attachmentInfo = await this.formatAttachments(message.attachments, languageStrings);
                    if (attachmentInfo) {
                        embed.addFields({
                            name: languageStrings.ATTACHMENTS,
                            value: attachmentInfo,
                            inline: false
                        });

                        const firstAttachment = message.attachments.first();
                        if (firstAttachment?.contentType?.startsWith('image/')) {
                            embed.setImage(firstAttachment.url);
                        }
                    }

                    embed.addFields({ name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true });

                    await logsChannel.send({ embeds: [embed] });
                } catch (error) {
                    console.error('Error processing unpin:', error);
                    const unpinnedBy = await this.findAuditLogExecutor(guild, messageId, unpinAuditLogs, languageStrings);

                    const embed = new EmbedBuilder()
                        .setTitle(languageStrings.MESSAGE_UNPINNED_TITLE)
                        .setColor('#FF0000')
                        .addFields(
                            { name: languageStrings.CHANNEL, value: channel.toString(), inline: true },
                            { name: languageStrings.UNPINNED_BY, value: unpinnedBy, inline: true },
                            { 
                                name: languageStrings.MESSAGE_CONTENT, 
                                value: `${languageStrings.MESSAGE_NOT_FOUND}\n${languageStrings.MESSAGE_ID}: ${messageId}`, 
                                inline: false 
                            },
                            { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                        )
                        .setFooter({ text: languageStrings.MESSAGE_NOT_RETRIEVABLE });

                    await logsChannel.send({ embeds: [embed] });
                }
            }

            saveCurrentPinnedIds(channel.id, currentPinnedIds);
        } catch (error) {
            console.error('Error in handleChannelPinsUpdate:', error);
        }
    }
}

module.exports = {
    name: 'channelPinsUpdate',
    once: false,
    async execute(channel) {
        if (!channel) return;
        const pinnedMessagesEvents = new PinnedMessagesEvents(channel.client);
        await pinnedMessagesEvents.handleChannelPinsUpdate(channel);
    }
};