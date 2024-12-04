const { Events, AuditLogEvent } = require('discord.js');

module.exports = [
    {
        name: Events.GuildMemberRemove,
        once: false,
        async execute(member) {
            try {
                const guild = member.guild;
                if (!guild.available || !guild.members.me) return;

                if (!guild.members.me.permissions.has('ViewAuditLog')) return;

                const auditLogs = await guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.MemberPrune
                });

                const pruneLog = auditLogs.entries.first();
                if (!pruneLog) return;

            } catch (error) {
                if (error.code === 10004) return;
                console.error('Error in PruneMembers event:', error);
            }
        }
    }
];