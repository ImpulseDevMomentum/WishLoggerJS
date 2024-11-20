const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('terms')
        .setDescription('View Wish\'s Terms of Service'),
        
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Terms of Service')
            .setDescription(
                'Click the link below to view Wish\'s Terms of Service. ' +
                'It\'s important to review these terms to understand your rights and obligations.'
            )
            .setColor(0x1E90FF)
            .addFields({
                name: 'Terms of Service',
                value: '[View Terms of Service]()',
                inline: false
            })
            .setFooter({ text: 'Thank you for using Wish!' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
}; 