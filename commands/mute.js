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
                content: '<:PermissionsDeclined:1309230994951508031> You don\'t have permission to use this command',
                ephemeral: true
            });
        }

        const member = interaction.options.getMember('member');
        const timeStr = interaction.options.getString('time');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const notify = interaction.options.getBoolean('notify') ?? false;

        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                content: '<:PermissionsDeclined:1309230994951508031> You cannot mute this user because they have a higher or equal role.',
                ephemeral: true
            });
        }

        if (member.permissions.has('Administrator') || member.id === interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermissionsDeclined:1309230994951508031> You cannot mute this user because they are an administrator or the owner.',
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
                    .setTitle('<:Time_Out:1309232383228117022> You have been muted')
                    .setDescription(`You have been muted in \`${interaction.guild.name}\``)
                    .setColor('#FF0000')
                    .addFields(
                        { name: '<:Reason:1309233755445268560> Reason', value: `\`${reason}\``, inline: false },
                        { name: '<:Time:1309218770035802245> Duration', value: `\`${timeStr}\``, inline: false }
                    )
                    .setFooter({ text: 'If you believe this is a mistake, please contact the server administrators or wish support team.' });

                try {
                    await member.send({ embeds: [embed] });
                } catch (error) {
                }
            }

            await member.timeout(duration, reason);
            return interaction.reply({
                content: `<:Fine:1309230992455630949> ${member.toString()} has been muted for ${timeStr} because **${reason}**`,
                ephemeral: true
            });

        } catch (error) {
            return interaction.reply({
                content: `<:NotFine:1309235869567287296> Failed to mute ${member.toString()}.`,
                ephemeral: true
            });
        }
    },
}; 