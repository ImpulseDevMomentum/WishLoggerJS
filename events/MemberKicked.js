const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadMemberLogsChannelId, currentDateTime } = require('../utils/imports');

class MemberKicked {
    constructor(client) {
        this.client = client;
    }

    async handleKick(member, executor) {
        try {
            const serverLanguage = await getServerLanguage(member.guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const channelLogId = await loadMemberLogsChannelId(member.guild.id);
            if (!channelLogId) return;

            const channel = member.guild.channels.cache.get(channelLogId);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.USER_KICKED_TITLE)
                .setColor('#FF0000')
                .addFields(
                    { name: languageStrings.USER, value: member.toString(), inline: false },
                    { name: languageStrings.USER_ID, value: member.id.toString(), inline: false }
                );

            // Add roles information
            const roles = member.roles.cache
                .filter(role => role.id !== member.guild.id)
                .map(role => role.toString());

            embed.addFields(
                { 
                    name: languageStrings.KICKED_BY, 
                    value: `${executor.toString()}`, 
                    inline: false
                }
            );

            embed.addFields({ 
                name: languageStrings.ROLES, 
                value: roles.length ? roles.join(', ') : languageStrings.NONE, 
                inline: false 
            });

            // Highest role
            const highestRole = member.roles.highest.id !== member.guild.id ? 
                member.roles.highest.toString() : 
                languageStrings.NONE;

            embed.addFields(
                { name: languageStrings.HIGHEST_ROLE, value: highestRole, inline: false }
            );

            // Join date and time spent
            if (member.joinedAt) {
                const joinDate = member.joinedAt.toLocaleString('en-US', { 
                    month: '2-digit', 
                    day: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });

                const timeSpent = new Date() - member.joinedAt;
                const days = Math.floor(timeSpent / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeSpent % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeSpent % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeSpent % (1000 * 60)) / 1000);
                const timeSpentStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

                embed.addFields(
                    { name: languageStrings.JOINED_AT, value: joinDate, inline: false },
                    { name: languageStrings.TIME_SPENT_IN_SERVER, value: timeSpentStr, inline: false }
                );
            }

            embed.addFields({ 
                name: languageStrings.TODAY_AT, 
                value: currentDateTime(), 
                inline: false 
            });

            await channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in handleKick:', error);
        }
    }
}

module.exports = MemberKicked; 