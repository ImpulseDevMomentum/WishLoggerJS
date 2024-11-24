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
            // console.log(`Successfully saved ban data for user ${banData.user_id} in guild ${guildId}`);
        } catch (error) {
            console.error('Error saving ban reason:', error);
        }
    }

    async handleBan(guild, user) {
        try {
            // console.log(`[DEBUG] Starting handleBan for user ${user.tag} in guild ${guild.name}`);
            const channelLogId = await loadMemberLogsChannelId(guild.id);
            // console.log(`[DEBUG] Loaded channel log ID: ${channelLogId}`);
            if (!channelLogId) {
                // console.log('[DEBUG] No log channel ID found, returning');
                return;
            }
            const logsChannel = guild.channels.cache.get(channelLogId);
            // console.log(`[DEBUG] Found logs channel: ${logsChannel?.name || 'Not found'}`);
            if (!logsChannel) {
                // console.log('[DEBUG] Logs channel not found in cache, returning');
                return;
            }
            // console.log('[DEBUG] Fetching audit logs...');
            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 1
            });
            const auditEntry = auditLogs.entries.first();
            // console.log(`[DEBUG] Audit entry found: ${!!auditEntry}, Target matches: ${auditEntry?.target?.id === user.id}`);
            if (!auditEntry || auditEntry.target?.id !== user.id) {
                // console.log('[DEBUG] No matching audit entry found, returning');
                return;
            }
            // console.log('[DEBUG] Loading server language...');
            const serverLanguage = await getServerLanguage(guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );
            const moderator = auditEntry.executor;
            const reasonId = this.generateReasonId();
            const reason = auditEntry.reason || languageStrings.MODERATOR_USE.replace('{reason_id}', reasonId);
            // console.log(`[DEBUG] Creating embed with reason: ${reason}`);
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
            // console.log('[DEBUG] Sending embed to logs channel...');
            const logMessage = await logsChannel.send({ embeds: [embed] });
            // console.log('[DEBUG] Embed sent successfully');
            const banData = {
                user_id: user.id.toString(),
                reason: reason,
                log_message_id: logMessage.id,
                log_channel_id: logsChannel.id
            };
            // console.log('[DEBUG] Saving ban data...');
            this.saveBanReason(guild.id, reasonId, banData);
            // console.log('[DEBUG] Ban data saved successfully');
        } catch (error) {
            console.error('Error in handleBan:', error);
            // if (error.code) console.error('Error code:', error.code);
            // if (error.message) console.error('Error message:', error.message);
            // if (error.stack) console.error('Stack trace:', error.stack);
        }
    }
}
module.exports = {
    name: 'guildBanAdd',
    once: false,
    async execute(ban) {
        // console.log('[DEBUG] guildBanAdd event triggered');
        const memberBan = new MemberBan(ban.client);
        await memberBan.handleBan(ban.guild, ban.user);
    }
};