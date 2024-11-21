const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { ButtonStyle } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configuration commands group')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Show the current configuration'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset the current configuration')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'info') {
            await this.handleInfo(interaction);
        } else if (subcommand === 'reset') {
            await this.handleReset(interaction);
        }
    },

    async handleInfo(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermissionsDeclined:1309230994951508031> Only the server **owner** can view the configuration.',
                ephemeral: true
            });
        }

        const serverId = interaction.guild.id.toString();
        const db = new sqlite3.Database('servers.db');

        db.get('SELECT * FROM servers WHERE server_id = ?', [serverId], async (err, result) => {
            if (err) {
                console.error(err);
                return interaction.reply({
                    content: '<:Warning:1309230999019851816> An error occurred while fetching the configuration.',
                    ephemeral: true
                });
            }

            if (result) {
                const embed = new EmbedBuilder()
                    .setTitle('Server Configuration')
                    .setColor(0x0099FF)
                    .addFields(
                        { name: 'Server ID', value: result.server_id, inline: false },
                        { name: 'Server Name', value: result.server_name, inline: false },
                        { name: 'Role Logs Channel ID', value: result.role_logs_channel_id || 'Not set', inline: false },
                        { name: 'Role Logs Channel Name', value: result.role_logs_channel_name || 'Not set', inline: true },
                        { name: 'Server Logs Channel ID', value: result.server_logs_channel_id || 'Not set', inline: false },
                        { name: 'Server Logs Channel Name', value: result.server_logs_channel_name || 'Not set', inline: true },
                        { name: 'Member Logs Channel ID', value: result.member_logs_channel_id || 'Not set', inline: false },
                        { name: 'Member Logs Channel Name', value: result.member_logs_channel_name || 'Not set', inline: true },
                        { name: 'Message Logs Channel ID', value: result.message_logs_channel_id || 'Not set', inline: false },
                        { name: 'Message Logs Channel Name', value: result.message_logs_channel_name || 'Not set', inline: true },
                        { name: 'Reaction Logs Channel ID', value: result.reaction_logs_channel_id || 'Not set', inline: false },
                        { name: 'Reaction Logs Channel Name', value: result.reaction_logs_channel_name || 'Not set', inline: true },
                        { name: 'Language', value: result.language, inline: false }
                    );

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({
                    content: '<:NotFine:1309235869567287296> No configuration found for this server.',
                    ephemeral: true
                });
            }
        });

        db.close();
    },

    async handleReset(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermissionsDeclined:1309230994951508031> Only the server **owner** can reset the configuration.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('Warning')
            .setDescription('<:Warning:1309230999019851816> You are about to reset your server configuration. Logs, channels, cache, and other configs will be set to default. Are you sure you want to proceed?')
            .setColor(0xFF0000);

        const button = new ButtonBuilder()
            .setCustomId('reset-config')
            .setLabel('Reset Configuration')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(button);

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({ time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.guild.ownerId) {
                await i.reply({
                    content: '<:PermissionsDeclined:1309230994951508031> Only the server **owner** can reset the configuration.',
                    ephemeral: true
                });
                return;
            }

            const db = new sqlite3.Database('servers.db');
            const serverId = interaction.guild.id.toString();

            db.run(`
                UPDATE servers SET
                    role_logs_channel_id = NULL,
                    role_logs_channel_name = NULL,
                    server_logs_channel_id = NULL,
                    server_logs_channel_name = NULL,
                    member_logs_channel_id = NULL,
                    member_logs_channel_name = NULL,
                    message_logs_channel_id = NULL,
                    message_logs_channel_name = NULL,
                    reaction_logs_channel_id = NULL,
                    reaction_logs_channel_name = NULL,
                    language = 'en_eu'
                WHERE server_id = ?
            `, [serverId], async (err) => {
                if (err) {
                    console.error(err);
                    await i.reply({
                        content: '<:Warning:1309230999019851816> An error occurred while resetting the configuration.',
                        ephemeral: true
                    });
                    return;
                }

                await i.reply({
                    content: '<:Fine:1309230992455630949> Configuration has been reset.',
                    ephemeral: true
                });
            });

            db.close();
        });
    }
}; 