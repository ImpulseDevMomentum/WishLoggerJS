const { EmbedBuilder, Events, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadMemberLogsChannelId, currentDateTime } = require('../utils/imports');


// Napraw to ze nie wykrywa kickow


class MemberRemove {
    constructor(client) {
        this.client = client;
    }

    async handleMemberRemove(member) {
        try {
            // console.log('1. Starting handleMemberRemove');
            
            const serverLanguage = await getServerLanguage(member.guild.id);
            // console.log('2. Server language:', serverLanguage);

            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );
            // console.log('3. Language strings loaded');

            const channelLogId = await loadMemberLogsChannelId(member.guild.id);
            // console.log('4. Channel log ID:', channelLogId);
            
            if (!channelLogId) {
                // console.log('No log channel ID found');
                return;
            }

            const channel = member.guild.channels.cache.get(channelLogId);
            // console.log('5. Log channel found:', !!channel);
            
            if (!channel) {
                // console.log('Could not find log channel');
                return;
            }

            let embed = new EmbedBuilder();
            // console.log('6. Created embed');

            if (member.user.bot) {
                // console.log('7. Processing bot removal');
                embed
                    .setTitle(languageStrings.BOT_REMOVED_TITLE)
                    .setColor('#FF0000')
                    .addFields(
                        { name: languageStrings.NAME, value: member.user.username, inline: false }
                    );

                let deauthorizedBy = languageStrings.UNKNOWN;
                const auditLogs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberKick,
                    limit: 1
                });

                const kickLog = auditLogs.entries.first();
                if (kickLog && kickLog.target.id === member.id) {
                    deauthorizedBy = kickLog.executor.toString();
                }

                embed.addFields({ 
                    name: languageStrings.DEAUTHORIZED_BY, 
                    value: deauthorizedBy, 
                    inline: false 
                });
            } else {
                // console.log('7. Processing user removal');
                
                // Check for ban
                const banLogs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberBanAdd,
                    limit: 1
                });
                // console.log('8. Fetched ban logs');

                const banLog = banLogs.entries.first();
                const banTime = banLog?.createdAt;
                const banTimeDiff = banTime ? (new Date() - banTime) / 1000 : null;

                // console.log('Ban check:', {
                //     hasBanLog: !!banLog,
                //     targetId: banLog?.target?.id,
                //     memberId: member.id,
                //     banTimeDiff
                // });

                if (banLog?.target?.id === member.id && banTimeDiff !== null && banTimeDiff < 5) {
                    // console.log('User was banned, skipping');
                    return;
                }

                // console.log('9. Creating user left embed');
                embed = new EmbedBuilder()
                    .setTitle(languageStrings.USER_LEFT_TITLE)
                    .setColor('#FF0000')
                    .addFields(
                        { name: languageStrings.USER, value: member.toString(), inline: false },
                        { name: languageStrings.USER_ID, value: member.id.toString(), inline: false }
                    );

                const roles = member.roles.cache
                    .filter(role => role.id !== member.guild.id)
                    .map(role => role.toString());

                embed.addFields({ 
                    name: languageStrings.ROLES, 
                    value: roles.length ? roles.join(', ') : languageStrings.NONE, 
                    inline: false 
                });

                const highestRole = member.roles.highest.id !== member.guild.id ? 
                    member.roles.highest.toString() : 
                    languageStrings.NONE;

                embed.addFields(
                    { name: languageStrings.HIGHEST_ROLE, value: highestRole, inline: false }
                );

                const joinDate = member.joinedAt ? 
                    member.joinedAt.toLocaleString('en-US', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }) : 
                    languageStrings.UNKNOWN;

                embed.addFields(
                    { name: languageStrings.JOINED_AT, value: joinDate, inline: false }
                );

                if (member.joinedAt) {
                    const timeSpent = new Date() - member.joinedAt;
                    const days = Math.floor(timeSpent / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((timeSpent % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((timeSpent % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((timeSpent % (1000 * 60)) / 1000);
                    const timeSpentStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

                    embed.addFields(
                        { name: languageStrings.TIME_SPENT_IN_SERVER, value: timeSpentStr, inline: false }
                    );
                }

                // console.log('10. Checking for kick');
                let kicked = false;

                const kickLogs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberKick,
                    limit: 1
                });

                for (const [, entry] of kickLogs.entries) {
                    if (entry.target.id === member.id && 
                        (Date.now() - entry.createdTimestamp) / 1000 < 10) {
                        kicked = false;
                        embed.addFields(
                            { 
                                name: languageStrings.ACTION, 
                                value: languageStrings.KICKED_ACTION.replace('{user}', entry.executor.toString()), 
                                inline: false 
                            },
                            { 
                                name: languageStrings.MODERATOR, 
                                value: entry.executor.toString(), 
                                inline: false 
                            }
                        );
                        break;
                    }
                }

                if (!kicked) {
                    embed.addFields({ 
                        name: languageStrings.ACTION, 
                        value: languageStrings.USER_LEFT_ACTION, 
                        inline: false 
                    });
                }
            }

            // console.log('13. Adding timestamp');
            embed.addFields({ 
                name: languageStrings.TODAY_AT, 
                value: currentDateTime(), 
                inline: false 
            });

            // console.log('14. Sending embed');
            await channel.send({ embeds: [embed] });
            // console.log('15. Embed sent successfully');

        } catch (error) {
            console.error('Error in handleMemberRemove:', error);
            console.error('Error stack:', error.stack);
        }
    }
}

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member) {
        // console.log('MemberRemove execute called');
        const memberRemove = new MemberRemove(member.client);
        await memberRemove.handleMemberRemove(member);
    }
};
