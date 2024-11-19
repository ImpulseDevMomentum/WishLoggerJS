const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear some messages on your server')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages you want to clear')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('ManageMessages') &&
            !interaction.member.permissions.has('Administrator') &&
            interaction.member.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> You don\'t have permission to use this command.',
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('amount');

        if (amount >= 100) {
            return interaction.reply({
                content: '<:Warning:1248654084500885526> You can\'t purge more than __100__ messages',
                ephemeral: true
            });
        }

        if (amount >= 50) {
            const embed = new EmbedBuilder()
                .setTitle('<:NotFine:1248352479599661056> Warning!')
                .setDescription(`You're about to clear **${amount}** messages. Are you sure you want to do this?`)
                .setColor('#FF0000');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_clear')
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_clear')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            const response = await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            try {
                const confirmation = await response.awaitMessageComponent({
                    filter: i => i.user.id === interaction.user.id,
                    time: 30000
                });

                if (confirmation.customId === 'confirm_clear') {
                    await interaction.channel.bulkDelete(amount, true);
                    await confirmation.update({
                        content: `<:Fine:1248352477502246932> You've cleared ${amount} message(s).`,
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
                } else {
                    await confirmation.update({
                        content: 'Clear operation cancelled.',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
                }
            } catch (e) {
                await interaction.editReply({
                    content: 'Clear operation cancelled due to timeout.',
                    embeds: [],
                    components: [],
                    ephemeral: true
                });
            }
        } else {
            await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({
                content: `<:Fine:1248352477502246932> You've cleared ${amount} message(s).`,
                ephemeral: true
            });
        }
    },
}; 