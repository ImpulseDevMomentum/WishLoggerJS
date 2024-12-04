const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadMemberLogsChannelId, currentDateTime } = require('../utils/imports');


class MemberBan {
    constructor(client) {
        this.client = client;
    }

    generateReasonId() {
        return Math.floor(Math.random() * (999999999 - 100000000 + 1) + 100000000).toString();
    }

    saveBanReason(guildId, reasonId, banData) {
        try {
            let data = {};
            if (fs.existsSync('ban_reasons.json')) {
                data = JSON.parse(fs.readFileSync('ban_reasons.json', 'utf8'));
            }
            if (!data[guildId]) {
                data[guildId] = {};
            }

            data[guildId][reasonId] = banData;
            fs.writeFileSync('ban_reasons.json', JSON.stringify(data, null, 4));
        } catch (error) {
            console.error('Error saving ban reason:', error);
        }
    }

    async handleBan(guild, user) {
        try {
            const channelLogId = await loadMemberLogsChannelId(guild.id);
            if (!channelLogId) {
                return;
            }

            const logsChannel = guild.channels.cache.get(channelLogId);

            if (!logsChannel) {
                return;
            }

            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 1
            });

            const auditEntry = auditLogs.entries.first();

            if (!auditEntry || auditEntry.target?.id !== user.id) {
                return;
            }

            const serverLanguage = await getServerLanguage(guild.id);

            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const moderator = auditEntry.executor;
            const reasonId = this.generateReasonId();
            const reason = auditEntry.reason || languageStrings.MODERATOR_USE.replace('{reason_id}', reasonId);

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.BANNED_USER_TITLE)
                .setColor('#8B0000')
                .addFields(
                    { name: languageStrings.USER, value: `<@${user.id}> (${user.username})`, inline: true },
                    { name: languageStrings.MODERATOR, value: `<@${moderator.id}> (${moderator.username})`, inline: false },
                    { name: languageStrings.MODERATOR_ID, value: moderator.id.toString(), inline: false },
                    { name: languageStrings.REASON, value: reason, inline: false },
                    { name: languageStrings.USER_ID, value: user.id.toString(), inline: false },
                    { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: false }
                );

            const logMessage = await logsChannel.send({ embeds: [embed] });

            const banData = {
                user_id: user.id.toString(),
                reason: reason,
                log_message_id: logMessage.id,
                log_channel_id: logsChannel.id
            };

            this.saveBanReason(guild.id, reasonId, banData);

        } catch (error) {
            console.error('Error in handleBan:', error);
        }
    }
}

module.exports = {
    name: 'guildBanAdd',
    once: false,
    async execute(ban) {
        const memberBan = new MemberBan(ban.client);
        await memberBan.handleBan(ban.guild, ban.user);
    }
};
