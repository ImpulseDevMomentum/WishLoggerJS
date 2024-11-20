const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Check info about the server'),

    async execute(interaction) {
        const guild = interaction.guild;
        const members = await guild.members.fetch();
        
        const users = members.filter(member => !member.user.bot).size;
        const bots = members.filter(member => member.user.bot).size;
        
        const embed = new EmbedBuilder()
            .setTitle('<:info:1247959011605741579> Server Information Card')
            .setColor(0x3498DB)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                {
                    name: '<:browsefotor:1245656463163002982> **Server Name**',
                    value: guild.name,
                    inline: false
                },
                {
                    name: '<:ID:1247954367953240155> **Server ID**',
                    value: guild.id.toString(),
                    inline: false
                },
                {
                    name: '<:Owner0:1234084745932177428> **Server Owner**',
                    value: (await guild.fetchOwner()).user.toString(),
                    inline: false
                },
                {
                    name: '<:settings:1247982015207440384> **Region**',
                    value: guild.preferredLocale,
                    inline: false
                },
                {
                    name: '👥 **Members**',
                    value: `Total: ${guild.memberCount}\nUsers: ${users}\nBots: ${bots}`,
                    inline: false
                },
                {
                    name: '📅 **Created At**',
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                    inline: false
                },
                {
                    name: '🔒 **Verification Level**',
                    value: guild.verificationLevel.toString().toLowerCase().replace(/_/g, ' '),
                    inline: false
                }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
}; 