const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Temporarily timeout a user')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('User who will be muted')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Duration of mute (e.g., "1h", "2d")')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for muting the user')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('notify')
                .setDescription('Notify the user about the mute')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('ModerateMembers') &&
            !interaction.member.permissions.has('Administrator') &&
            interaction.member.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> You don\'t have permission to use this command',
                ephemeral: true
            });
        }

        const member = interaction.options.getMember('member');
        const timeStr = interaction.options.getString('time');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const notify = interaction.options.getBoolean('notify') ?? false;

        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> You cannot mute this user because they have a higher or equal role.',
                ephemeral: true
            });
        }

        if (member.permissions.has('Administrator') || member.id === interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> You cannot mute this user because they are an administrator or the owner.',
                ephemeral: true
            });
        }

        try {
            const duration = ms(timeStr);
            if (!duration) {
                return interaction.reply({
                    content: 'Invalid time format. Please use formats like "1h", "2d", etc.',
                    ephemeral: true
                });
            }

            if (notify) {
                const embed = new EmbedBuilder()
                    .setTitle('<:timeoutclock:1247969146038259783> You have been muted')
                    .setDescription(`You have been muted in \`${interaction.guild.name}\``)
                    .setColor('#FF0000')
                    .addFields(
                        { name: '<:reason:1247971720938258565> Reason', value: `\`${reason}\``, inline: false },
                        { name: '<:time:1247976543678894182> Duration', value: `\`${timeStr}\``, inline: false }
                    )
                    .setFooter({ text: 'If you believe this is a mistake, please contact the server administrators.' });

                try {
                    await member.send({ embeds: [embed] });
                } catch (error) {
                    // Ignore if we can't DM the user
                }
            }

            await member.timeout(duration, reason);
            return interaction.reply({
                content: `<:Fine:1248352477502246932> ${member.toString()} has been muted for ${timeStr} because **${reason}**`,
                ephemeral: true
            });

        } catch (error) {
            return interaction.reply({
                content: `<:NotFine:1248352479599661056> Failed to mute ${member.toString()}.`,
                ephemeral: true
            });
        }
    },
}; 