const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadMemberLogsChannelId, currentDateTime } = require('../utils/imports');


class MemberUnban {
    constructor(client) {
        this.client = client;
    }

    removeBanData(guildId, userId) {
        try {
            const data = JSON.parse(fs.readFileSync('ban_reasons.json', 'utf8'));
            if (!data) {
                console.log("No data found in ban_reasons.json");
                return;
            }

            if (data[guildId]) {
                const reasonsToRemove = Object.entries(data[guildId])
                    .filter(([, value]) => value.user_id === userId.toString())
                    .map(([key]) => key);

                if (reasonsToRemove.length > 0) {
                    reasonsToRemove.forEach(reasonId => {
                        delete data[guildId][reasonId];
                    });
                    fs.writeFileSync('ban_reasons.json', JSON.stringify(data, null, 4));

                } else {
                    console.log(`No ban data found for user ID ${userId} in guild ID ${guildId}.`);
                }
            } else {
                console.log(`No records found for guild ID ${guildId}.`);
            }

        } catch (error) {
            console.error('Error in removeBanData:', error);
        }
    }

    async handleUnban(guild, user) {
        try {
            const serverLanguage = await getServerLanguage(guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const channelLogId = await loadMemberLogsChannelId(guild.id);
            if (!channelLogId) return;
            const logsChannel = guild.channels.cache.get(channelLogId);
            if (!logsChannel) return;

            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanRemove,
                limit: 1
            });

            const auditEntry = auditLogs.entries.first();
            if (!auditEntry || auditEntry.target?.id !== user.id) return;
            const moderator = auditEntry.executor;

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle(languageStrings.UNBANNED_USER_TITLE)
                .addFields(
                    { name: languageStrings.USER, value: `<@${user.id}> (${user.username})`, inline: false },
                    { name: languageStrings.USER_ID, value: user.id.toString(), inline: false },
                    { name: languageStrings.MODERATOR, value: `<@${moderator.id}> (${moderator.username})`, inline: false },
                    { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false },
                    { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: false }
                );

            await logsChannel.send({ embeds: [embed] });
            this.removeBanData(guild.id, user.id);
        } catch (error) {
            console.error('Error in handleUnban:', error);
        }
    }
}

module.exports = {
    name: 'guildBanRemove',
    once: false,
    async execute(ban) {
        const memberUnban = new MemberUnban(ban.client);
        await memberUnban.handleUnban(ban.guild, ban.user);
    }
};