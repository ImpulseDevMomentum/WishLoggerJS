const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Disconnect a user from voice chat')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to disconnect')
                .setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getMember('user');
        const member = interaction.member;
        const bot = interaction.guild.members.me;

        if (!user.voice.channel) {
            return interaction.reply({
                content: `<:NotFine:1248352479599661056> ${user.toString()} isn't in a voice channel`,
                ephemeral: true
            });
        }

        if (bot.roles.highest.position <= user.roles.highest.position) {
            return interaction.reply({
                content: `<:NotFine:1248352479599661056> I can't disconnect ${user.toString()} because their role is higher or equal to mine`,
                ephemeral: true
            });
        }

        if (!member.permissions.has('MoveMembers') &&
            member.id !== interaction.guild.ownerId &&
            !member.permissions.has('Administrator')) {
            return interaction.reply({
                content: `<:PermDenied:1248352895854973029> You don't have permission to use this command`,
                ephemeral: true
            });
        }

        try {
            await user.voice.disconnect();
            return interaction.reply({
                content: `<:Fine:1248352477502246932> ${user.toString()} has been disconnected from voice chat`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                content: `<:NotFine:1248352479599661056> Failed to disconnect ${user.toString()}`,
                ephemeral: true
            });
        }
    },
}; 