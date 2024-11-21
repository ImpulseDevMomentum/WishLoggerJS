const { SlashCommandBuilder } = require('@discordjs/builders');
const sqlite3 = require('sqlite3');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadMemberLogsChannelId, getServerLanguage, currentDateTime } = require('../utils/imports');

function addWarn(serverId, userId, reason, temp, caseId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('warns.db');
        
        db.run("INSERT INTO warns (CaseID, ServerID, UserID, Reason, Temp) VALUES (?, ?, ?, ?, ?)",
            [caseId, serverId, userId, reason, temp],
            (err) => {
                db.close();
                if (err) reject(err);
                else resolve();
            });
    });
}

function generateUniqueCaseId() {
    return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn user from server')
        .addUserOption(option => 
            option.setName('member')
                .setDescription('The member to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const serverLanguage = await getServerLanguage(interaction.guildId);
            const languageStrings = require(`../language/${serverLanguage}.json`);

            if (!interaction.member.permissions.has('MODERATE_MEMBERS')) {
                return await interaction.reply({
                    content: languageStrings.PERMISSIONS_DENIED,
                    ephemeral: true
                });
            }

            const member = interaction.options.getMember('member');
            const reason = interaction.options.getString('reason');
            const caseId = generateUniqueCaseId();

            if (reason && reason.length > 720) {
                return await interaction.reply({
                    content: "<:NotFine:1309235869567287296> You can't use more than __720__ letters and symbols in the reason field.",
                    ephemeral: true
                });
            }

            const channelLogId = await loadMemberLogsChannelId(interaction.guildId);

            if (channelLogId) {
                const logChannel = interaction.guild.channels.cache.get(channelLogId);
                const embedWarnLog = new EmbedBuilder()
                    .setTitle(languageStrings.WARN_TITLE)
                    .setColor(0x0000FF)
                    .addFields(
                        { name: languageStrings.WARN_ID, value: String(caseId), inline: false },
                        { name: languageStrings.MODERATOR, value: `<@${interaction.user.id}>`, inline: true },
                        { name: languageStrings.MODERATOR_ID, value: interaction.user.id, inline: true },
                        { name: '\u200B', value: '\u200B', inline: false },
                        { name: languageStrings.USER, value: `<@${member.id}>`, inline: true },
                        { name: languageStrings.USER_ID, value: member.id, inline: true },
                        { name: languageStrings.REASON, value: reason || '**No reason provided**', inline: false },
                        { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                    );

                await logChannel.send({ embeds: [embedWarnLog] });
                await addWarn(interaction.guildId, member.id, reason, false, caseId);
                
                await interaction.reply({
                    content: `<:Fine:1309230992455630949> ${member.toString()} has been warned for **${reason}** with Case ID: ${caseId}`,
                    ephemeral: true
                });
            } else {
                const embedNoLogChannel = new EmbedBuilder()
                    .setTitle(languageStrings.WARN_CHANNEL_NOT_SET_TITLE)
                    .setColor(0xFFA500)
                    .addFields({ name: languageStrings.NOTICE, value: languageStrings.EMBED_NO_LOG_VALUE });

                const button = new ButtonBuilder()
                    .setCustomId(`warn_${member.id}_${caseId}`)
                    .setLabel('Warn without logging')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('<:NotFine:1309235869567287296>');

                const row = new ActionRowBuilder().addComponents(button);

                await interaction.reply({
                    embeds: [embedNoLogChannel],
                    components: [row],
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error:', error);
            await interaction.reply({
                content: '<:NotFine:1309235869567287296> An error occurred while processing the command.',
                ephemeral: true
            });
        }
    },

    async buttonHandler(interaction) {
        const [_, memberId, caseId] = interaction.customId.split('_');
        const member = await interaction.guild.members.fetch(memberId);
        const reason = interaction.message.embeds[0].fields.find(f => f.name === 'Reason')?.value || '**No reason provided**';

        await addWarn(interaction.guildId, memberId, reason, false, caseId);
        
        await interaction.update({
            components: []
        });

        await interaction.followUp({
            content: `<:Fine:1309230992455630949> ${member.toString()} has been warned for **${reason}** with Case ID: ${caseId}`,
            ephemeral: true
        });
    }
};