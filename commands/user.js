const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Check info about users')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('User to check info about')
                .setRequired(false)),

    async execute(interaction) {
        const member = interaction.options.getMember('member') || interaction.member;
        const canBan = interaction.member.permissions.has('BanMembers');
        const canKick = interaction.member.permissions.has('KickMembers');

        const createSecurityActionRow = () => {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ban_button')
                        .setLabel('Ban')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('<:banned:1247971710150377523>')
                        .setDisabled(!canBan),
                    new ButtonBuilder()
                        .setCustomId('kick_button')
                        .setLabel('Kick')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('<:Kicked:1294264935001493555>')
                        .setDisabled(!canKick)
                );
            return row;
        };

        const response = await interaction.reply({
            components: [createSecurityActionRow()],
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return;

            if (i.customId === 'ban_button') {
                if (canBan) {
                    try {
                        await member.ban({ reason: 'Banned via slash security actions' });
                        await i.reply({
                            content: `<:Fine:1248352477502246932> ${member.toString()} has been banned.`,
                            ephemeral: true
                        });
                    } catch (error) {
                        await i.reply({
                            content: '<:NotFine:1248352479599661056> Failed to ban the member.',
                            ephemeral: true
                        });
                    }
                } else {
                    await i.reply({
                        content: '<:PermDenied:1248352895854973029> You don\'t have permission to ban members.',
                        ephemeral: true
                    });
                }
            }

            if (i.customId === 'kick_button') {
                if (canKick) {
                    try {
                        await member.kick('Kicked via security actions');
                        await i.reply({
                            content: `<:Fine:1248352477502246932> ${member.toString()} has been kicked.`,
                            ephemeral: true
                        });
                    } catch (error) {
                        await i.reply({
                            content: '<:NotFine:1248352479599661056> Failed to kick the member.',
                            ephemeral: true
                        });
                    }
                } else {
                    await i.reply({
                        content: '<:PermDenied:1248352895854973029> You don\'t have permission to kick members.',
                        ephemeral: true
                    });
                }
            }
        });

        collector.on('end', () => {
            interaction.editReply({
                components: []
            }).catch(() => {});
        });
    },
}; 