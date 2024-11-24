const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadMessageLogsChannelId, currentDateTime } = require('../utils/imports');


class BulkMessageDelete {
    constructor(client) {
        this.client = client;
    }

    async handleBulkDelete(messages) {
        if (messages.size === 0) return;
        const firstMessage = messages.first();
        if (!firstMessage?.guild) return;

        try {
            const serverLanguage = await getServerLanguage(firstMessage.guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const channelLogId = await loadMessageLogsChannelId(firstMessage.guild.id);
            if (!channelLogId) return;
            const logsChannel = firstMessage.guild.channels.cache.get(channelLogId);
            if (!logsChannel) return;

            const embed = new EmbedBuilder()
                .setTitle(languageStrings.MASS_MESSAGE_DELETE_TITLE)
                .setColor('#FF0000')
                .addFields({ 
                    name: languageStrings.CHANNEL, 
                    value: firstMessage.channel.toString(), 
                    inline: false 
                });

            for (const [, message] of messages) {
                if (message.author.bot) continue;

                const content = message.content;
                const attachments = message.attachments;
                const stickers = message.stickers;

                const hasInvite = content?.includes('discord.gg/') || content?.includes('discord.com/invite/');
                const warningMessage = hasInvite 
                    ? `\`\`\`diff\n- ${languageStrings.MESSAGE_HAD_INVITE}\n\`\`\``
                    : '';

                if (content) {
                    embed.addFields({ 
                        name: `${languageStrings.DELETED_BY} ${message.author.tag}`, 
                        value: `${languageStrings.CONTENT}: \`\`\`${content}\`\`\``, 
                        inline: false 
                    });

                } else {
                    embed.addFields({ 
                        name: `${languageStrings.DELETED_BY} ${message.author.tag}`, 
                        value: '\u200B', 
                        inline: false 
                    });
                }

                if (message.reactions.cache.size > 0) {
                    const reactionsInfo = Array.from(message.reactions.cache.values())
                        .map(reaction => `${reaction.emoji} (${reaction.count})`)
                        .join(' ');

                    if (reactionsInfo) {
                        embed.addFields({ 
                            name: languageStrings.REACTIONS, 
                            value: reactionsInfo, 
                            inline: false 
                        });
                    }
                }

                if (attachments.size > 0) {
                    const attachmentInfo = attachments.map(attachment => 
                        `${attachment.name} (${(attachment.size / (1024 * 1024)).toFixed(2)} MB)`
                    ).join('\n');

                    embed.addFields({ 
                        name: languageStrings.ATTACHMENTS_FIELD, 
                        value: attachmentInfo, 
                        inline: false 
                    });
                }

                if (stickers.size > 0) {
                    const stickersInfo = Array.from(stickers.values())
                        .map(sticker => sticker.name)
                        .join(' ');

                    embed.addFields({ 
                        name: languageStrings.STICKERS_FIELD, 
                        value: stickersInfo, 
                        inline: false 
                    });
                }

                if (warningMessage) {
                    embed.addFields({ 
                        name: languageStrings.WARNING_LINK_IN_MESSAGE, 
                        value: warningMessage, 
                        inline: false,
                    });
                }
            }

            embed.addFields({ 
                name: languageStrings.TODAY_AT, 
                value: currentDateTime(), 
                inline: true 
            });

            await logsChannel.send({ embeds: [embed] });
            for (const [, message] of messages) {
                const attachments = message.attachments;
                const stickers = message.stickers;

                for (const [, attachment] of attachments) {
                    try {
                        await logsChannel.send({
                            content: `${languageStrings.DELETED_ATTACHMENT}: ${attachment.name}`,
                            files: [{
                                attachment: attachment.url,
                                name: `SPOILER_${attachment.name}`,
                                description: `${(attachment.size / (1024 * 1024)).toFixed(2)} MB`
                            }]
                        });

                    } catch (error) {
                        console.error('Error sending attachment:', error);
                        await logsChannel.send({
                            content: `${languageStrings.ATTACHMENT_ERROR}: ${attachment.name}\n${attachment.url}`
                        }).catch(console.error);
                    }
                }

                for (const [, sticker] of stickers) {
                    try {
                        if (sticker.url) {
                            await logsChannel.send({
                                content: `${languageStrings.DELETED_STICKER}: ${sticker.name}`,
                                files: [{
                                    attachment: sticker.url,
                                    name: `SPOILER_sticker_${sticker.name}.png`
                                }]
                            });
                        }
                    } catch (error) {
                        console.error('Error sending sticker:', error);
                        await logsChannel.send({
                            content: `${languageStrings.STICKER_ERROR}: ${sticker.name}\n${sticker.url}`
                        }).catch(console.error);
                    }
                }
            }

        } catch (error) {
            console.error('Error in handleBulkDelete:', error);
        }
    }
}

module.exports = {
    name: 'messageDeleteBulk',
    once: false,
    async execute(messages) {
        const bulkMessageDelete = new BulkMessageDelete(messages.first()?.client);
        await bulkMessageDelete.handleBulkDelete(messages);
    }
};