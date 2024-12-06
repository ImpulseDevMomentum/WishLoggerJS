const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Show all warnings for the server'),
    async execute(interaction) {
        const db = new sqlite3.Database('warns.db');

        try {
            const warnings = await new Promise((resolve, reject) => {
                db.all("SELECT CAST(UserID AS TEXT) as UserID, Reason, CaseID FROM warns WHERE ServerID = ?",
                    [interaction.guildId],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
            });
            if (!warnings || warnings.length === 0) {
                return await interaction.reply({
                    content: "<:NotFine:1309235869567287296> No warnings found for this server.",
                    ephemeral: true
                });
            }
            const MAX_EMBED_LENGTH = 4096;
            let embedContent = "";
            const embeds = [];
            let currentEmbed = new EmbedBuilder()
                .setTitle(`<:Warns:1309243528282378301> Warnings for ${interaction.guild.name}`)
                .setColor(0x0000FF);
            for (const warning of warnings) {

                try {
                    const userStr = `<:Member:1309218766089097287> <@${warning.UserID}> (${warning.UserID})`;
                    const fieldContent = 
                        `**${userStr}**\n` +
                        `**<:ID:1309218763521917040> Case ID:** ${warning.CaseID}\n` +
                        `**<:Reason:1309233755445268560> Reason:** ${warning.Reason}\n\n`;
                    if (embedContent.length + fieldContent.length > MAX_EMBED_LENGTH) {
                        currentEmbed.addFields({ name: "Warnings", value: embedContent });
                        embeds.push(currentEmbed);
                        currentEmbed = new EmbedBuilder()
                            .setTitle(`<:Warns:1309243528282378301> Warnings for ${interaction.guild.name} (Continued)`)
                            .setColor(0x0000FF);
                        embedContent = fieldContent;
                    } else {
                        embedContent += fieldContent;
                    }
                } catch (error) {
                    console.error(`Error with warning for UserID ${warning.UserID}:`, error);
                    const userStr = `<:Member:1309218766089097287> <@${warning.UserID}> (${warning.UserID})`;
                    const fieldContent = 
                        `**${userStr}**\n` +
                        `**<:ID:1309218763521917040> Case ID:** ${warning.CaseID}\n` +
                        `**<:Reason:1309233755445268560> Reason:** ${warning.Reason}\n\n`;
                    if (embedContent.length + fieldContent.length > MAX_EMBED_LENGTH) {
                        currentEmbed.addFields({ name: "Warnings", value: embedContent });
                        embeds.push(currentEmbed);
                        currentEmbed = new EmbedBuilder()
                            .setTitle(`<:Warns:1309243528282378301> Warnings for ${interaction.guild.name} (Continued)`)
                            .setColor(0x0000FF);
                        embedContent = fieldContent;
                    } else {
                        embedContent += fieldContent;
                    }
                }
            }
            if (embedContent) {
                currentEmbed.addFields({ name: "Warnings", value: embedContent });
                embeds.push(currentEmbed);
            }
            await interaction.reply({ embeds: [embeds[0]], ephemeral: true });
            for (let i = 1; i < embeds.length; i++) {
                await interaction.followUp({ embeds: [embeds[i]], ephemeral: true });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: '<:NotFine:1309235869567287296> An error occurred while fetching warnings.',
                ephemeral: true
            });
        } finally {
            db.close();

        }
    }
}; 