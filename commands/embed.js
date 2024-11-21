const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Send a custom embed to a channel')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Embed title')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Embed description')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Embed color in hex format (e.g., 004225)')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the embed to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('footer_text')
                .setDescription('Footer text')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('footer_icon_url')
                .setDescription('Footer icon URL')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image_url')
                .setDescription('Main image URL')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('author_name')
                .setDescription('Author name')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('author_icon_url')
                .setDescription('Author icon URL')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
            interaction.member.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermissionsDeclined:1309230994951508031> You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const colorHex = interaction.options.getString('color');
        const channel = interaction.options.getChannel('channel');
        const footerText = interaction.options.getString('footer_text');
        const footerIconUrl = interaction.options.getString('footer_icon_url');
        const imageUrl = interaction.options.getString('image_url');
        const authorName = interaction.options.getString('author_name');
        const authorIconUrl = interaction.options.getString('author_icon_url');

        try {
            const color = parseInt(colorHex, 16);
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color);

            if (footerText) {
                embed.setFooter({ 
                    text: footerText, 
                    iconURL: footerIconUrl 
                });
            }

            if (imageUrl) {
                embed.setImage(imageUrl);
            }

            if (authorName) {
                embed.setAuthor({ 
                    name: authorName, 
                    iconURL: authorIconUrl 
                });
            }

            await channel.send({ embeds: [embed] });
            return interaction.reply({
                content: '<:Fine:1309230992455630949> Embed sent successfully!',
                ephemeral: true
            });
        } catch (error) {
            if (error.message.includes('color')) {
                return interaction.reply({
                    content: '<:NotFine:1309235869567287296> Invalid color format. Please provide a valid [hex color code](https://www.color-hex.com). **Example** `004225`',
                    ephemeral: true
                });
            }
            return interaction.reply({
                content: '<:NotFine:1309235869567287296> Failed to send embed. Please check the channel permissions and try again.',
                ephemeral: true
            });
        }
    },
}; 