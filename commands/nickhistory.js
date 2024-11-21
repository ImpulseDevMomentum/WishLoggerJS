const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

const NICKNAME_HISTORY_FILE = "nicknames.json";
const MAX_HISTORY_ENTRIES = 6;

function loadNicknameHistory() {
    try {
        if (fs.existsSync(NICKNAME_HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(NICKNAME_HISTORY_FILE, 'utf8'));
        }
        return {};
    } catch (error) {
        console.error('Error loading nickname history:', error);
        return {};
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nickhistory')
        .setDescription('View a user\'s nickname history')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('The user you want to check')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
            !interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames) &&
            interaction.member.id !== interaction.guild.ownerId) {
            return await interaction.reply({
                content: "<:PermissionsDeclined:1309230994951508031> You don't have permissions to use this command.",
                ephemeral: true
            });
        }

        const member = interaction.options.getMember('member');
        const guildId = interaction.guild.id.toString();
        const userId = member.id.toString();
        const state = loadNicknameHistory();

        if (state[guildId]?.[userId]?.length) {
            const history = state[guildId][userId];
            const embed = new EmbedBuilder()
                .setTitle("<:Custom_Profile:1309232952697163960> Nickname History")
                .setDescription(`Here is a log of the last ${Math.min(history.length, MAX_HISTORY_ENTRIES)} nickname changes for **${member}**:`)
                .setColor(0x0000FF)
                .setThumbnail(member.displayAvatarURL({ dynamic: true }));

            const recentHistory = history.slice(-MAX_HISTORY_ENTRIES);
            for (const entry of recentHistory) {
                embed.addFields({
                    name: `<:Time:1309218770035802245> ${entry.changed_at}`,
                    value: `**Old Nickname**: \`${entry.old_nick}\`\n**New Nickname**: \`${entry.new_nick}\``,
                    inline: false
                });
            }

            embed.setFooter({ text: "Nickname history is private and only visible to you or your discord mods" });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            await interaction.reply({
                content: `<:NotFine:1309235869567287296> No nickname history found for **${member}**.`,
                ephemeral: true
            });
        }
    }
}; 