const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const { updateServerLanguage, getServerLanguage } = require('../utils/imports');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('language')
        .setDescription('Change bot language')
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Select language')
                .addChoices(
                    { name: 'English', value: 'en_us' },
                    { name: 'Polish', value: 'pl_pl' },
                    { name: 'Czech', value: 'cs_cs' },
                    { name: 'Russian', value: 'ru' },
                    { name: 'Spanish', value: 'es_es' },
                    { name: 'German', value: 'ger_ger' }
                )
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: '<:PermissionsDeclined:1309230994951508031> You don\'t have permissions to use this command.',
                    ephemeral: true
                });
            }

            const newLanguage = interaction.options.getString('language');
            const currentLanguage = await getServerLanguage(interaction.guildId);
            const languageStrings = require(`../language/${currentLanguage}.json`);

            await updateServerLanguage(interaction.guildId, newLanguage);

            await interaction.reply({
                content: `<:Fine:1309230992455630949> Bot language has been changed to **${newLanguage}**`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error:', error);
            await interaction.reply({
                content: '<:NotFine:1309235869567287296> An error occurred while changing the language.',
                ephemeral: true
            });
        }
    }
}; 