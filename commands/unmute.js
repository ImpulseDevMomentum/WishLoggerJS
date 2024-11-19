const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout from a user')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('User to unmute')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('notify')
                .setDescription('Notify the user about the unmute')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('ModerateMembers') &&
            !interaction.member.permissions.has('Administrator') &&
            interaction.member.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> You don\'t have permission to use this command',
                ephemeral: true
            });
        }

        const member = interaction.options.getMember('member');
        const notify = interaction.options.getBoolean('notify') ?? false;

        try {
            await member.timeout(null); // Removes timeout
            
            if (notify) {
                try {
                    await member.send({
                        content: `You have been unmuted in ${interaction.guild.name}`
                    });
                } catch (error) {
                    // Ignore if we can't DM the user
                }
            }

            return interaction.reply({
                content: `<:Fine:1248352477502246932> ${member.toString()} has been unmuted`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                content: `<:NotFine:1248352479599661056> Failed to unmute ${member.toString()}.`,
                ephemeral: true
            });
        }
    },
}; 