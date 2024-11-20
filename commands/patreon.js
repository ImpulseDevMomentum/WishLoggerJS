const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('patreon')
        .setDescription('Support us on Patreon'),
        
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Support Us on Patreon!')
            .setDescription(
                'If you\'d like to support our project, click the link below to visit our Patreon. ' +
                'Please note that joining is purely voluntary and you will not receive any additional ' +
                'benefits. However, your contribution will help us continue to grow the project. ' +
                'A $1 donation goes a long way, and we greatly appreciate your support!'
            )
            .setColor(0x1E90FF)
            .addFields({
                name: 'Patreon Link',
                value: '[Visit our Patreon]()',
                inline: false
            })
            .setFooter({ text: 'Thank you for supporting us!' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
}; 