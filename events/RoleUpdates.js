const { EmbedBuilder, Events, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadRoleLogsChannelId, currentDateTime } = require('../utils/imports');

class RoleEvents {
    constructor(client) {
        this.client = client;
    }

    async getLanguageStrings(guildId) {
        const serverLanguage = await getServerLanguage(guildId);
        return JSON.parse(fs.readFileSync(`language/${serverLanguage}.json`, 'utf8'));
    }

    async handleRoleCreate(role) {
        try {
            const languageStrings = await this.getLanguageStrings(role.guild.id);
            const channelLogId = await loadRoleLogsChannelId(role.guild.id);

            if (!channelLogId) return;

            const logChannel = role.guild.channels.cache.get(channelLogId);
            if (!logChannel) return;

            const auditLogs = await role.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleCreate,
                limit: 1
            });

            const entry = auditLogs.entries.first();
            if (!entry || entry.target?.id !== role.id) return;

            const moderator = entry.executor;
            const member = await role.guild.members.fetch(moderator.id).catch(() => null);
            const moderatorDisplay = member ? 
                `${moderator.toString()} (${member.nickname || moderator.username})` : 
                moderator.toString();

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.ROLE_CREATED_TITLE)
                .setColor('#00FF00')
                .addFields(
                    { name: languageStrings.MODERATOR, value: moderatorDisplay, inline: false },
                    { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false },
                    { name: languageStrings.ROLE_NAME, value: `<@&${role.id}>`, inline: false },
                    { name: languageStrings.ROLE_ID, value: role.id.toString(), inline: false },
                    { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                );

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleRoleCreate:', error);
        }
    }

    async handleRoleDelete(role) {
        try {
            const languageStrings = await this.getLanguageStrings(role.guild.id);
            const channelLogId = await loadRoleLogsChannelId(role.guild.id);

            if (!channelLogId) return;

            const logChannel = role.guild.channels.cache.get(channelLogId);
            if (!logChannel) return;

            const auditLogs = await role.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleDelete,
                limit: 1
            });

            const entry = auditLogs.entries.first();
            if (!entry || entry.target?.id !== role.id) return;

            const moderator = entry.executor;
            const member = await role.guild.members.fetch(moderator.id).catch(() => null);
            const moderatorDisplay = member ? 
                `${moderator.toString()} (${member.nickname || moderator.username})` : 
                moderator.toString();

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.ROLE_DELETED_TITLE)
                .setColor('#FF0000')
                .addFields(
                    { name: languageStrings.ROLE_NAME, value: role.name, inline: false },
                    { name: languageStrings.ROLE_ID, value: role.id.toString(), inline: false },
                    { name: languageStrings.MODERATOR, value: moderatorDisplay, inline: false },
                    { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false },
                    { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                );

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleRoleDelete:', error);
        }
    }

    async handleRoleUpdate(oldRole, newRole) {
        try {
            const languageStrings = await this.getLanguageStrings(oldRole.guild.id);
            const channelLogId = await loadRoleLogsChannelId(oldRole.guild.id);

            if (!channelLogId) return;

            const logChannel = oldRole.guild.channels.cache.get(channelLogId);
            if (!logChannel) return;

            const auditLogs = await oldRole.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleUpdate,
                limit: 1
            });

            const entry = auditLogs.entries.first();
            if (!entry || entry.target?.id !== newRole.id) return;

            const moderator = entry.executor;
            const member = await oldRole.guild.members.fetch(moderator.id).catch(() => null);
            const moderatorDisplay = member ? 
                `${moderator.toString()} (${member.nickname || moderator.username})` : 
                moderator.toString();

            let roleChangesDetected = false;

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.ROLE_UPDATED_TITLE)
                .setColor('#0000FF')
                .addFields(
                    { name: languageStrings.ROLE, value: `<@&${newRole.id}>`, inline: false },
                    { name: languageStrings.ROLE_ID, value: newRole.id.toString(), inline: false },
                    { name: languageStrings.MODERATOR, value: moderatorDisplay, inline: false },
                    { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false }
                );

            if (oldRole.name !== newRole.name) {
                embed.addFields({
                    name: languageStrings.ROLE_NAME_CHANGE,
                    value: `${oldRole.name} -> ${newRole.name}`,
                    inline: false
                });
                roleChangesDetected = true;
            }

            if (oldRole.color !== newRole.color) {
                embed.addFields({
                    name: languageStrings.ROLE_COLOR_CHANGE,
                    value: `${oldRole.color} -> ${newRole.color}`,
                    inline: false
                });
                roleChangesDetected = true;

                const oldColorHex = oldRole.color === 0 ? '000000' : oldRole.color.toString(16).padStart(6, '0');
                const newColorHex = newRole.color === 0 ? '000000' : newRole.color.toString(16).padStart(6, '0');

                const beforeEmbed = new EmbedBuilder()
                    .setTitle(languageStrings.BEFORE_COLOR)
                    .setColor(oldRole.color)
                    .setImage(`https://singlecolorimage.com/get/${oldColorHex}/100x100`);

                const afterEmbed = new EmbedBuilder()
                    .setTitle(languageStrings.AFTER_COLOR)
                    .setColor(newRole.color)
                    .setImage(`https://singlecolorimage.com/get/${newColorHex}/100x100`);

                if (roleChangesDetected) {
                    embed.addFields({
                        name: languageStrings.TODAY_AT,
                        value: currentDateTime(),
                        inline: true
                    });
                    // beforeEmbed, afterEmbed
                    await logChannel.send({ embeds: [embed] });
                    return;
                }
            }

            if (oldRole.hoist !== newRole.hoist) {
                embed.addFields({
                    name: languageStrings.ROLE_HOIST_CHANGE,
                    value: `${oldRole.hoist ? '<:On:1309252481967984710>' : '<:Off:1309252480475074625>'} -> ${newRole.hoist ? '<:On:1309252481967984710>' : '<:Off:1309252480475074625>'}`,
                    inline: false
                });
                roleChangesDetected = true;
            }

            if (oldRole.mentionable !== newRole.mentionable) {
                embed.addFields({
                    name: languageStrings.ROLE_MENTIONABLE_CHANGE,
                    value: `${oldRole.mentionable ? '<:On:1309252481967984710>' : '<:Off:1309252480475074625>'} -> ${newRole.mentionable ? '<:On:1309252481967984710>' : '<:Off:1309252480475074625>'}`,
                    inline: false
                });
                roleChangesDetected = true;
            }

            if (!oldRole.permissions.equals(newRole.permissions)) {
                const permissionChanges = [];
                const oldPerms = oldRole.permissions.toArray();
                const newPerms = newRole.permissions.toArray();
                
                const changedPerms = oldPerms
                    .filter(perm => !newPerms.includes(perm))
                    .concat(newPerms.filter(perm => !oldPerms.includes(perm)));
                
                for (const perm of changedPerms) {
                    const wasEnabled = oldPerms.includes(perm);
                    const isEnabled = newPerms.includes(perm);
                    
                    const formattedPerm = perm
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/_/g, ' ')
                        .split(' ')
                        .filter(word => word.length > 0)
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ')
                        .trim();
                    
                    const oldState = wasEnabled ? '<:On:1309252481967984710>' : '<:Off:1309252480475074625>';
                    const newState = isEnabled ? '<:On:1309252481967984710>' : '<:Off:1309252480475074625>';
                    
                    permissionChanges.push(`${oldState} -> ${newState} ${formattedPerm}`);
                    roleChangesDetected = true;
                }

                if (permissionChanges.length > 0) {
                    embed.addFields({
                        name: languageStrings.PERMISSIONS_CHANGED_TITLE,
                        value: permissionChanges.join('\n'),
                        inline: false
                    });
                }
            }

            if (oldRole.icon !== newRole.icon) {
                embed.addFields({
                    name: languageStrings.ROLE_ICON_CHANGE,
                    value: oldRole.icon ? languageStrings.ROLE_ICON_CHANGED : languageStrings.ROLE_ICON_ADDED,
                    inline: false
                });
                if (newRole.iconURL()) {
                    embed.setThumbnail(newRole.iconURL());
                }
                roleChangesDetected = true;
            }

            if (oldRole.position !== newRole.position) {
                if (newRole.id === newRole.guild.id) return;
                
                const oldPositionRoles = await this.getRolesAround(oldRole.guild, oldRole.position, languageStrings);
                const newPositionRoles = await this.getRolesAround(newRole.guild, newRole.position, languageStrings);
                
                if (!oldPositionRoles || !newPositionRoles) return;
                
                let positionText = `${languageStrings.OLD_POSITION}:\n`;
                if (oldPositionRoles.isTop) {
                    positionText += `**${languageStrings.TOP_POSITION}**\n`;
                } else {
                    positionText += `${languageStrings.ROLE_ABOVE}: ${oldPositionRoles.above}\n`;
                }
                positionText += `${languageStrings.ROLE_CURRENT}: <@&${oldRole.id}>\n`;
                if (oldPositionRoles.isBottom) {
                    positionText += `**${languageStrings.BOTTOM_POSITION}**\n`;
                } else {
                    positionText += `${languageStrings.ROLE_BELOW}: ${oldPositionRoles.below}\n`;
                }
                
                positionText += `\n${languageStrings.NEW_POSITION}:\n`;
                if (newPositionRoles.isTop) {
                    positionText += `**${languageStrings.TOP_POSITION}**\n`;
                } else {
                    positionText += `${languageStrings.ROLE_ABOVE}: ${newPositionRoles.above}\n`;
                }
                positionText += `${languageStrings.ROLE_CURRENT}: <@&${newRole.id}>\n`;
                if (newPositionRoles.isBottom) {
                    positionText += `**${languageStrings.BOTTOM_POSITION}**`;
                } else {
                    positionText += `${languageStrings.ROLE_BELOW}: ${newPositionRoles.below}`;
                }
                
                embed.addFields({
                    name: languageStrings.ROLE_POSITION_CHANGE,
                    value: positionText,
                    inline: false
                });
                roleChangesDetected = true;
            }

            if (roleChangesDetected) {
                embed.addFields({
                    name: languageStrings.TODAY_AT,
                    value: currentDateTime(),
                    inline: true
                });
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in handleRoleUpdate:', error);
        }
    }

    async getRolesAround(guild, position, languageStrings) {
        const roles = [...guild.roles.cache.values()]
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position);
        
        const targetIndex = roles.findIndex(r => r.position === position);
        if (targetIndex === -1) return null;
        
        const isTop = targetIndex === 0;
        const isBottom = targetIndex === roles.length - 1;
        
        return {
            above: isTop ? languageStrings.TOP_POSITION : roles[targetIndex - 1] ? `<@&${roles[targetIndex - 1].id}>` : languageStrings.NONE,
            below: isBottom ? languageStrings.BOTTOM_POSITION : roles[targetIndex + 1] ? `<@&${roles[targetIndex + 1].id}>` : languageStrings.NONE,
            isTop,
            isBottom
        };
    }
}

module.exports = [
    {
        name: Events.GuildRoleCreate,
        once: false,
        async execute(role) {
            const roleEvents = new RoleEvents(role.client);
            await roleEvents.handleRoleCreate(role);
        }
    },
    {
        name: Events.GuildRoleDelete,
        once: false,
        async execute(role) {
            const roleEvents = new RoleEvents(role.client);
            await roleEvents.handleRoleDelete(role);
        }
    },
    {
        name: Events.GuildRoleUpdate,
        once: false,
        async execute(oldRole, newRole) {
            const roleEvents = new RoleEvents(oldRole.client);
            await roleEvents.handleRoleUpdate(oldRole, newRole);
        }
    }
];