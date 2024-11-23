const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode for a channel')
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('Slowmode duration in seconds')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('ManageChannels')) {
            return interaction.reply({
                content: '<:PermissionsDeclined:1309230994951508031> You don\'t have permissions to use this command.',
                ephemeral: true
            });
        }

        const seconds = interaction.options.getInteger('seconds');

        try {
            await interaction.channel.setRateLimitPerUser(seconds);
            return interaction.reply({
                content: `<:Slowmode:1309862887233163314> Slowmode is set to ${seconds} second(s) on ${interaction.channel.toString()}`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                content: '<:NotFine:1309235869567287296> Failed to set slowmode. Please check my permissions and try again.',
                ephemeral: true
            });
        }
    },
}; 