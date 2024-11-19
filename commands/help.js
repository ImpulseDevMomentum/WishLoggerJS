const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all bot commands'),

    async execute(interaction) {
        const categories = {
            moderation: {
                name: '🛡️ Moderation',
                commands: ['ban', 'kick', 'mute', 'unmute', 'clear', 'slowmode']
            },
            voice: {
                name: '🎤 Voice',
                commands: ['deafen', 'undeafen', 'microphone', 'disconnect']
            },
            info: {
                name: 'ℹ️ Information',
                commands: ['user', 'server', 'information', 'invite']
            }
        };

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_category')
                    .setPlaceholder('Select a category')
                    .addOptions([
                        {
                            label: 'Moderation',
                            description: 'Moderation commands',
                            value: 'moderation',
                            emoji: '🛡️'
                        },
                        {
                            label: 'Voice',
                            description: 'Voice channel commands',
                            value: 'voice',
                            emoji: '🎤'
                        },
                        {
                            label: 'Information',
                            description: 'Information commands',
                            value: 'info',
                            emoji: 'ℹ️'
                        }
                    ])
            );

        const initialEmbed = new EmbedBuilder()
            .setTitle('Help Menu')
            .setDescription('Please select a category from the dropdown menu below.')
            .setColor('#3498db');

        const response = await interaction.reply({
            embeds: [initialEmbed],
            components: [row],
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return;

            const category = categories[i.values[0]];
            const categoryEmbed = new EmbedBuilder()
                .setTitle(`${category.name} Commands`)
                .setDescription(category.commands.map(cmd => `\`/${cmd}\``).join(', '))
                .setColor('#3498db');

            await i.update({
                embeds: [categoryEmbed],
                components: [row]
            });
        });

        collector.on('end', () => {
            interaction.editReply({
                components: []
            }).catch(() => {});
        });
    },
}; 