const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('docs')
        .setDescription('View Wish\'s Documentation'),
        
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Wish\'s Documentation')
            .setDescription(
                'Click the link below to access Wish\'s documentation. ' +
                'Here you\'ll find all the information you need to use our bot effectively.'
            )
            .setColor(0x1E90FF)
            .addFields({
                name: 'Documentation Link',
                value: '[View Documentation]()',
                inline: false
            })
            .setFooter({ text: 'Explore and get the most out of Wish!' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
}; 