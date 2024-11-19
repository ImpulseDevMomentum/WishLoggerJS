const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Check user invites')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check invites for')
                .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;

        try {
            const invites = await interaction.guild.invites.fetch();
            const userInvites = invites.filter(invite => invite.inviter.id === user.id);

            let totalUses = 0;
            userInvites.forEach(invite => totalUses += invite.uses);

            const embed = new EmbedBuilder()
                .setTitle(`${user.tag}'s Invites`)
                .setDescription(`Total Invites: **${totalUses}**\nActive Invite Links: **${userInvites.size}**`)
                .setColor('#3498db')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }));

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            await interaction.reply({
                content: '<:NotFine:1248352479599661056> Failed to fetch invite information.',
                ephemeral: true
            });
        }
    },
}; 