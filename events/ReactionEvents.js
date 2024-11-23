const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadReactionLogsChannelId, currentDateTime } = require('../utils/imports');

const TRUNCATE_LIMIT = 480;

class ReactionEvents {
    constructor(client) {
        this.client = client;
    }

    async handleReactionRemove(reaction, user) {
        try {
            const guild = reaction.message.guild;
            if (!guild) return;

            const serverLanguage = await getServerLanguage(guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const channelLogId = await loadReactionLogsChannelId(guild.id);
            if (!channelLogId) return;

            const logsChannel = guild.channels.cache.get(channelLogId);
            if (!logsChannel) return;

            let message;
            try {
                message = !reaction.message ? 
                    await reaction.message.channel.messages.fetch(reaction.message.id) : 
                    reaction.message;
            } catch (error) {
                console.error('Could not fetch message:', error);
                return;
            }

            if (!message) return;

            const originalContent = message.content || languageStrings.NO_CONTENT;
            const truncatedContent = originalContent.length > TRUNCATE_LIMIT ? 
                `${originalContent.substring(0, TRUNCATE_LIMIT)}...` : 
                originalContent;

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.REACTION_REMOVED_TITLE)
                .setColor('#FF0000')
                .addFields(
                    { name: languageStrings.USER, value: user.toString(), inline: true },
                    { name: languageStrings.USER_ID, value: user.id.toString(), inline: true },
                    { name: languageStrings.EMOJI, value: reaction.emoji.toString(), inline: true },
                    { name: languageStrings.CHANNEL, value: message.channel.toString(), inline: true },
                    { name: languageStrings.MESSAGE, value: message.url, inline: true },
                    { name: languageStrings.MESSAGE_CONTENT, value: `\`\`\`${truncatedContent}\`\`\``, inline: false },
                    { name: languageStrings.MESSAGE_ID, value: message.id.toString(), inline: true },
                    { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                );

            await logsChannel.send({ embeds: [embed] });

            if (originalContent.length > TRUNCATE_LIMIT) {
                const fullContent = `${languageStrings.FULL_MESSAGE_CONTENT_IN_EMOJI_LOG}\n${originalContent}`;
                const buffer = Buffer.from(fullContent, 'utf-8');
                await logsChannel.send({
                    files: [{
                        attachment: buffer,
                        name: `message_content_${message.id}.txt`
                    }]
                });
            }
        } catch (error) {
            console.error('Error in handleReactionRemove:', error);
        }
    }
}

module.exports = {
    name: 'messageReactionRemove',
    once: false,
    async execute(reaction, user) {
        const reactionEvents = new ReactionEvents(reaction.client);
        await reactionEvents.handleReactionRemove(reaction, user);
    }
};