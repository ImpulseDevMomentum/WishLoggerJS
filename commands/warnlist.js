const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnlist')
        .setDescription('Show list of warnings for a user')
        .addUserOption(option => 
            option.setName('member')
                .setDescription('Member to check warnings')
                .setRequired(true)),

    async execute(interaction) {
        const member = interaction.options.getMember('member');

        const warnings = await new Promise((resolve, reject) => {
            const db = new sqlite3.Database('warns.db');
            db.all("SELECT CaseID, Reason FROM warns WHERE ServerID = ? AND UserID = ?",
                [interaction.guildId, member.id],
                (err, rows) => {
                    db.close();
                    if (err) reject(err);
                    else resolve(rows);
                });
        });

        if (!warnings || warnings.length === 0) {
            return await interaction.reply({
                content: "<:NotFine:1248352479599661056> No warnings found for this user.",
                ephemeral: true
            });
        }

        const MAX_EMBED_LENGTH = 4096;
        let embedContent = "";
        const embeds = [];
        let currentEmbed = new EmbedBuilder()
            .setTitle(`<:Fine:1248352477502246932> Warnings for ${member.user.tag}`)
            .setColor(0x0000FF);

        warnings.forEach((warning, index) => {
            const warningEntry = `**<:reportmessage0:1233828792368369694> Warning ${index + 1}**\n` +
                `<:ID:1247954367953240155> Case ID: ${warning.CaseID}\n` +
                `<:reason:1247971720938258565> Reason: ${warning.Reason}\n\n`;

            if (embedContent.length + warningEntry.length > MAX_EMBED_LENGTH) {
                currentEmbed.addFields({ name: 'Warnings', value: embedContent });
                embeds.push(currentEmbed);
                currentEmbed = new EmbedBuilder()
                    .setTitle(`<:Fine:1248352477502246932> Warnings for ${member.user.tag} (Continued)`)
                    .setColor(0x0000FF);
                embedContent = warningEntry;
            } else {
                embedContent += warningEntry;
            }
        });

        if (embedContent) {
            currentEmbed.addFields({ name: 'Warnings', value: embedContent });
            embeds.push(currentEmbed);
        }

        await interaction.reply({ embeds: [embeds[0]], ephemeral: true });
        
        // Wysyłamy pozostałe embedy jako followup
        for (let i = 1; i < embeds.length; i++) {
            await interaction.followUp({ embeds: [embeds[i]], ephemeral: true });
        }
    }
}; 