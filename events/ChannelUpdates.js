const { EmbedBuilder, Events, AuditLogEvent, ChannelType } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadServerLogsChannelId, currentDateTime } = require('../utils/imports');

class ChannelEvents {
    constructor(client) {
        this.client = client;
    }

    async getLanguageStrings(guildId) {
        const serverLanguage = await getServerLanguage(guildId);
        return JSON.parse(fs.readFileSync(`language/${serverLanguage}.json`, 'utf8'));
    }

    async handleChannelDelete(channel) {
        try {
            const languageStrings = await this.getLanguageStrings(channel.guild.id);
            const channelLogId = await loadServerLogsChannelId(channel.guild.id);

            if (!channelLogId) return;

            const logChannel = channel.guild.channels.cache.get(channelLogId);
            if (!logChannel) return;

            const auditLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelDelete,
                limit: 1
            });

            const entry = auditLogs.entries.first();
            if (!entry) return;

            const moderator = entry.executor;
            const member = await channel.guild.members.fetch(moderator.id).catch(() => null);
            const moderatorDisplay = member ? 
                `${moderator.toString()} (${member.nickname || moderator.username})` : 
                moderator.toString();

            let title;
            if (channel.type === ChannelType.GuildText) {
                title = languageStrings.DELETED_TEXT_CHANNEL_TITLE;
            } else if (channel.type === ChannelType.GuildVoice) {
                title = languageStrings.DELETED_VOICE_CHANNEL_TITLE;
            } else if (channel.type === ChannelType.GuildStageVoice) {
                title = languageStrings.DELETED_STAGE_CHANNEL_TITLE;
            } else if (channel.type === ChannelType.GuildAnnouncement) {
                title = languageStrings.DELETED_ANNOUNCEMENT_CHANNEL_TITLE;
            } else if (channel.type === ChannelType.GuildForum) {
                title = languageStrings.DELETED_FORUM_CHANNEL_TITLE;
            } else if (channel.type === ChannelType.GuildCategory) {
                title = languageStrings.DELETED_CATEGORY_TITLE;
            } else {
                title = languageStrings.DELETED_CHANNEL_TITLE;
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor('#FF0000')
                .addFields(
                    { name: languageStrings.CHANNEL_NAME, value: channel.name, inline: false }
                );

            if (channel.type !== ChannelType.GuildCategory && channel.parent) {
                embed.addFields({ 
                    name: languageStrings.CATEGORY, 
                    value: channel.parent.name, 
                    inline: false 
                });
            }

            embed.addFields(
                { name: languageStrings.MODERATOR, value: moderatorDisplay, inline: false },
                { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false },
                { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
            );

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleChannelDelete:', error);
        }
    }

    async handleChannelCreate(channel) {
        try {
            const languageStrings = await this.getLanguageStrings(channel.guild.id);
            const channelLogId = await loadServerLogsChannelId(channel.guild.id);

            if (!channelLogId) return;

            const logChannel = channel.guild.channels.cache.get(channelLogId);
            if (!logChannel) return;

            const auditLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelCreate,
                limit: 1
            });

            const entry = auditLogs.entries.first();
            if (!entry) return;

            const moderator = entry.executor;
            const member = await channel.guild.members.fetch(moderator.id).catch(() => null);
            const moderatorDisplay = member ? 
                `${moderator.toString()} (${member.nickname || moderator.username})` : 
                moderator.toString();

            let title;
            if (channel.type === ChannelType.GuildText) {
                title = languageStrings.CREATED_TEXT_CHANNEL_TITLE;
            } else if (channel.type === ChannelType.GuildVoice) {
                title = languageStrings.CREATED_VOICE_CHANNEL_TITLE;
            } else if (channel.type === ChannelType.GuildStageVoice) {
                title = languageStrings.CREATED_STAGE_CHANNEL_TITLE;
            } else if (channel.type === ChannelType.GuildAnnouncement) {
                title = languageStrings.CREATED_ANNOUNCEMENT_CHANNEL_TITLE;
            } else if (channel.type === ChannelType.GuildForum) {
                title = languageStrings.CREATED_FORUM_CHANNEL_TITLE;
            } else if (channel.type === ChannelType.GuildCategory) {
                title = languageStrings.CREATED_CATEGORY_TITLE;
            } else {
                title = languageStrings.CREATED_CHANNEL_TITLE;
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor('#00FF00')
                .addFields(
                    { name: languageStrings.CHANNEL_NAME, value: channel.name, inline: false }
                );

            if (channel.type !== ChannelType.GuildCategory && channel.parent) {
                embed.addFields({ 
                    name: languageStrings.CATEGORY, 
                    value: channel.parent.name, 
                    inline: false 
                });
            }

            embed.addFields(
                { name: languageStrings.MODERATOR, value: moderatorDisplay, inline: false },
                { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false },
                { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
            );

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleChannelCreate:', error);
        }
    }

