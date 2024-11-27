const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadServerLogsChannelId, currentDateTime } = require('../utils/imports');

const inviteTracker = new Map();
const inviteCache = new Map();

class InviteEvents {
    constructor(client) {
        this.client = client;
    }

    async handleInviteCreate(invite) {
        try {
            if (!invite.guild) {
                console.error('Invite does not belong to a guild.');
                return;
            }

            const guildId = invite.guild.id;
            const inviteCode = invite.code;
            const trackingKey = `${guildId}-${inviteCode}`;

            if (inviteTracker.has(trackingKey)) {
                return;
            }

            inviteTracker.set(trackingKey, true);
            setTimeout(() => {
                inviteTracker.delete(trackingKey);
            }, 15000);

            const serverLanguage = await getServerLanguage(guildId);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const channelLogId = await loadServerLogsChannelId(guildId);
            const logsChannel = invite.guild.channels.cache.get(channelLogId);

            if (!logsChannel) {
                console.error(`Logs channel not found for guild: ${guildId}`);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.INVITE_CREATED_TITLE)
                .setColor('#00FF00')
                .addFields(
                    { name: languageStrings.INVITE_LINK, value: `https://discord.gg/${inviteCode}`, inline: false },
                    { name: languageStrings.MAX_USES, value: invite.maxUses ? invite.maxUses.toString() : languageStrings.UNLIMITED, inline: true }
                );

            if (invite.channel) {
                embed.addFields({
                    name: languageStrings.CHANNEL_INVITE.replace("{channel_name}", invite.channel.name),
                    value: "\u200B",
                    inline: true
                });
            } else if (invite.stageInstance) {
                embed.addFields({
                    name: languageStrings.STAGE_INVITE.replace("{channel_name}", invite.stageInstance.channel.name),
                    value: "\u200B",
                    inline: true
                });
            } else if (invite.guildScheduledEvent) {
                embed.addFields({
                    name: languageStrings.EVENT_INVITE.replace("{event_name}", invite.guildScheduledEvent.name),
                    value: "\u200B",
                    inline: true
                });
            }

            embed.addFields(
                { 
                    name: languageStrings.EXPIRES_AT, 
                    value: invite.expiresAt ? invite.expiresAt.toLocaleString() : languageStrings.NEVER, 
                    inline: true 
                },
                { 
                    name: languageStrings.TEMPORARY, 
                    value: invite.temporary ? languageStrings.YES : languageStrings.NO, 
                    inline: true 
                },
                { 
                    name: languageStrings.CREATED_VIA, 
                    value: invite.inviter ? invite.inviter.toString() : languageStrings.UNKNOWN, 
                    inline: false 
                },
                { 
                    name: languageStrings.TODAY_AT, 
                    value: currentDateTime(), 
                    inline: true 
                }
            );

            const invites = await invite.guild.invites.fetch();
            const invitesMap = new Map();
            
            invites.forEach(inv => {
                invitesMap.set(inv.code, inv.uses);
            });
            
            inviteCache.set(guildId, invitesMap);

            await logsChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleInviteCreate:', error);
        }
    }

    async handleInviteDelete(invite) {
        try {
            if (!invite.guild) {
                console.error('Invite does not belong to a guild.');
                return;
            }

            const serverLanguage = await getServerLanguage(invite.guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const channelLogId = await loadServerLogsChannelId(invite.guild.id);
            const logsChannel = invite.guild.channels.cache.get(channelLogId);

            if (!logsChannel) {
                console.error(`Logs channel not found for guild: ${invite.guild.id}`);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.INVITE_DELETED_TITLE)
                .setColor('#FF0000')
                .addFields(
                    { name: languageStrings.INVITE_LINK, value: `https://discord.gg/${invite.code}`, inline: false },
                    { name: languageStrings.MAX_USES, value: invite.maxUses ? invite.maxUses.toString() : languageStrings.UNLIMITED, inline: true }
                );

            if (invite.channel) {
                embed.addFields({
                    name: languageStrings.CHANNEL_INVITE.replace("{channel_name}", invite.channel.name),
                    value: "\u200B",
                    inline: true
                });
            } else if (invite.stageInstance) {
                embed.addFields({
                    name: languageStrings.STAGE_INVITE.replace("{channel_name}", invite.stageInstance.channel.name),
                    value: "\u200B",
                    inline: true
                });
            } else if (invite.guildScheduledEvent) {
                embed.addFields({
                    name: languageStrings.EVENT_INVITE.replace("{event_name}", invite.guildScheduledEvent.name),
                    value: "\u200B",
                    inline: true
                });
            }

            embed.addFields(
                { 
                    name: languageStrings.TEMPORARY, 
                    value: invite.temporary ? languageStrings.YES : languageStrings.NO, 
                    inline: true 
                },
                { 
                    name: languageStrings.EXPIRES_AT, 
                    value: invite.expiresAt ? invite.expiresAt.toLocaleString() : languageStrings.NEVER, 
                    inline: true 
                }
            );

            const auditLogs = await invite.guild.fetchAuditLogs({
                type: 42,
                limit: 1
            });
            
            const entry = auditLogs.entries.first();
            if (entry) {
                embed.addFields(
                    { 
                        name: languageStrings.DELETED_VIA, 
                        value: entry.executor.toString(), 
                        inline: false 
                    },
                    { 
                        name: languageStrings.TODAY_AT, 
                        value: currentDateTime(), 
                        inline: true 
                    }
                );
            }

            await logsChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleInviteDelete:', error);
        }
    }
}

const inviteCreate = {
    name: 'inviteCreate',
    once: false,
    async execute(invite) {
        const inviteEvents = new InviteEvents(invite.client);
        await inviteEvents.handleInviteCreate(invite);
    }
};

const inviteDelete = {
    name: 'inviteDelete',
    once: false,
    async execute(invite) {
        const inviteEvents = new InviteEvents(invite.client);
        await inviteEvents.handleInviteDelete(invite);
    }
};
module.exports = { inviteCreate, inviteDelete };