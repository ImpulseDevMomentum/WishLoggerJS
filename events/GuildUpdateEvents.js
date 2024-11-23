const { EmbedBuilder, Events, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadServerLogsChannelId, currentDateTime } = require('../utils/imports');

class GuildUpdateEvents {
    constructor(client) {
        this.client = client;
    }

    async fetchModerator(guild, actionType) {
        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: actionType,
                limit: 1
            });
            const entry = auditLogs.entries.find(e => e.target?.id === guild.id);
            if (entry?.executor) {
                const member = await guild.members.fetch(entry.executor.id).catch(() => null);
                const nickname = member ? member.nickname || entry.executor.username : entry.executor.username;
                return {
                    user: entry.executor,
                    nickname: nickname
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching moderator:', error);
            return null;
        }
    }

    async handleGuildUpdate(oldGuild, newGuild) {
        try {
            const changes = [];
            const serverLanguage = await getServerLanguage(oldGuild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            if (oldGuild.name !== newGuild.name) {
                changes.push(`${languageStrings.SERVER_NAME_CHANGED}: \`${oldGuild.name}\` ${languageStrings.TO_SV_UPDATE} \`${newGuild.name}\``);
            }

            if (oldGuild.icon !== newGuild.icon) {
                changes.push(languageStrings.SERVER_ICON_CHANGED);
            }

            if (oldGuild.banner !== newGuild.banner) {
                changes.push(languageStrings.SERVER_BANNER_CHANGED);
            }

            if (oldGuild.preferredLocale !== newGuild.preferredLocale) {
                changes.push(`${languageStrings.SERVER_REGION_CHANGED}: \`${oldGuild.preferredLocale}\` ${languageStrings.TO_SV_UPDATE} \`${newGuild.preferredLocale}\``);
            }

            if (oldGuild.ownerId !== newGuild.ownerId) {
                changes.push(`${languageStrings.SERVER_OWNER_CHANGED}: \`${oldGuild.ownerId}\` ${languageStrings.TO_SV_UPDATE} \`${newGuild.ownerId}\``);
            }

            if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
                changes.push(`${languageStrings.SERVER_VERIFICATION_LEVEL_CHANGED}: \`${oldGuild.verificationLevel}\` ${languageStrings.TO_SV_UPDATE} \`${newGuild.verificationLevel}\``);
            }

            if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
                changes.push(`${languageStrings.SERVER_EXPLICIT_CONTENT_FILTER_CHANGED}: \`${oldGuild.explicitContentFilter}\` ${languageStrings.TO_SV_UPDATE} \`${newGuild.explicitContentFilter}\``);
            }

            if (oldGuild.afkChannel?.id !== newGuild.afkChannel?.id) {
                const beforeAfk = oldGuild.afkChannel?.name || languageStrings.NONE;
                const afterAfk = newGuild.afkChannel?.name || languageStrings.NONE;
                changes.push(`${languageStrings.SERVER_AFK_CHANNEL_CHANGED}: \`${beforeAfk}\` ${languageStrings.TO_SV_UPDATE} \`${afterAfk}\``);
            }

            if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
                changes.push(`${languageStrings.SERVER_NOTIFICATION_SETTINGS_CHANGED}: \`${oldGuild.defaultMessageNotifications}\` ${languageStrings.TO_SV_UPDATE} \`${newGuild.defaultMessageNotifications}\``);
            }

            if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
                changes.push(`${languageStrings.SERVER_AFK_TIMEOUT_CHANGED}: \`${oldGuild.afkTimeout} seconds\` ${languageStrings.TO_SV_UPDATE} \`${newGuild.afkTimeout} seconds\``);
            }

            if (oldGuild.systemChannel?.id !== newGuild.systemChannel?.id) {
                const beforeSystem = oldGuild.systemChannel?.name || languageStrings.NONE;
                const afterSystem = newGuild.systemChannel?.name || languageStrings.NONE;
                changes.push(`${languageStrings.SERVER_SYSTEM_CHANNEL_CHANGED}: \`${beforeSystem}\` ${languageStrings.TO_SV_UPDATE} \`${afterSystem}\``);
            }

            if (oldGuild.description !== newGuild.description) {
                changes.push(`${languageStrings.SERVER_DESCRIPTION_CHANGED}: \`${oldGuild.description || languageStrings.NONE}\` ${languageStrings.TO_SV_UPDATE} \`${newGuild.description || languageStrings.NONE}\``);
            }

            if (oldGuild.premiumTier !== newGuild.premiumTier) {
                changes.push(`${languageStrings.SERVER_PREMIUM_TIER_CHANGED}: \`${oldGuild.premiumTier}\` ${languageStrings.TO_SV_UPDATE} \`${newGuild.premiumTier}\``);
            }

            if (oldGuild.premiumSubscriptionCount !== newGuild.premiumSubscriptionCount) {
                changes.push(`${languageStrings.SERVER_PREMIUM_ROLE_CHANGED}: \`${oldGuild.premiumSubscriptionCount}\` ${languageStrings.TO_SV_UPDATE} \`${newGuild.premiumSubscriptionCount}\``);
            }

            if (changes.length > 0) {
                const channelLogId = await loadServerLogsChannelId(oldGuild.id);
                const logsChannel = oldGuild.channels.cache.get(channelLogId);

                if (logsChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle(languageStrings.SERVER_UPDATE_TITLE)
                        .setColor('#FFA500')
                        .addFields({ 
                            name: languageStrings.CHANGES,
                            value: changes.join('\n'), 
                            inline: false 
                        });

                    const moderatorInfo = await this.fetchModerator(newGuild, AuditLogEvent.GuildUpdate);
                    if (moderatorInfo) {
                        embed.addFields(
                            { 
                                name: languageStrings.MODERATOR, 
                                value: `${moderatorInfo.user.toString()} (${moderatorInfo.nickname})`, 
                                inline: false 
                            },
                            { 
                                name: languageStrings.MODERATOR_ID, 
                                value: moderatorInfo.user.id.toString(), 
                                inline: false 
                            }
                        );
                    }

                    if (newGuild.icon) {
                        embed.setThumbnail(newGuild.iconURL());
                    }
                    if (newGuild.banner) {
                        embed.setImage(newGuild.bannerURL());
                    }

                    embed.addFields({ 
                        name: languageStrings.TODAY_AT, 
                        value: currentDateTime(), 
                        inline: true 
                    });

                    await logsChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error in handleGuildUpdate:', error);
        }
    }

    async handleGuildFeatureUpdate(oldGuild, newGuild) {
        try {
            const serverLanguage = await getServerLanguage(oldGuild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const addedFeatures = newGuild.features.filter(feature => !oldGuild.features.includes(feature));
            const removedFeatures = oldGuild.features.filter(feature => !newGuild.features.includes(feature));

            if (addedFeatures.length === 0 && removedFeatures.length === 0) return;

            const channelLogId = await loadServerLogsChannelId(oldGuild.id);
            const logsChannel = oldGuild.channels.cache.get(channelLogId);
            if (!logsChannel) return;

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.SERVER_FEATURES_UPDATE_TITLE)
                .setColor('#FFA500');

            if (addedFeatures.length > 0) {
                embed.addFields({
                    name: languageStrings.FEATURES_ADDED,
                    value: addedFeatures.map(feature => `\`${feature}\``).join('\n'),
                    inline: false
                });
            }

            if (removedFeatures.length > 0) {
                embed.addFields({
                    name: languageStrings.FEATURES_REMOVED,
                    value: removedFeatures.map(feature => `\`${feature}\``).join('\n'),
                    inline: false
                });
            }

            const moderatorInfo = await this.fetchModerator(newGuild, AuditLogEvent.GuildUpdate);
            if (moderatorInfo) {
                embed.addFields(
                    { 
                        name: languageStrings.MODERATOR, 
                        value: `${moderatorInfo.user.toString()} (${moderatorInfo.nickname})`, 
                        inline: false 
                    },
                    { 
                        name: languageStrings.MODERATOR_ID, 
                        value: moderatorInfo.user.id.toString(), 
                        inline: false 
                    }
                );
            }

            embed.addFields({ 
                name: languageStrings.TODAY_AT, 
                value: currentDateTime(), 
                inline: true 
            });

            await logsChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleGuildFeatureUpdate:', error);
        }
    }
}

module.exports = {
    name: Events.GuildUpdate,
    once: false,
    async execute(oldGuild, newGuild) {
        const guildUpdateEvents = new GuildUpdateEvents(oldGuild.client);
        await guildUpdateEvents.handleGuildUpdate(oldGuild, newGuild);
        await guildUpdateEvents.handleGuildFeatureUpdate(oldGuild, newGuild);
    }
};