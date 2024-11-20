const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, MessageActionRow, MessageButton } = require('discord.js');
const sqlite3 = require('sqlite3');
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

function removeWarn(caseId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('warns.db');
        db.run("DELETE FROM warns WHERE CaseID = ?", [caseId],
            (err) => {
                db.close();
                if (err) reject(err);
                else resolve();
            });
    });
}

function generateUniqueCaseId() {
    return Math.floor(Math.random() * 900) + 100;
}

function parseDuration(durationStr) {
    const units = { s: 1, m: 60, h: 3600, d: 86400 };
    const match = durationStr.match(/^(\d+)([smhd])$/);
    if (match) {
        const [_, value, unit] = match;
        return parseInt(value) * units[unit];
    }
    return null;
}

async function scheduleWarnRemoval(caseId, duration, interaction, member, reason, startTime) {
    setTimeout(async () => {
        await removeWarn(caseId);
        await sendWarnDeletedLog(interaction, member, reason, startTime, duration);
    }, duration * 1000);
}

async function sendWarnDeletedLog(interaction, member, reason, startTime, duration) {
    const embed = new EmbedBuilder()
        .setTitle("<:None0:1233827940895166655> Temporary Warn Deleted")
        .setColor('RED')
        .addFields(
            { name: "<:Moderator:1247954371925512243> **Moderator**", value: `<@${interaction.user.id}>`, inline: false },
            { name: "<:ID:1247954367953240155> **Moderator ID**", value: interaction.user.id, inline: false },
            { name: "<:Member:1247954369639481498> **User**", value: `<@${member.id}>`, inline: false },
            { name: "<:ID:1247954367953240155> **User ID**", value: member.id, inline: false },
            { name: "<:reason:1247971720938258565> **Reason**", value: reason || "No reason provided", inline: false },
            { name: "<:time:1247976543678894182> **Duration**", value: formatDuration(duration), inline: false },
            { name: "<:time:1247976543678894182> **Today at**", value: currentDateTime(), inline: true }
        );

    const channelLogId = loadMemberLogsChannelId(interaction.guildId);
    if (channelLogId) {
        const logChannel = interaction.guild.channels.cache.get(channelLogId);
        await logChannel.send({ embeds: [embed] });
    }
}

function formatDuration(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempwarn')
        .setDescription('Temporarily warn user')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('The member to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of the warning (e.g., 1h, 2d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR') &&
            !interaction.member.permissions.has('MANAGE_MESSAGES') &&
            interaction.member.id !== interaction.guild.ownerId) {
            return await interaction.reply({
                content: "<:PermDenied:1248352895854973029> You do not have permission to use this command.",
                ephemeral: true
            });
        }

        const member = interaction.options.getMember('member');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason');
        const caseId = generateUniqueCaseId();
        const durationSeconds = parseDuration(durationStr);

        if (!durationSeconds || durationSeconds > 172800) {
            return await interaction.reply({
                content: "<:PermDenied:1248352895854973029> Invalid duration. Please specify a duration of up to 2 days.",
                ephemeral: true
            });
        }

        const channelLogId = loadMemberLogsChannelId(interaction.guildId);

        if (channelLogId) {
            const logChannel = interaction.guild.channels.cache.get(channelLogId);
            const embed = new EmbedBuilder()
                .setTitle("<:SUSSY:1247976542471061667> User Temporarily Warned")
                .setColor('DARK_BLUE')
                .addFields(
                    { name: "<:ID:1247954367953240155> **Warn ID**", value: String(caseId), inline: false },
                    { name: "<:Moderator:1247954371925512243> **Moderator**", value: `<@${interaction.user.id}>`, inline: false },
                    { name: "<:ID:1247954367953240155> **Moderator ID**", value: interaction.user.id, inline: false },
                    { name: "<:Member:1247954369639481498> **User**", value: `<@${member.id}>`, inline: false },
                    { name: "<:ID:1247954367953240155> **User ID**", value: member.id, inline: false },
                    { name: "<:reason:1247971720938258565> **Reason**", value: reason || "No reason provided", inline: false },
                    { name: "<:time:1247976543678894182> **Duration**", value: durationStr, inline: false },
                    { name: "<:time:1247976543678894182> **Today at**", value: currentDateTime(), inline: true }
                );

            await logChannel.send({ embeds: [embed] });
            await addWarn(interaction.guildId, member.id, reason, true, caseId);
            await scheduleWarnRemoval(caseId, durationSeconds, interaction, member, reason, interaction.createdAt);
        } else {
            const embed = new EmbedBuilder()
                .setTitle("<:NotFine:1248352479599661056> Logging Channel Not Set")
                .setColor('ORANGE')
                .addField("Notice", "Hey! You haven't set a logging channel. Without it, information about warns is limited. Please set your channel via `/setlogging` command!");

            const button = new MessageButton()
                .setCustomId(`tempwarn_${member.id}_${caseId}_${durationSeconds}`)
                .setLabel('Temp Warn without logging')
                .setStyle('DANGER')
                .setEmoji('<:NotFine:1248352479599661056>');

            const row = new MessageActionRow().addComponents(button);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
            return;
        }

        await interaction.reply({
            content: `<:Fine:1248352477502246932> ${member.toString()} has been temporarily warned for **${reason || 'No reason provided'}** for ${durationStr} with Case ID: ${caseId}`,
            ephemeral: true
        });
    },

    async buttonHandler(interaction) {
        const [_, memberId, caseId, duration] = interaction.customId.split('_');
        const member = await interaction.guild.members.fetch(memberId);
        const reason = interaction.message.embeds[0].fields.find(f => f.name === 'Reason')?.value || 'No reason provided';

        await addWarn(interaction.guildId, memberId, reason, true, caseId);
        await scheduleWarnRemoval(caseId, parseInt(duration), interaction, member, reason, interaction.createdAt);

        await interaction.update({ components: [] });
        await interaction.followUp({
            content: `<:Fine:1248352477502246932> ${member.toString()} has been temporarily warned for **${reason}** with Case ID: ${caseId}`,
            ephemeral: true
        });
    }
}; 