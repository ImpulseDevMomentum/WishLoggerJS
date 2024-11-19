const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get bot invite link'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Invite Wish')
            .setDescription('Click the buttons below to invite the bot or join our support server!')
            .setColor('#3498db')
            .addFields(
                {
                    name: '🤖 Bot Invite',
                    value: '[Click here to invite the bot]()',
                    inline: true
                },
                {
                    name: '📢 Support Server',
                    value: '[Join our support server]()',
                    inline: true
                }
            );

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },
}; 