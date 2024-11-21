const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('User who will be kicked')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kicking the user')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('notify')
                .setDescription('Notify the user about the kick')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('KickMembers') &&
            !interaction.member.permissions.has('Administrator') &&
            interaction.member.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermissionsDeclined:1309230994951508031> You don\'t have permissions to this command.',
                ephemeral: true
            });
        }

        const member = interaction.options.getMember('member');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const notify = interaction.options.getBoolean('notify') ?? false;

        if (notify) {
            const embed = new EmbedBuilder()
                .setTitle('<:Kicked:1309240329953873930> You have been Kicked')
                .setDescription(`You have been kicked from \`${interaction.guild.name}\``)
                .setColor('#FF0000');

            if (reason) {
                embed.addFields({
                    name: '<:Reason:1309233755445268560> Reason',
                    value: `\`${reason}\``,
                    inline: false
                });
            }

            embed.setFooter({
                text: 'If you believe this is a mistake, please contact the wish support team.'
            });

            try {
                await member.send({ embeds: [embed] });
            } catch (error) {
            }
        }

        try {
            await member.kick(reason);
            return interaction.reply({
                content: `<:Fine:1309230992455630949> ${member.toString()} has been kicked from the server for **${reason}**`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                content: '<:NotFine:1309235869567287296> Failed to kick the member. Please check my permissions and try again.',
                ephemeral: true
            });
        }
    },
}; 