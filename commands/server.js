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
            .setTitle('<:Custom_Profile:1309232952697163960> Server Information Card')
            .setColor(0x3498DB)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                {
                    name: '<:info:1309229015571234889> **Server Name**',
                    value: guild.name,
                    inline: false
                },
                {
                    name: '<:ID:1309218763521917040> **Server ID**',
                    value: guild.id.toString(),
                    inline: false
                },
                {
                    name: '<:server_owner:1309242055918223360> **Server Owner**',
                    value: (await guild.fetchOwner()).user.toString(),
                    inline: false
                },
                {
                    name: '<:Settings:1309242754240483409> **Region**',
                    value: guild.preferredLocale,
                    inline: false
                },
                {
                    name: '<:Members:1309236553259941918> **Members**',
                    value: `Total: ${guild.memberCount}\nUsers: ${users}\nBots: ${bots}`,
                    inline: false
                },
                {
                    name: '<:Time:1309218770035802245> **Created At**',
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                    inline: false
                },
                {
                    name: '<:Settings:1309242754240483409> **Verification Level**',
                    value: guild.verificationLevel.toString().toLowerCase().replace(/_/g, ' '),
                    inline: false
                }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
}; 