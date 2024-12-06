const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadMessageLogsChannelId, currentDateTime } = require('../utils/imports');

class MessageEdit {
    constructor(client) {
        this.client = client;
    }

    async handleMessageEdit(oldMessage, newMessage) {
        try {
            
            if (!oldMessage.guild || oldMessage.author.bot) {
                return;
            }
            
            const serverLanguage = await getServerLanguage(oldMessage.guild.id);
            
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );
            
            const channelLogId = await loadMessageLogsChannelId(oldMessage.guild.id);
            
            if (!channelLogId) {
                return;
            }

            const logChannel = oldMessage.guild.channels.cache.get(channelLogId);
            if (!logChannel) {
                return;
            }

            if (oldMessage.content === newMessage.content) return;

            const truncateLength = 710;
            const messageUrl = `https://discord.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id}`;

            const embed = new EmbedBuilder()
                .setTitle(`${languageStrings.EDITED_MESSAGE_TITLE}`)
                .setColor('#FFA500');

            const truncateMessage = (message) => {
                return message.length > truncateLength 
                    ? message.substring(0, truncateLength) + "..."
                    : message;
            };

            const originalMessage = truncateMessage(oldMessage.content);
            const editedMessage = truncateMessage(newMessage.content);

            embed.addFields(
                { name: `${languageStrings.USER}`, value: `<@${oldMessage.author.id}> (${oldMessage.author.tag})`, inline: false },
                { name: `${languageStrings.ORIGINAL_MESSAGE}`, value: originalMessage, inline: false },
                { name: `${languageStrings.EDITED_MESSAGE}`, value: editedMessage, inline: false },
                { name: `${languageStrings.JUMP_TO_MESSAGE}`, value: `[${languageStrings.CLICK_HERE}](${messageUrl})`, inline: false },
                { name: `${languageStrings.CHANNEL}`, value: `<#${oldMessage.channel.id}>`, inline: false },
                { name: `${languageStrings.TODAY_AT}`, value: currentDateTime(), inline: true }
            );

            if (oldMessage.content.length > truncateLength || newMessage.content.length > truncateLength) {
                const fileContent = 
                    `${languageStrings.MESSAGE_EDITED_ORIGINAL_BEFORE}\n${oldMessage.content}\n\n` +
                    `${languageStrings.MESSAGE_EDITED_ORIGINAL_AFTER}\n${newMessage.content}\n`;
                
                const fileName = `message_edit_${oldMessage.id}.txt`;
                fs.writeFileSync(fileName, fileContent, 'utf8');

                await logChannel.send({ embeds: [embed] });
                await logChannel.send({ files: [fileName] });

                fs.unlinkSync(fileName);
            } else {
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in handleMessageEdit:', error);
        }
    }
}

module.exports = {
    name: 'messageUpdate',
    once: false,
    async execute(oldMessage, newMessage) {
        try {
            if (!oldMessage || !oldMessage.content) return;
            const messageEdit = new MessageEdit(oldMessage.client);
            await messageEdit.handleMessageEdit(oldMessage, newMessage);
        } catch (error) {
            console.error('Error in messageUpdate event:', error);
        }
    }
}; 