    async handleChannelUpdate(oldChannel, newChannel) {
        try {
            const languageStrings = await this.getLanguageStrings(oldChannel.guild.id);
            const channelLogId = await loadServerLogsChannelId(oldChannel.guild.id);

            if (!channelLogId) return;

            const logChannel = oldChannel.guild.channels.cache.get(channelLogId);
            if (!logChannel) return;

            const auditLogs = await oldChannel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelUpdate,
                limit: 1
            });

            const entry = auditLogs.entries.first();
            if (!entry) return;

            const moderator = entry.executor;
            const member = await oldChannel.guild.members.fetch(moderator.id).catch(() => null);
            const moderatorDisplay = member ? 
                `${moderator.toString()} (${member.nickname || moderator.username})` : 
                moderator.toString();

            let title;
            if (oldChannel.type === ChannelType.GuildText) {
                title = languageStrings.UPDATED_TEXT_CHANNEL_TITLE;
            } else if (oldChannel.type === ChannelType.GuildVoice) {
                title = languageStrings.UPDATED_VOICE_CHANNEL_TITLE;
            } else if (oldChannel.type === ChannelType.GuildStageVoice) {
                title = languageStrings.UPDATED_STAGE_CHANNEL_TITLE;
            } else if (oldChannel.type === ChannelType.GuildAnnouncement) {
                title = languageStrings.UPDATED_ANNOUNCEMENT_CHANNEL_TITLE;
            } else if (oldChannel.type === ChannelType.GuildForum) {
                title = languageStrings.UPDATED_FORUM_CHANNEL_TITLE;
            } else if (oldChannel.type === ChannelType.GuildCategory) {
                title = languageStrings.UPDATED_CATEGORY_TITLE;
            } else {
                title = languageStrings.UPDATED_CHANNEL_TITLE;
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor('#FFA500')
                .addFields(
                    { name: languageStrings.MODERATOR, value: moderatorDisplay, inline: false },
                    { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false },
                    { name: languageStrings.CHANNEL_NAME, value: `<#${newChannel.id}>`, inline: false }
                );

            let changesDetected = false;

            if (oldChannel.name !== newChannel.name) {
                embed.addFields({
                    name: languageStrings.NAME,
                    value: `${oldChannel.name} -> ${newChannel.name}`,
                    inline: false
                });
                changesDetected = true;
            }

            if (oldChannel.type !== newChannel.type) {
                embed.addFields({
                    name: languageStrings.TYPE,
                    value: `${oldChannel.type} -> ${newChannel.type}`,
                    inline: false
                });
                changesDetected = true;
            }

            if (oldChannel.parent?.id !== newChannel.parent?.id) {
                embed.addFields({
                    name: languageStrings.CATEGORY,
                    value: `${oldChannel.parent?.name || 'None'} -> ${newChannel.parent?.name || 'None'}`,
                    inline: false
                });
                changesDetected = true;
            }

            if (oldChannel.nsfw !== newChannel.nsfw) {
                embed.addFields({
                    name: languageStrings.NSFW,
                    value: `${oldChannel.nsfw ? '<:On:1309252481967984710>' : '<:Off:1309252480475074625>'} -> ${newChannel.nsfw ? '<:On:1309252481967984710>' : '<:Off:1309252480475074625>'}`,
                    inline: false
                });
                changesDetected = true;
            }

            if (oldChannel.type === ChannelType.GuildText && newChannel.type === ChannelType.GuildText) {
                if (oldChannel.topic !== newChannel.topic) {
                    embed.addFields({
                        name: languageStrings.DESCRIPTION,
                        value: `${oldChannel.topic || 'None'} -> ${newChannel.topic || 'None'}`,
                        inline: false
                    });
                    changesDetected = true;
                }

                if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                    embed.addFields({
                        name: languageStrings.SLOWMODE,
                        value: `${oldChannel.rateLimitPerUser} -> ${newChannel.rateLimitPerUser}`,
                        inline: false
                    });
                    changesDetected = true;
                }
            }

            if ((oldChannel.type === ChannelType.GuildVoice || oldChannel.type === ChannelType.GuildStageVoice) &&
                (newChannel.type === ChannelType.GuildVoice || newChannel.type === ChannelType.GuildStageVoice)) {
                
                if (oldChannel.bitrate !== newChannel.bitrate) {
                    embed.addFields({
                        name: languageStrings.BITRATE,
                        value: `${oldChannel.bitrate} -> ${newChannel.bitrate}`,
                        inline: false
                    });
                    changesDetected = true;
                }

                if (oldChannel.userLimit !== newChannel.userLimit) {
                    embed.addFields({
                        name: languageStrings.USER_LIMIT,
                        value: `${oldChannel.userLimit} -> ${newChannel.userLimit}`,
                        inline: false
                    });
                    changesDetected = true;
                }

                if (oldChannel.rtcRegion !== newChannel.rtcRegion) {
                    embed.addFields({
                        name: languageStrings.REGION,
                        value: `${oldChannel.rtcRegion || languageStrings.AUTOMATIC} -> ${newChannel.rtcRegion || languageStrings.AUTOMATIC}`,
                        inline: false
                    });
                    changesDetected = true;
                }
            }

