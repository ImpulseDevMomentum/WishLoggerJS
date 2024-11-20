const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('View user moderation history')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Shows the ban history of a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Select the user')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Shows the kick history of a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Select the user')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Shows the mute history of a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Select the user')
                        .setRequired(true))),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: "<:PermDenied:1248352895854973029> You don't have permissions to use this command.",
                ephemeral: true
            });
            return;
        }

        const user = interaction.options.getUser('user');
        const subcommand = interaction.options.getSubcommand();

        async function getAuditLogEntries(guild, userId, actionType) {
            const actionTypes = {
                'BanAdd': AuditLogEvent.MemberBanAdd,
                'Kick': AuditLogEvent.MemberKick,
                'MemberUpdate': AuditLogEvent.MemberUpdate
            };

            const entries = [];
            const auditLogs = await guild.fetchAuditLogs({ 
                type: actionTypes[actionType],
                limit: 100 
            });
            
            for (const entry of auditLogs.entries.values()) {
                if (entry.target?.id === userId && !entry.executor.bot) {
                    entries.push(entry);
                }
            }
            return entries;
        }

        function createEmbed(user, entries, title, interactionUser) {
            const embed = new EmbedBuilder()
                .setTitle(`<:browsefotor:1245656463163002982> ${title} for ${user.username} (${user.id})`)
                .setColor('Red')
                .setTimestamp();

            const displayedEntries = entries.slice(0, 25);
            for (const entry of displayedEntries) {
                embed.addFields({
                    name: `<:Moderator:1247954371925512243> **Action by** ${entry.executor.tag}`,
                    value: `<:time:1247976543678894182> **Date:** ${entry.createdAt.toISOString().split('T')[0]}\n<:reason:1247971720938258565> **Reason:** ${entry.reason || 'No reason provided'}\n\u200b`,
                    inline: false
                });
            }

            if (entries.length > 25) {
                embed.addFields({
                    name: 'More Records',
                    value: `And ${entries.length - 25} more entries...`,
                    inline: false
                });
            }

            embed.setFooter({
                text: `Requested by ${interactionUser.username}`,
                iconURL: interactionUser.displayAvatarURL()
            });

            return embed;
        }

        let actionType;
        let title;
        switch (subcommand) {
            case 'ban':
                actionType = 'BanAdd';
                title = 'Ban History';
                break;
            case 'kick':
                actionType = 'Kick';
                title = 'Kick History';
                break;
            case 'mute':
                actionType = 'MemberUpdate';
                title = 'Timeout History';
                break;
        }

        const entries = await getAuditLogEntries(interaction.guild, user.id, actionType);

        if (!entries.length) {
            await interaction.reply({
                content: `<:NotFine:1248352479599661056> No ${subcommand} records found for ${user}.`,
                ephemeral: true
            });
            return;
        }

        if (entries.length > 25) {
            await interaction.reply({
                content: `<:NotFine:1248352479599661056> ${user} has too many **${subcommand}s.** They were ${subcommand}ed **${entries.length} times.**`,
                ephemeral: true
            });
        } else {
            const embed = createEmbed(user, entries, title, interaction.user);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
}; 