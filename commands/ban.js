const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('User who will be banned')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for banning the user')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('notify')
                .setDescription('Notify the user about the ban')
                .setRequired(false)),

    async execute(interaction) {
        const member = interaction.options.getMember('member');
        const reason = interaction.options.getString('reason');
        const notify = interaction.options.getBoolean('notify') ?? false;

        if (interaction.user.id === member.id) {
            return interaction.reply({
                content: '<:PermissionsDeclined:1309230994951508031>  You can\'t ban yourself from this server.',
                ephemeral: true
            });
        }

        if (interaction.guild.members.me.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({
                content: `<:NotFine:1309235869567287296> I can't ban ${member.toString()} because their role is higher or equal to mine`,
                ephemeral: true
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers) &&
            !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
            interaction.guild.ownerId !== interaction.user.id) {
            return interaction.reply({
                content: '<:PermissionsDeclined:1309230994951508031>  You don\'t have permissions to use this command.',
                ephemeral: true
            });
        }

        try {
            if (notify) {
                const banEmbed = new EmbedBuilder()
                    .setTitle('<:Banned:1309234088594374717> You have been banned')
                    .setDescription(`You have been banned from \`${interaction.guild.name}\``)
                    .setColor('#FF0000');

                if (reason) {
                    banEmbed.addFields({
                        name: '<:Reason:1309233755445268560> Reason',
                        value: `\`${reason}\``,
                        inline: false
                    });
                }

                banEmbed.setFooter({
                    text: 'If you believe this is a mistake, please contact wish support team.'
                });

                try {
                    await member.send({ embeds: [banEmbed] });
                } catch (error) {
                }
            }

            await member.ban({ reason: reason });

            return interaction.reply({
                content: `<:Fine:1309230992455630949> ${member.toString()} has been banned from the server${reason ? ` for **${reason}**` : ''}`,
                ephemeral: true
            });

        } catch (error) {
            return interaction.reply({
                content: `<:NotFine:1309235869567287296> Failed to ban ${member.toString()}.`,
                ephemeral: true
            });
        }
    },
};