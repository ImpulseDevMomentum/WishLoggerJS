const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadReactionLogsChannelId, currentDateTime } = require('../utils/imports');

class RawReactionRemoval {
    constructor(client) {
        this.client = client;
    }

    async handleRawReactionClear(payload) {
        try {
            const guildId = payload.guildId;
            const logsChannelId = await loadReactionLogsChannelId(guildId);

            if (!logsChannelId) return;

            const logsChannel = this.client.channels.cache.get(logsChannelId);
            if (!logsChannel) return;

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;

            const channel = guild.channels.cache.get(payload.channelId);
            if (!channel) return;

            const message = await channel.messages.fetch(payload.messageId);
            if (!message) return;

            const serverLanguage = await getServerLanguage(guildId);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MessageReactionRemoveEmoji,
                limit: 5
            });

            let moderator = languageStrings.UNKNOWN;
            let moderatorId = languageStrings.UNKNOWN;

            const auditEntry = auditLogs.entries.find(entry => 
                entry.target?.id === message.id && 
                Date.now() - entry.createdTimestamp < 5000
            );

            if (auditEntry && auditEntry.executor) {
                const executor = auditEntry.executor;
                try {
                    const member = await guild.members.fetch(executor.id);
                    const nickname = member ? member.nickname || executor.username : executor.username;
                    moderator = `${executor.toString()} (${nickname})`;
                    moderatorId = executor.id;
                } catch (error) {
                    console.error('Error fetching member:', error);
                    moderator = executor.toString();
                    moderatorId = executor.id;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.MASS_REACTIONS_CLEARED_TITLE)
                .setColor('#FFA500')
                .addFields(
                    // { name: languageStrings.MODERATOR, value: moderator, inline: false },
                    // { name: languageStrings.MODERATOR_ID, value: moderatorId.toString(), inline: false },
                    { name: languageStrings.CHANNEL, value: message.channel.toString(), inline: false },
                    { name: languageStrings.MESSAGE, value: `[${languageStrings.JUMP_TO_MESSAGE}](${message.url})`, inline: false },
                    { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                );

            await logsChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleRawReactionClear:', error);
        }
    }
}

module.exports = {
    name: 'messageReactionRemoveAll',
    once: false,
    async execute(message, reactions) {
        const rawReactionRemoval = new RawReactionRemoval(message.client);
        const payload = {
            guildId: message.guild.id,
            channelId: message.channel.id,
            messageId: message.id
        };
        await rawReactionRemoval.handleRawReactionClear(payload);
    }
};