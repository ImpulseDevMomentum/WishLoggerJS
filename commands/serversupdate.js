const { SlashCommandBuilder } = require('discord.js');
const { allowedUserIds } = require('../utils/allowedUsers');
// const { getServerLanguage } = require('../utils/language');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serversupdate')
        .setDescription('Update servers status via command'),
        
    async execute(interaction) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
            return;
        }

        if (!allowedUserIds.includes(interaction.user.id)) {
            const serverLanguage = getServerLanguage(interaction.guildId);
            const languageFile = `language/${serverLanguage}.json`;
            
            try {
                const languageStrings = require(`../${languageFile}`);
                await interaction.reply({ content: "You do not have access to use this command", ephemeral: true });
            } catch (error) {
                await interaction.reply({ 
                    content: "Language file not found. Please contact the administrator.", 
                    ephemeral: true 
                });
            }
            return;
        }

        const serverCount = interaction.client.guilds.cache.size;
        await interaction.client.user.setActivity(`/help | ${serverCount} servers`, { type: 'WATCHING' });
        await interaction.reply({ 
            content: `Server status was updated to ${serverCount} servers.`, 
            ephemeral: true 
        });
    },
}; 