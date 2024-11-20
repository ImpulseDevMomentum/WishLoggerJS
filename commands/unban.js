const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server'),

    async execute(interaction) {
        if (!interaction.member.permissions.has('BanMembers') &&
            !interaction.member.permissions.has('Administrator') &&
            interaction.member.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> You don\'t have permission to use this command',
                ephemeral: true
            });
        }

        try {
            const bans = await interaction.guild.bans.fetch();
            
            if (bans.size === 0) {
                return interaction.reply({
                    content: '<:NotFine:1248352479599661056> No banned users found.',
                    ephemeral: true
                });
            }

            const limitedBans = Array.from(bans.values()).slice(0, 19);
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('unban_select')
                .setPlaceholder('Choose a user to unban');

            for (const ban of limitedBans) {
                const reason = ban.reason || 'No reason provided';
                const truncatedReason = reason.length <= 100 ? reason : reason.slice(0, 97) + '...';
                
                selectMenu.addOptions({
                    label: `${ban.user.tag}`,
                    description: `Reason: ${truncatedReason}`,
                    value: ban.user.id,
                    emoji: '🚫'
                });
            }

            const searchButton = new ButtonBuilder()
                .setCustomId('unban_search')
                .setLabel('Search')
                .setStyle(ButtonStyle.Primary);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(searchButton);

            const response = await interaction.reply({
                content: 'Select a user to unban:',
                components: [row1, row2],
                ephemeral: true
            });

            const collector = response.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'unban_select') {
                    const userId = i.values[0];
                    const user = await interaction.client.users.fetch(userId);
                    
                    try {
                        await interaction.guild.members.unban(user);
                        
                        const unbanEmbed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('User Unbanned')
                            .setDescription(`<:Fine:1248352477502246932> Successfully unbanned ${user.tag}`)
                            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                            .setTimestamp();

                        await i.update({
                            content: '',
                            embeds: [unbanEmbed],
                            components: []
                        });
                    } catch (error) {
                        await i.update({
                            content: '<:NotFine:1248352479599661056> Failed to unban the user.',
                            components: [],
                            embeds: []
                        });
                    }
                } else if (i.customId === 'unban_search') {
                    const modal = new ModalBuilder()
                        .setCustomId('unban_search_modal')
                        .setTitle('Search Banned Users');

                    const searchInput = new TextInputBuilder()
                        .setCustomId('searchInput')
                        .setLabel('Enter username or part of it')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Username')
                        .setMinLength(1)
                        .setMaxLength(100);

                    modal.addComponents(new ActionRowBuilder().addComponents(searchInput));
                    await i.showModal(modal);
                }
            });

            interaction.client.on('interactionCreate', async (modalInteraction) => {
                if (!modalInteraction.isModalSubmit()) return;
                if (modalInteraction.customId !== 'unban_search_modal') return;

                const searchQuery = modalInteraction.fields.getTextInputValue('searchInput').toLowerCase();
                const matchingBans = Array.from(bans.values()).filter(ban => 
                    ban.user.tag.toLowerCase().includes(searchQuery)
                );

                if (matchingBans.length > 0) {
                    const newSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId('unban_select')
                        .setPlaceholder('Choose a user to unban');

                    for (const ban of matchingBans) {
                        const reason = ban.reason || 'No reason provided';
                        const truncatedReason = reason.length <= 100 ? reason : reason.slice(0, 97) + '...';
                        
                        newSelectMenu.addOptions({
                            label: `${ban.user.tag}`,
                            description: `Reason: ${truncatedReason}`,
                            value: ban.user.id,
                            emoji: '🚫'
                        });
                    }

                    const newRow1 = new ActionRowBuilder().addComponents(newSelectMenu);
                    const newRow2 = new ActionRowBuilder().addComponents(searchButton);

                    await modalInteraction.update({
                        content: 'Select a user to unban:',
                        components: [newRow1, newRow2]
                    });
                } else {
                    await modalInteraction.reply({
                        content: `<:NotFine:1248352479599661056> No users matching '${searchQuery}' found.`,
                        ephemeral: true
                    });
                }
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({
                content: `<:Warning:1248654084500885526> An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    },
}; 