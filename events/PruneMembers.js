const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getServerLanguage, loadMemberLogsChannelId, currentDateTime } = require('../utils/imports');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const auditLogs = await member.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberPrune,
            limit: 1
        });

        const pruneLog = auditLogs.entries.first();
        if (!pruneLog || pruneLog.createdTimestamp < (Date.now() - 60000)) return;

        const serverLanguage = getServerLanguage(member.guild.id);
        const languageStrings = require(`../language/${serverLanguage}.json`);

        const channelLogId = loadMemberLogsChannelId(member.guild.id);
        if (!channelLogId) return;

        const channel = member.guild.channels.cache.get(channelLogId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(languageStrings.PRUNE_MEMBERS_TITLE)
            .setColor('#FFA500')
            .addFields(
                { 
                    name: languageStrings.PRUNE_INITIATED_BY, 
                    value: `<@${pruneLog.executor.id}>`, 
                    inline: false 
                },
                { 
                    name: languageStrings.PRUNED_MEMBERS_COUNT, 
                    value: pruneLog.extra.removed.toString(), 
                    inline: true 
                },
                { 
                    name: languageStrings.TODAY_AT, 
                    value: currentDateTime(), 
                    inline: true 
                }
            );

        await channel.send({ embeds: [embed] });
    },
};