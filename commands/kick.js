const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('User who will be kicked')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kicking the user')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('notify')
                .setDescription('Notify the user about the kick')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('KickMembers') &&
            !interaction.member.permissions.has('Administrator') &&
            interaction.member.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> You don\'t have permissions to this command.',
                ephemeral: true
            });
        }

        const member = interaction.options.getMember('member');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const notify = interaction.options.getBoolean('notify') ?? false;

        if (notify) {
            const embed = new EmbedBuilder()
                .setTitle('<:SUSSY:1247976542471061667> You have been Kicked')
                .setDescription(`You have been kicked from \`${interaction.guild.name}\``)
                .setColor('#FF0000');

            if (reason) {
                embed.addFields({
                    name: '<:reason:1247971720938258565> Reason',
                    value: `\`${reason}\``,
                    inline: false
                });
            }

            embed.setFooter({
                text: 'If you believe this is a mistake, please contact the server administrators.'
            });

            try {
                await member.send({ embeds: [embed] });
            } catch (error) {
                // Ignore if we can't DM the user
            }
        }

        try {
            await member.kick(reason);
            return interaction.reply({
                content: `<:Fine:1248352477502246932> ${member.toString()} has been kicked from the server for **${reason}**`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                content: '<:NotFine:1248352479599661056> Failed to kick the member. Please check my permissions and try again.',
                ephemeral: true
            });
        }
    },
}; 