const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3');
const { loadMemberLogsChannelId, getServerLanguage, currentDateTime } = require('../utils/imports');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uwarn')
        .setDescription('Change warning user for another user')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('Member whose warning user will be changed')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('new_member')
                .setDescription('New member whose warning user will be changed')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('case_id')
                .setDescription('Case ID of the warning to be changed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason of the warning to be changed')
                .setRequired(true)),

    async execute(interaction) {
        let db;
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
            const newMember = interaction.options.getMember('new_member');
            const caseId = interaction.options.getInteger('case_id');
            const reason = interaction.options.getString('reason');

            db = new sqlite3.Database('warns.db');

            const result = await new Promise((resolve, reject) => {
                db.run("UPDATE warns SET UserID = ? WHERE ServerID = ? AND UserID = ? AND CaseID = ? AND Reason = ?",
                    [newMember.id, interaction.guildId, member.id, caseId, reason],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.changes);
                    });
            });

            if (result > 0) {
                const channelLogId = await loadMemberLogsChannelId(interaction.guildId);
                let responseMessage = `<:Fine:1248352477502246932> Successfully changed user from **${member.displayName}** to **${newMember.displayName}** for warnings with reason **${reason}** ID: ${caseId}`;

                if (channelLogId) {
                    const logChannel = interaction.guild.channels.cache.get(channelLogId);
                    
                    // Szukamy oryginalnej wiadomości z ostrzeżeniem
                    const messages = await logChannel.messages.fetch({ limit: 100 });
                    const warnMessage = messages.find(msg => 
                        msg.embeds.length > 0 && 
                        msg.embeds[0].fields.some(field => 
                            field.name === languageStrings.WARN_ID && 
                            field.value === String(caseId) &&
                            msg.embeds[0].fields.some(f => 
                                f.name === languageStrings.USER && 
                                f.value === `<@${member.id}>`
                            )
                        )
                    );

                    const embedWarnLog = new EmbedBuilder()
                        .setTitle(languageStrings.UWARN_TITLE)
                        .setColor(0x0000FF)
                        .addFields([
                            { name: languageStrings.MODERATOR, value: `<@${interaction.user.id}>`, inline: true },
                            { name: languageStrings.MODERATOR_ID, value: interaction.user.id, inline: true },
                            { name: '\u200B', value: '\u200B', inline: false },
                            { name: languageStrings.USER, value: `<@${newMember.id}>`, inline: true },
                            { name: languageStrings.USER_ID, value: newMember.id, inline: true },
                            { name: '\u200B', value: '\u200B', inline: false },
                            { name: languageStrings.WARN_ID, value: String(caseId), inline: false },
                            { name: languageStrings.OLD, value: `<@${member.id}>`, inline: true },
                            { name: languageStrings.NEW, value: `<@${newMember.id}>`, inline: true },
                            { name: languageStrings.REASON, value: reason, inline: false },
                            { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: false }
                        ]);

                    if (warnMessage) {
                        await warnMessage.edit({ embeds: [embedWarnLog] });
                        responseMessage += ' and updated the log message.';
                    } else {
                        await logChannel.send({ embeds: [embedWarnLog] });
                        responseMessage += ' and created a new log message.';
                    }
                }

                await interaction.reply({
                    content: responseMessage,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: languageStrings.NO_MATCHING_FOUND_ERROR,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error:', error);
            await interaction.reply({
                content: '<:NotFine:1248352479599661056> An error occurred while processing the command.',
                ephemeral: true
            });
        } finally {
            if (db) db.close();
        }
    }
}; 