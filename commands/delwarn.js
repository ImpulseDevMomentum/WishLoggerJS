const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3');
const { loadMemberLogsChannelId, getServerLanguage, currentDateTime } = require('../utils/imports');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delwarn')
        .setDescription('Delete a warning for a specific user')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('The member whose warning you want to delete')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('case_id')
                .setDescription('The ID of the warning case to delete')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for deleting the warning')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const serverLanguage = await getServerLanguage(interaction.guildId);
            const languageStrings = require(`../language/${serverLanguage}.json`);

            if (!interaction.member.permissions.has('ADMINISTRATOR') &&
                interaction.member.id !== interaction.guild.ownerId) {
                return await interaction.reply({
                    content: languageStrings.PERMISSIONS_DENIED,
                    ephemeral: true
                });
            }

            const member = interaction.options.getMember('member');
            const caseId = interaction.options.getInteger('case_id');
            const reason = interaction.options.getString('reason') || '**No reason provided**';

            const db = new sqlite3.Database('warns.db');

            const warning = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM warns WHERE ServerID = ? AND UserID = ? AND CaseID = ?",
                    [interaction.guildId, member.id, caseId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
            });

            if (!warning) {
                return await interaction.reply({
                    content: languageStrings.SPEC_USER_OR_CASE_NOT_FOUND_ERR,
                    ephemeral: true
                });
            }

            await new Promise((resolve, reject) => {
                db.run("DELETE FROM warns WHERE ServerID = ? AND UserID = ? AND CaseID = ?",
                    [interaction.guildId, member.id, caseId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });

            await interaction.reply({
                content: `<:Fine:1248352477502246932> Warning with ID **${caseId}** for ${member.toString()} has been deleted.`,
                ephemeral: true
            });

            const channelLogId = await loadMemberLogsChannelId(interaction.guildId);

            if (channelLogId) {
                const logChannel = interaction.guild.channels.cache.get(channelLogId);
                const embedWarnLog = new EmbedBuilder()
                    .setTitle(languageStrings.WARN_DELETED_TITLE)
                    .setColor(0x0000FF)
                    .addFields(
                        { name: languageStrings.MODERATOR, value: `<@${interaction.user.id}>`, inline: true },
                        { name: languageStrings.MODERATOR_ID, value: interaction.user.id, inline: true },
                        { name: '\u200B', value: '\u200B', inline: false },
                        { name: languageStrings.USER, value: `<@${member.id}>`, inline: true },
                        { name: languageStrings.USER_ID, value: member.id, inline: true },
                        { name: languageStrings.REASON, value: reason, inline: false },
                        { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                    );

                await logChannel.send({ embeds: [embedWarnLog] });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: '<:NotFine:1248352479599661056> An error occurred while deleting the warning.',
                ephemeral: true
            });
        } finally {
            db.close();
        }
    }
}; 