const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deafen')
        .setDescription('Toggle deafen for a user on voice chat')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User you want to deafen/undeafen')
                .setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getMember('user');
        const member = interaction.member;
        const bot = interaction.guild.members.me;

        if (!user.voice.channel) {
            return interaction.reply({
                content: `<:NotFine:1309235869567287296> ${user.toString()} isn't in a voice channel`,
                ephemeral: true
            });
        }

        if (bot.roles.highest.position <= user.roles.highest.position) {
            return interaction.reply({
                content: `<:NotFine:1309235869567287296> I can't deafen/undeafen ${user.toString()} because their role is higher or equal to mine`,
                ephemeral: true
            });
        }

        if (!member.permissions.has('DeafenMembers') &&
            member.id !== interaction.guild.ownerId &&
            !member.permissions.has('Administrator')) {
            return interaction.reply({
                content: `<:PermissionsDeclined:1309230994951508031> You don't have permission to use this command`,
                ephemeral: true
            });
        }

        try {
            const currentDeafenStatus = user.voice.serverDeaf;
            const newDeafenStatus = !currentDeafenStatus;
            await user.voice.setDeaf(newDeafenStatus);
            const action = newDeafenStatus ? "deafened" : "undeafened";

            return interaction.reply({
                content: `<:Fine:1309230992455630949> ${user.toString()} has been ${action}`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                content: `<:NotFine:1309235869567287296> Failed to deafen/undeafen ${user.toString()}.`,
                ephemeral: true
            });
        }
    },
}; 