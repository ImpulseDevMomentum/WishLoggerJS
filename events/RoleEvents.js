const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadMemberLogsChannelId, currentDateTime } = require('../utils/imports');

class RoleEvents {
    constructor(client) {
        this.client = client;
    }

    async handleRoleUpdate(oldMember, newMember) {
        try {
            if (oldMember.roles.cache.size === newMember.roles.cache.size &&
                [...oldMember.roles.cache.keys()].every(role => newMember.roles.cache.has(role))) {
                return;
            }

            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));

            const channelLogId = await loadMemberLogsChannelId(oldMember.guild.id);
            if (!channelLogId) return;

            const serverLanguage = await getServerLanguage(oldMember.guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const channel = oldMember.guild.channels.cache.get(channelLogId);
            if (!channel) return;

            const auditLogs = await oldMember.guild.fetchAuditLogs({
                type: 25,
                limit: 1
            });

            const auditEntry = auditLogs.entries.first();
            if (!auditEntry) return;

            const moderator = auditEntry.executor;
            const moderatorMember = await oldMember.guild.members.fetch(moderator.id).catch(() => null);
            const moderatorDisplay = moderatorMember ? 
                `${moderator.toString()} (${moderatorMember.nickname || moderator.username})` : 
                moderator.toString();

            const memberNickname = newMember.nickname || newMember.user.username;
            const memberDisplay = `${newMember.toString()} (${memberNickname})`;

            if (removedRoles.size > 0) {
                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.ROLES_TAKEN_TITLE)
                    .setColor('#FF0000')
                    .addFields(
                        { name: languageStrings.USER, value: memberDisplay, inline: true },
                        { name: languageStrings.USER_ID, value: newMember.id.toString(), inline: false }
                    );

                if (moderator.id === newMember.id) {
                    embed.addFields({ 
                        name: languageStrings.TYPE, 
                        value: languageStrings.ROLES_SELF_TAKEN_TYPE, 
                        inline: false 
                    });
                } else {
                    embed.addFields({ 
                        name: languageStrings.TYPE, 
                        value: languageStrings.ROLES_TAKEN_TYPE, 
                        inline: false 
                    });
                }

                embed.addFields(
                    { name: languageStrings.MODERATOR, value: moderatorDisplay, inline: false },
                    { 
                        name: languageStrings.TAKEN_ROLE, 
                        value: removedRoles.map(role => `<@&${role.id}>`).join(', '), 
                        inline: false 
                    },
                    { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                );

                await channel.send({ embeds: [embed] });
            }

            if (addedRoles.size > 0) {
                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.ROLES_GIVEN_TITLE)
                    .setColor('#00FF00')
                    .addFields(
                        { name: languageStrings.USER, value: memberDisplay, inline: true },
                        { name: languageStrings.USER_ID, value: newMember.id.toString(), inline: false }
                    );

                if (moderator.id === newMember.id) {
                    embed.addFields({ 
                        name: languageStrings.TYPE, 
                        value: languageStrings.ROLES_SELF_GIVEN_TYPE, 
                        inline: false 
                    });
                } else {
                    embed.addFields({ 
                        name: languageStrings.TYPE, 
                        value: languageStrings.ROLES_GIVEN_TYPE, 
                        inline: false 
                    });
                }

                embed.addFields(
                    { name: languageStrings.MODERATOR, value: moderatorDisplay, inline: false },
                    { 
                        name: languageStrings.ADDED_ROLE, 
                        value: addedRoles.map(role => `<@&${role.id}>`).join(', '), 
                        inline: false 
                    },
                    { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                );

                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in handleRoleUpdate:', error);
        }
    }
}

module.exports = {
    name: 'guildMemberUpdate',
    once: false,
    async execute(oldMember, newMember) {
        const roleEvents = new RoleEvents(oldMember.client);
        await roleEvents.handleRoleUpdate(oldMember, newMember);
    }
};