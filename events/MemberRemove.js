const { AuditLogEvent } = require('discord.js');
const MemberKicked = require('./MemberKicked');
const MemberLeft = require('./MemberLeft');

class MemberRemove {
    constructor(client) {
        this.client = client;
        this.memberKicked = new MemberKicked(client);
        this.memberLeft = new MemberLeft(client);
    }

    async handleMemberRemove(member) {
        try {
            console.log('MemberRemove event triggered for:', member.user.tag);

            // Dodajemy opóźnienie
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Sprawdzamy audit logi
            const auditLogs = await member.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MemberKick
            });

            console.log('Fetched audit logs:', auditLogs.entries.size);
            
            const kickLog = auditLogs.entries.first();
            const kickTimeDiff = kickLog ? (Date.now() - kickLog.createdTimestamp) / 1000 : null;

            console.log('Kick log analysis:', {
                found: !!kickLog,
                targetMatches: kickLog?.target?.id === member.id,
                timeDiff: kickTimeDiff,
                timeThresholdMet: kickTimeDiff < 180, // Zwiększamy próg do 3 minut
                executor: kickLog?.executor?.tag
            });
            
            if (kickLog && 
                kickLog.target?.id === member.id && 
                kickTimeDiff !== null && 
                kickTimeDiff < 180) { // Zwiększamy próg do 3 minut
                console.log(`User was kicked by ${kickLog.executor?.tag}, time diff: ${kickTimeDiff}s`);
                await this.memberKicked.handleKick(member, kickLog.executor);
                return;
            }

            // Sprawdzamy ban (tylko jeśli nie było kicka)
            const banLogs = await member.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MemberBanAdd
            });

            const banLog = banLogs.entries.first();
            const banTimeDiff = banLog ? (Date.now() - banLog.createdTimestamp) / 1000 : null;

            if (banLog && 
                banLog.target?.id === member.id && 
                banTimeDiff !== null && 
                banTimeDiff < 180) { // Również zwiększamy próg dla bana
                console.log(`User was banned - skipping member remove handler (time diff: ${banTimeDiff}s)`);
                return;
            }

            // Jeśli nie był to kick ani ban, to znaczy że user wyszedł sam
            console.log('User left voluntarily (no recent kick or ban found)');
            await this.memberLeft.handleLeave(member);

        } catch (error) {
            console.error('Error in handleMemberRemove:', error);
            console.error('Error stack:', error.stack);
        }
    }
}

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    async execute(member) {
        console.log('Member remove event executed for:', member.user.tag);
        const memberRemove = new MemberRemove(member.client);
        await memberRemove.handleMemberRemove(member);
    }
};