            if (changesDetected) {
                embed.addFields({
                    name: languageStrings.TODAY_AT,
                    value: currentDateTime(),
                    inline: true
                });
                await logChannel.send({ embeds: [embed] });
            }

            const permissionsEmbed = new EmbedBuilder()
                .setTitle(languageStrings.PERMISSIONS_UPDATED_TITLE)
                .setColor('#0000FF');

            let permissionsChanged = false;

            for (const [targetId, oldPerms] of oldChannel.permissionOverwrites.cache) {
                const newPerms = newChannel.permissionOverwrites.cache.get(targetId);
                
                const permissionsAreDifferent = !newPerms || 
                    oldPerms.allow.bitfield !== newPerms.allow.bitfield || 
                    oldPerms.deny.bitfield !== newPerms.deny.bitfield;

                if (permissionsAreDifferent) {
                    const target = await oldChannel.guild.roles.fetch(targetId)
                        .catch(() => oldChannel.guild.members.fetch(targetId).catch(() => null));

                    if (!target) continue;

                    const targetName = target.id === oldChannel.guild.id ? 
                        languageStrings.EVERYONE : 
                        (target.displayName || target.name);

                    permissionsEmbed.addFields(
                        { 
                            name: target.constructor.name === 'Role' ? 
                                languageStrings.ROLE_NAME : 
                                languageStrings.MEMBER_NAME,
                            value: targetName,
                            inline: false 
                        },
                        { 
                            name: languageStrings.CHANNEL_NAME, 
                            value: `<#${newChannel.id}>`, 
                            inline: false 
                        },
                        { 
                            name: languageStrings.MODERATOR, 
                            value: moderatorDisplay, 
                            inline: false 
                        },
                        { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false }
                    );

                    const permissionChanges = [];
                    const oldAllowed = oldPerms.allow.toArray();
                    const oldDenied = oldPerms.deny.toArray();
                    const newAllowed = newPerms ? newPerms.allow.toArray() : [];
                    const newDenied = newPerms ? newPerms.deny.toArray() : [];

                    const allPerms = [...new Set([...oldAllowed, ...oldDenied, ...newAllowed, ...newDenied])];
                    
                    for (const perm of allPerms) {
                        const wasAllowed = oldAllowed.includes(perm);
                        const wasDenied = oldDenied.includes(perm);
                        const isAllowed = newAllowed.includes(perm);
                        const isDenied = newDenied.includes(perm);

                        if (wasAllowed !== isAllowed || wasDenied !== isDenied) {
                            const formattedPerm = perm
                                .replace(/([A-Z])/g, ' $1')
                                .replace(/_/g, ' ')
                                .split(' ')
                                .filter(word => word.length > 0)
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')
                                .trim();

                            let oldState, newState;
                            if (wasAllowed) oldState = '<:On:1309252481967984710>';
                            else if (wasDenied) oldState = '<:Off:1309252480475074625>';
                            else oldState = '<:None:1310295239851905115>';

                            if (isAllowed) newState = '<:On:1309252481967984710>';
                            else if (isDenied) newState = '<:Off:1309252480475074625>';
                            else newState = '<:None:1310295239851905115>';

                            permissionChanges.push(`${oldState} -> ${newState} ${formattedPerm}`);
                        }
                    }

                    if (permissionChanges.length > 0) {
                        permissionsEmbed.addFields({
                            name: "\u200B",
                            value: permissionChanges.join('\n'),
                            inline: false
                        });
                        permissionsChanged = true;
                    }
                }
            }

            if (permissionsChanged) {
                permissionsEmbed.addFields({
                    name: languageStrings.TODAY_AT,
                    value: currentDateTime(),
                    inline: true
                });
                await logChannel.send({ embeds: [permissionsEmbed] });
            }

        } catch (error) {
            console.error('Error in handleChannelUpdate:', error);
        }
    }
}

module.exports = [
    {
        name: Events.ChannelCreate,
        once: false,
        async execute(channel) {
            const channelEvents = new ChannelEvents(channel.client);
            await channelEvents.handleChannelCreate(channel);
        }
    },
    {
        name: Events.ChannelDelete,
        once: false,
        async execute(channel) {
            const channelEvents = new ChannelEvents(channel.client);
            await channelEvents.handleChannelDelete(channel);
        }
    },
    {
        name: Events.ChannelUpdate,
        once: false,
        async execute(oldChannel, newChannel) {
            const channelEvents = new ChannelEvents(oldChannel.client);
            await channelEvents.handleChannelUpdate(oldChannel, newChannel);
        }
    }
];