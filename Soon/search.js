const { SlashCommandBuilder } = require('discord.js');
const { getServerLanguage } = require('../utils/imports.js');

const DEFAULT_MESSAGES = {
    SEARCH_NO_BAN_LOGS_FOUND: "No ban logs found in the last 100 messages.",
    SEARCH_FOUND_BAN_LOG: "Found ban log:",
    SEARCH_NO_USER_MESSAGES_FOUND: "No messages found from this user in the last 100 messages.",
    SEARCH_FOUND_USER_MESSAGE: "Found user's last message:",
    SEARCH_INVALID_QUERY: "Invalid search query. Please use either 'Last Ban Log' or 'Last Message of (username)'",
    ERROR_OCCURRED: "An error occurred while executing this command."
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for specific messages in the channel')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('What to search for (e.g., "Last Ban Log" or "Last Message of @user")')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const query = interaction.options.getString('query').toLowerCase();
        const channel = interaction.channel;
        const language = await getServerLanguage(interaction.guild.id) || {};

        try {
            if (query.includes('last ban log')) {
                const messages = await channel.messages.fetch({ limit: 100 });
                const banLog = messages.find(msg => 
                    msg.content?.toLowerCase().includes('banned') || 
                    msg.content?.toLowerCase().includes('ban')
                );

                if (!banLog) {
                    return await interaction.editReply({ 
                        content: language.SEARCH_NO_BAN_LOGS_FOUND || DEFAULT_MESSAGES.SEARCH_NO_BAN_LOGS_FOUND
                    });
                }

                await interaction.editReply({ 
                    content: `${language.SEARCH_FOUND_BAN_LOG || DEFAULT_MESSAGES.SEARCH_FOUND_BAN_LOG}\n${banLog.url}`
                });

            } else if (query.toLowerCase().includes('last message of')) {
                let username = query.split('last message of')[1].trim();
                username = username.replace(/[@<>]/g, '');
                
                const messages = await channel.messages.fetch({ limit: 100 });
                
                const userMessage = messages.find(msg => {
                    if (!msg.author) return false;
                    
                    const authorName = msg.author.username.toLowerCase();
                    const authorId = msg.author.id;
                    const nickName = msg.member?.nickname?.toLowerCase() || '';
                    
                    return authorName.includes(username.toLowerCase()) || 
                           nickName.includes(username.toLowerCase()) ||
                           authorId === username;
                });

                if (!userMessage) {
                    return await interaction.editReply({ 
                        content: language.SEARCH_NO_USER_MESSAGES_FOUND || DEFAULT_MESSAGES.SEARCH_NO_USER_MESSAGES_FOUND
                    });
                }

                await interaction.editReply({ 
                    content: `${language.SEARCH_FOUND_USER_MESSAGE || DEFAULT_MESSAGES.SEARCH_FOUND_USER_MESSAGE}\n${userMessage.url}`
                });

            } else {
                await interaction.editReply({ 
                    content: language.SEARCH_INVALID_QUERY || DEFAULT_MESSAGES.SEARCH_INVALID_QUERY
                });
            }

        } catch (error) {
            console.error(error);
            await interaction.editReply({ 
                content: language.ERROR_OCCURRED || DEFAULT_MESSAGES.ERROR_OCCURRED
            });
        }
    },
};