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
            .setTitle(`${languageStrings.DELETED_MESSAGE_TITLE}`)
            .setColor('#FF0000');
        embed.addFields(
            { name: `${languageStrings.USER}`, value: `<@${message.author.id}> (${message.author.tag})`, inline: false }
        );
        if (truncatedContent) {
            embed.addFields({ 
                name: `${languageStrings.CONTENT}`, 
                value: truncateField(truncatedContent),
                inline: false 
            });
        }
        embed.addFields(
            { name: `${languageStrings.CHANNEL}`, value: `<#${message.channel.id}>`, inline: true },
            { name: `${languageStrings.TODAY_AT}`, value: currentDateTime(), inline: false }
        );
        await logChannel.send({ embeds: [embed] });
        if (content && content.length > truncateLength) {
            const fileName = `deleted_message_${message.id}.txt`;
            const fileContent = 
                `${languageStrings.MESSAGE_DELETED_FULL}\n${content}`;
            
            fs.writeFileSync(fileName, fileContent, 'utf8');
            
            try {
                await logChannel.send({
                    files: [fileName]
                });
                
                fs.unlinkSync(fileName);
            } catch (error) {
                console.error('Error sending full message content:', error);
            }
        }
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
                        .setTitle(`${languageStrings.STICKERS_FIELD_EMOJI} Name: __${sticker.name}__`)
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