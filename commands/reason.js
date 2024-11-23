const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { loadJson, saveJson } = require('../utils/imports');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reason')
        .setDescription('Edit ban reason by Reason ID')
        .addStringOption(option =>
            option.setName('reasonid')
                .setDescription('Provide the reason ID to edit')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('New reason to update')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('BanMembers') &&
            !interaction.member.permissions.has('Administrator') &&
            interaction.member.id !== interaction.guild.ownerId) {
            return await interaction.reply({
                content: '<:PermissionsDeclined:1309230994951508031> You don\'t have permissions to use this command.',
                ephemeral: true
            });
        }

        const guildId = interaction.guild.id;
        const reasonId = interaction.options.getString('reasonid');
        const newReason = interaction.options.getString('reason');

        const userReasonData = this.loadBanReason(guildId, reasonId);

        if (!userReasonData) {
            return await interaction.reply({
                content: `<:Warning:1309230999019851816> Reason ID ${reasonId} not found.`,
                ephemeral: true
            });
        }

        const logMessageId = userReasonData.log_message_id;
        const logChannelId = userReasonData.log_channel_id;

        if (logMessageId && logChannelId) {
            try {
                const channel = await interaction.guild.channels.fetch(logChannelId);
                const message = await channel.messages.fetch(logMessageId);
                const embed = message.embeds[0];

                const newEmbed = EmbedBuilder.from(embed);

                for (let i = 0; i < embed.fields.length; i++) {
                    const field = embed.fields[i];
                    if (field.value.includes('Moderator, use /reason') ||
                        field.value.includes('Moderatorze, uzyj /reason') ||
                        field.value.includes('Moderatore, ispol\'zuj /reason') ||
                        field.value.includes('Moderator, verwenden Sie /reason') ||
                        field.value.includes('Moderador, usa /reason') ||
                        field.value.includes('Moderator, pouzijte /reason')) {
                        
                        const updatedFields = [...embed.fields];
                        updatedFields[i] = { 
                            name: field.name, 
                            value: newReason, 
                            inline: field.inline 
                        };
                        
                        newEmbed.setFields(updatedFields);
                        break;
                    }
                }

                await message.edit({ embeds: [newEmbed] });
                await interaction.reply({
                    content: `<:Fine:1309230992455630949> Ban reason updated successfully for reason ID: ${reasonId}.`,
                    ephemeral: true
                });
            } catch (error) {
                await interaction.reply({
                    content: `<:NotFine:1309235869567287296> Failed to update the log embed: ${error.message}`,
                    ephemeral: true
                });
            }
        } else {
            await interaction.reply({
                content: `<:NotFine:1309235869567287296> Log message or channel not found for reason ID: ${reasonId}.`,
                ephemeral: true
            });
        }
    },

    loadBanReason(guildId, reasonId) {
        const data = loadJson('ban_reasons.json');
        if (data && data[guildId] && data[guildId][reasonId]) {
            return data[guildId][reasonId];
        }
        return null;
    },

    saveBanReason(guildId, reasonId, reasonData) {
        let data = loadJson('ban_reasons.json') || {};
        
        if (!data[guildId]) {
            data[guildId] = {};
        }

        data[guildId][reasonId] = reasonData;
        saveJson('ban_reasons.json', data);
    }
};