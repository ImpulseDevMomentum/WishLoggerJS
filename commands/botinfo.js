const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, version } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('information')
        .setDescription('Display information about the bot'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Bot Information')
            .setColor('#3498db')
            .addFields(
                {
                    name: '<:Members:1309236553259941918> Creators',
                    value: 'Wish is being programed & hosted by ImpulseDev',
                    inline: false
                },
                {
                    name: '<:Discord:1309236852741636147> Discord Server',
                    value: '[Support Server]()',
                    inline: false
                },
                {
                    name: '<:Website:1309237189313433640> Website',
                    value: '[Wish Website]()',
                    inline: true
                },
                {
                    name: '<:Ping:1309237389876793514> Ping',
                    value: `${Math.round(interaction.client.ws.ping)}ms`,
                    inline: true
                }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
}; 