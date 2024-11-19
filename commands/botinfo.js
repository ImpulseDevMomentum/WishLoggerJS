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
                    name: '<:members:1245656464778068039> Creators',
                    value: 'Wish is being hosted by [MythicalShop.pl](https://discord.gg/Zh9dMxqKcu) and programed by <@1122846756124774470>',
                    inline: false
                },
                {
                    name: '<:8859discordrolesfromvega:1248350895347863624> Discord Server',
                    value: '[Support Server](https://discord.gg/B3jZpkAuYB)',
                    inline: false
                },
                {
                    name: '<:1626onlineweb:1248350904051302450> Website',
                    value: '[Wish Website](https://wishbot.xyz)',
                    inline: true
                },
                {
                    name: '🤖 Discord.js Version',
                    value: `v${version}`,
                    inline: true
                },
                {
                    name: '💻 System',
                    value: `${os.type()} ${os.arch()}`,
                    inline: true
                },
                {
                    name: '🏓 Ping',
                    value: `${Math.round(interaction.client.ws.ping)}ms`,
                    inline: true
                }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
}; 