const { EmbedBuilder } = require('discord.js');

const fs = require('fs');

const { getServerLanguage, loadMessageLogsChannelId, currentDateTime } = require('../utils/imports');



const MB_CACHE = 8;

const WORD_LIMIT = 500;

class MessageDelete {
    constructor(client) {
        this.client = client;
    }
    async handleMessageDelete(message) {
        if (!message.guild || message.author.bot) return;
        const serverLanguage = await getServerLanguage(message.guild.id);
        const languageStrings = JSON.parse(
            fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
        );
        const channelLogId = await loadMessageLogsChannelId(message.guild.id);
        if (!channelLogId) return;
        const logChannel = message.guild.channels.cache.get(channelLogId);
        if (!logChannel) return;
        const truncateLength = 850;
        const { attachments, stickers, content, reactions } = message;
        const hasInvite = content?.includes('discord.gg/') || content?.includes('discord.com/invite/');
        const warningMessage = hasInvite 
            ? `\`\`\`diff\n- ${languageStrings.MESSAGE_HAD_INVITE}\n\`\`\``
            : '';
        const truncatedContent = content?.length > truncateLength
            ? content.substring(0, truncateLength) + "..."
            : content;
        const truncateField = (value, maxLength = 1024) => {
            if (!value) return '';
            return value.length > maxLength 
                ? value.substring(0, maxLength - 3) + "..."
                : value;
        };
        const embed = new EmbedBuilder()
            .setTitle(':None0: Deleted Message')
            .setColor('#FF0000');
        embed.addFields(
            { name: ':Member: Member', value: `<@${message.author.id}> (${message.author.tag})`, inline: false }
        );
        if (truncatedContent) {
            embed.addFields({ 
                name: ':browsefotor: Content', 
                value: truncateField(truncatedContent),
                inline: false 
            });
        }
        if (attachments.size > 0) {
            const attachmentsList = Array.from(attachments.values())
                .map(att => `[${att.name}](${att.proxyURL})`)
                .join('\n');
            embed.addFields({ 
                name: ':attachments: Attachments', 
                value: truncateField(attachmentsList),
                inline: false 
            });
        }
        if (stickers.size > 0) {
            const stickersList = Array.from(stickers.values())
                .map(sticker => `${sticker.name}`)
                .join('\n');
            embed.addFields({ 
                name: ':stickers: Stickers', 
                value: truncateField(stickersList),
                inline: false 
            });
        }
        if (reactions && reactions.cache.size > 0) {
            try {
                const reactionsInfo = [];
                for (const reaction of reactions.cache.values()) {
                    let emojiString;
                    const emoji = reaction.emoji;
                    if (emoji.id) {
                        if (emoji.animated) {
                            emojiString = `<a:${emoji.name}:${emoji.id}>`;
                        } else {
                            emojiString = `<:${emoji.name}:${emoji.id}>`;
                        }
                    } else {
                        emojiString = emoji.name;
                    }
                    reactionsInfo.push(`${emojiString} (${reaction.count})`);
                }
                const reactionsText = reactionsInfo.join('\n');
                if (reactionsText) {
                    embed.addFields({ 
                        name: languageStrings.REACTIONS, 
                        value: truncateField(reactionsText),
                        inline: false 
                    });
                }
            } catch (error) {
                console.error('Error processing reactions:', error);
            }
        }
        if (warningMessage) {
            embed.addFields({ 
                name: languageStrings.WARNING_LINK_IN_MESSAGE, 
                value: truncateField(warningMessage),
                inline: false 
            });
        }
        embed.addFields(
            { name: ':channel: Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: ':time: Today at', value: currentDateTime(), inline: true }
        );
        await logChannel.send({ embeds: [embed] });
        if (attachments.size > 0) {
            const processedFiles = new Set();
            for (const attachment of attachments.values()) {
                try {
                    if (processedFiles.has(attachment.id)) continue;
                    const fileSizeMB = attachment.size / (1024 * 1024);
                    if (fileSizeMB <= MB_CACHE) {
                        const fileType = attachment.contentType?.split('/')[0] || 'File';
                        if (attachment.contentType === 'image/gif') {
                            const gifEmbed = new EmbedBuilder()
                                .setTitle(`GIF: ${attachment.name}`)
                                .setColor('#FF0000')
                                .setImage(attachment.proxyURL);
                            await logChannel.send({
                                content: `File: ${attachment.name} | Size: ${fileSizeMB.toFixed(2)} MB | Type: GIF`,
                                embeds: [gifEmbed]
                            });

                        } else {
                            const spoilerAttachment = {
                                attachment: attachment.proxyURL,
                                name: `SPOILER_${attachment.name}`
                            };
                            await logChannel.send({
                                content: `File: ${attachment.name} | Size: ${fileSizeMB.toFixed(2)} MB | Type: ${fileType}`,
                                files: [spoilerAttachment]
                            });
                        }
                        processedFiles.add(attachment.id);
                    } else {
                        await logChannel.send(
                            languageStrings.FILE_TOO_LARGE
                                .replace('{attachment_filename}', attachment.name)
                                .replace('{attachment_size}', `${fileSizeMB.toFixed(2)} MB`)
                                .replace('{MAX_FILE_SIZE}', MB_CACHE)
                        );
                    }
                } catch (error) {
                    console.error(`Error processing attachment ${attachment.name}:`, error);
                }
            }
        }
        if (stickers.size > 0) {
            for (const sticker of stickers.values()) {
                try {
                    const stickerEmbed = new EmbedBuilder()
                        .setTitle(`${languageStrings.STICKER}: ${sticker.name}`)
                        .setColor('#FF0000')
                        .setImage(sticker.url);
                    await logChannel.send({ embeds: [stickerEmbed] });
                } catch (error) {
                    console.error(`Error processing sticker ${sticker.name}:`, error);
                }
            }
        }
    }
}

module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message) {
        try {
            if (!message) return;
            const messageDelete = new MessageDelete(message.client);
            await messageDelete.handleMessageDelete(message);
        } catch (error) {
            console.error('Error in messageDelete event:', error);
        }
    }
}; 