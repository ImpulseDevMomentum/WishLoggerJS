const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('privacy')
        .setDescription('View Wish\'s Privacy Policy'),
        
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Privacy Policy')
            .setDescription(
                'Click the link below to view Wish\'s Privacy Policy. ' +
                'It\'s important to understand how we handle your personal information.'
            )
            .setColor(0x1E90FF)
            .addFields({
                name: 'Privacy Policy',
                value: '[View Privacy Policy]()',
                inline: false
            })
            .setFooter({ text: 'Thank you for your trust!' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
}; 