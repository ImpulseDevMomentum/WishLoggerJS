const { SlashCommandBuilder } = require('@discordjs/builders');

const { EmbedBuilder } = require('discord.js');

const sqlite3 = require('sqlite3');

const { loadMemberLogsChannelId, getServerLanguage, currentDateTime } = require('../utils/imports');



module.exports = {

    data: new SlashCommandBuilder()

        .setName('chwarn')

        .setDescription('Change warning reason for a user')

        .addUserOption(option => 

            option.setName('member')

                .setDescription('Member whose warning reason will be changed')

                .setRequired(true))

        .addIntegerOption(option =>

            option.setName('case_id')

                .setDescription('Case ID of the warning to be changed')

                .setRequired(true))

        .addStringOption(option =>

            option.setName('new_reason')

                .setDescription('New reason for the warning')

                .setRequired(true)),



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

            const newReason = interaction.options.getString('new_reason');



            const db = new sqlite3.Database('warns.db');

            

            // Get current reason

            const oldReason = await new Promise((resolve, reject) => {

                db.get("SELECT Reason FROM warns WHERE ServerID = ? AND UserID = ? AND CaseID = ?",

                    [interaction.guildId, member.id, caseId],

                    (err, row) => {

                        if (err) reject(err);

                        else resolve(row?.Reason);

                    });

            });



            if (!oldReason) {

                return await interaction.reply({

                    content: `<:NotFine:1248352479599661056> No matching warnings found for the specified user and case ID **${caseId}**.`,

                    ephemeral: true

                });

            }



            // Update reason

            await new Promise((resolve, reject) => {

                db.run("UPDATE warns SET Reason = ? WHERE ServerID = ? AND UserID = ? AND CaseID = ?",

                    [newReason, interaction.guildId, member.id, caseId],

                    (err) => {

                        if (err) reject(err);

                        else resolve();

                    });

            });



            const channelLogId = await loadMemberLogsChannelId(interaction.guildId);

            let responseMessage = `<:Fine:1248352477502246932> Successfully changed warning reason for ID **${caseId}** to **${newReason}** for ${member.toString()}`;

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



                if (warnMessage) {

                    const embedWarnLog = new EmbedBuilder()

                        .setTitle(languageStrings.CHWARN_TITLE)

                        .setColor(0x0000FF)

                        .addFields([

                            { name: languageStrings.MODERATOR, value: `<@${interaction.user.id}>`, inline: true },

                            { name: languageStrings.MODERATOR_ID, value: interaction.user.id, inline: true },

                            { name: '\u200B', value: '\u200B', inline: false },

                            { name: languageStrings.USER, value: `<@${member.id}>`, inline: true },

                            { name: languageStrings.USER_ID, value: member.id, inline: true },

                            { name: '\u200B', value: '\u200B', inline: false },

                            { name: languageStrings.WARN_ID, value: String(caseId), inline: false },

                            { name: languageStrings.REASON, value: `**${oldReason}** ➜ **${newReason}**`, inline: false },

                            { name: languageStrings.OLD, value: oldReason, inline: true },

                            { name: languageStrings.NEW, value: newReason, inline: true },

                            { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: false }

                        ]);



                    await warnMessage.edit({ embeds: [embedWarnLog] });

                    responseMessage += ' and updated the log message.';

                } else {

                    const embedWarnLog = new EmbedBuilder()

                        .setTitle(languageStrings.CHWARN_TITLE)

                        .setColor(0x0000FF)

                        .addFields([

                            { name: languageStrings.MODERATOR, value: `<@${interaction.user.id}>`, inline: true },

                            { name: languageStrings.MODERATOR_ID, value: interaction.user.id, inline: true },

                            { name: '\u200B', value: '\u200B', inline: false },

                            { name: languageStrings.USER, value: `<@${member.id}>`, inline: true },

                            { name: languageStrings.USER_ID, value: member.id, inline: true },

                            { name: '\u200B', value: '\u200B', inline: false },

                            { name: languageStrings.WARN_ID, value: String(caseId), inline: false },

                            { name: languageStrings.REASON, value: `**${oldReason}** ➜ **${newReason}**`, inline: false },

                            { name: languageStrings.OLD, value: oldReason, inline: true },

                            { name: languageStrings.NEW, value: newReason, inline: true },

                            { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: false }

                        ]);



                    await logChannel.send({ embeds: [embedWarnLog] });

                    responseMessage += ' and created a new log message.';

                }

            }



            await interaction.reply({

                content: responseMessage,

                ephemeral: true

            });

        } catch (error) {

            console.error('Error:', error);

            await interaction.reply({

                content: '<:NotFine:1248352479599661056> An error occurred while processing the command.',

                ephemeral: true

            });

        }

    }

}; 
