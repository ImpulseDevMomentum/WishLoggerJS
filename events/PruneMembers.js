const { AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        try {
            // Sprawdź czy bot ma jeszcze dostęp do serwera
            const guild = member.guild;
            if (!guild.available || !guild.members.me) return;

            // Sprawdź czy bot ma uprawnienia do przeglądania audit logów
            if (!guild.members.me.permissions.has('ViewAuditLog')) return;

            const auditLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MemberPrune
            });

            const pruneLog = auditLogs.entries.first();
            if (!pruneLog) return;

            // Reszta logiki związanej z obsługą prune...

        } catch (error) {
            // Ignoruj błędy 10004 (Unknown Guild), ponieważ oznaczają że bot został wyrzucony
            if (error.code === 10004) return;
            console.error('Error in PruneMembers event:', error);
        }
    }
};