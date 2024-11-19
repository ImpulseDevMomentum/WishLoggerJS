const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage roles')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role to a member')
                .addUserOption(option =>
                    option.setName('member')
                        .setDescription('A member of your server')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('A role of your choice')
                        .setRequired(true))),

    async execute(interaction) {
        const member = interaction.options.getMember('member');
        const role = interaction.options.getRole('role');

        if (interaction.guild.ownerId !== interaction.user.id &&
            !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> You don\'t have permission to use this command.',
                ephemeral: true
            });
        }

        if (interaction.guild.ownerId !== interaction.user.id &&
            role.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> You cannot assign roles higher or equal to your highest role.',
                ephemeral: true
            });
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> I cannot assign a role higher than or equal to my highest role.',
                ephemeral: true
            });
        }

        try {
            await member.roles.add(role);
            return interaction.reply({
                content: `<:Fine:1248352477502246932> Successfully added the role ${role.toString()} to ${member.toString()}`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                content: '<:NotFine:1248352479599661056> Failed to add the role. Please check my permissions and try again.',
                ephemeral: true
            });
        }
    },
}; 