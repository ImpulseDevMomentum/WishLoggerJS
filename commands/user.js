const { SlashCommandBuilder } = require('@discordjs/builders');

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const sqlite3 = require('sqlite3').verbose();

const { AuditLogEvent } = require('discord.js');



function formatTimeDelta(date) {

    const now = new Date();

    const diff = now - date;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const months = Math.floor(days / 30);

    const years = Math.floor(days / 365);



    if (years > 0) {

        return `${years} year${years > 1 ? 's' : ''} ago`;

    } else if (months > 0) {

        return `${months} month${months > 1 ? 's' : ''} ago`;

    } else {

        return `${days} day${days > 1 ? 's' : ''} ago`;

    }

}



async function checkAuditLogs(guild, userId, actionType) {

    const actionTypes = {

        'BanAdd': AuditLogEvent.MemberBanAdd,

        'MemberKick': AuditLogEvent.MemberKick,

        'MemberUpdate': AuditLogEvent.MemberUpdate

    };

    const auditLogs = await guild.fetchAuditLogs({ 

        type: actionTypes[actionType],

        limit: 100 

    });

    return auditLogs.entries.some(entry => entry.target?.id === userId);

}



function checkWarns(userId) {

    return new Promise((resolve, reject) => {

        const db = new sqlite3.Database('warns.db');

        db.get("SELECT * FROM warns WHERE UserID = ?", [userId], (err, row) => {

            db.close();

            if (err) reject(err);

            resolve(row !== undefined);

        });

    });

}



function checkSuspicious(member) {

    const now = new Date();

    const accountAge = (now - member.user.createdAt) / (1000 * 60 * 60 * 24);

    const hasDefaultAvatar = !member.user.avatar;

    

    const isNewAccount = accountAge < 3;

    return isNewAccount || hasDefaultAvatar;

}



module.exports = {

    data: new SlashCommandBuilder()

        .setName('user')

        .setDescription('Check info about users')

        .addUserOption(option =>

            option.setName('member')

                .setDescription('User to check info about')

                .setRequired(false)),



    async execute(interaction) {

        const member = interaction.options.getMember('member') || interaction.member;

        const guild = interaction.guild;


        const userFlags = [

            member.user.flags?.has('HOUSE_BRILLIANCE') ? '<:Brilliance:1309971160913543179>' : '',

            member.user.flags?.has('HOUSE_BALANCE') ? '<:Balance:1309971158078062632>' : '',

            member.user.flags?.has('HOUSE_BRAVERY') ? '<:Bravery:1309971159059796009>' : '',

            member.user.flags?.has('ACTIVE_DEVELOPER') ? '<:DiscordActiveDeveloper:1309970625204326400>' : '',

            member.user.flags?.has('EARLY_VERIFIED_BOT_DEVELOPER') ? '<:DiscordEarlyBotDeveloper:1309970627628896316>' : '',

            member.user.flags?.has('PARTNER') ? '<:DiscordPartner:1309970629512003604>' : '',

            member.premiumSince ? '<:Booster:1309970614236348457>' : '',

            guild.ownerId === member.id ? '<:server_owner:1309242055918223360>' : '',

            member.user.flags?.has('DISCORD_CERTIFIED_MODERATOR') ? '<:CertifiedModerator:1309970621840756791>' : '',

            member.user.bot && !member.user.flags?.has('VERIFIED_BOT') ? '<:discord_app:1309253501309681724>' : '',

            member.user.bot && member.user.flags?.has('VERIFIED_BOT') ? '<:verified_app:1309253503146922064>' : '',

        ].filter(Boolean);



        const accountCreatedAt = member.user.createdAt;

        const joinedAt = member.joinedAt;

        

        const userInfoEmbed = new EmbedBuilder()

            .setTitle('<:Member:1309218766089097287> Member Information Card')

            .setColor(member.displayHexColor)

            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))

            .addFields(

                { name: '<:Custom_Profile:1309232952697163960> **Displayed Username**', value: member.user.tag, inline: false },

                { name: '<:ID:1309218763521917040> **User ID**', value: member.id, inline: false },

                { name: '<:info:1309229015571234889> **User roles**', value: member.roles.cache.filter(r => r.name !== '@everyone').map(r => `<@&${r.id}>`).join(' ') || 'No roles', inline: false },

                { name: '<:info:1309229015571234889> **Highest role**', value: `<@&${member.roles.highest.id}>`, inline: false },

                { name: '<:info:1309229015571234889> **User Badges**', value: userFlags.length ? userFlags.join(' ') : 'No badges', inline: false },

                { name: '<:Time:1309218770035802245> **Joined Discord**', value: `${accountCreatedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (${formatTimeDelta(accountCreatedAt)})`, inline: false },

                { name: '<:Time:1309218770035802245> **Joined the server**', value: `${joinedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (${formatTimeDelta(joinedAt)})`, inline: false }

            );




        const wasBanned = await checkAuditLogs(guild, member.id, 'BanAdd');

        const wasKicked = await checkAuditLogs(guild, member.id, 'MemberKick');

        const wasMuted = await checkAuditLogs(guild, member.id, 'MemberUpdate');

        const wasWarned = await checkWarns(member.id);

        const isSuspicious = checkSuspicious(member);



        const securityIcon = (!wasBanned && !wasKicked && !wasMuted && !isSuspicious) ? 

            '<:SecuritySafe:1309245927168413728>' : 

            '<:SecuritySUS:1309245929207107664>';



        const securityEmbed = new EmbedBuilder()

            .setTitle(`${securityIcon} Security Actions`)

            .setColor(wasBanned || wasKicked || wasMuted || isSuspicious ? '#ff0000' : '#00ff00')

            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))

            .addFields(

                { name: '<:Custom_Profile:1309232952697163960> **Displayed Username**', value: member.user.tag, inline: false },

                { name: '<:ID:1309218763521917040> **User ID**', value: member.id, inline: false },

                { name: '<:Banned:1309234088594374717> Was Ever Banned?', value: wasBanned ? '<:Enabled:1309252483411087423> **Yes**' : '<:NotFine:1309235869567287296> No', inline: true },

                { name: '<:Kicked:1309240329953873930> Was Ever Kicked?', value: wasKicked ? '<:Enabled:1309252483411087423> **Yes**' : '<:NotFine:1309235869567287296> No', inline: true },

                { name: '<:Microphone_Muted:1309232020613890078> Was Ever Muted?', value: wasMuted ? '<:Enabled:1309252483411087423> **Yes**' : '<:NotFine:1309235869567287296> No', inline: true },

                { name: '<:WarnDeleted:1309243525539299459> Was Ever Warned?', value: wasWarned ? '<:Enabled:1309252483411087423> **Yes**' : '<:NotFine:1309235869567287296> No', inline: true },

                { name: '<:Report:1309246653240311880> Account is New', value: ((new Date() - member.user.createdAt) / (1000 * 60 * 60 * 24)) < 3 ? '<:Enabled:1309252483411087423> **Yes**' : '<:NotFine:1309235869567287296> No', inline: true },

                { name: '<:Report:1309246653240311880> No Profile Picture', value: !member.user.avatar ? '<:Enabled:1309252483411087423> **Yes**' : '<:NotFine:1309235869567287296> No', inline: true },

                { name: '<:SuspectedActivtie:1309234701709344889> Suspicious Account', value: isSuspicious ? '<:Enabled:1309252483411087423> **Yes**' : '<:NotFine:1309235869567287296> No', inline: true }

            );



        const createButtons = (selected) => {

            const userInfoButton = new ButtonBuilder()

                .setCustomId('user_info')

                .setLabel('User Information')

                .setStyle(selected === 'user_info' ? ButtonStyle.Success : ButtonStyle.Secondary);



            const securityActionsButton = new ButtonBuilder()

                .setCustomId('security_actions')

                .setLabel('Security Actions')

                .setStyle(selected === 'security_actions' ? ButtonStyle.Success : ButtonStyle.Secondary);



            const banButton = new ButtonBuilder()

                .setCustomId('ban')

                .setLabel('Ban')

                .setEmoji('<:Banned:1309234088594374717>')

                .setStyle(ButtonStyle.Secondary)

                .setDisabled(selected !== 'security_actions' || !interaction.member.permissions.has('BanMembers'));



            const kickButton = new ButtonBuilder()

                .setCustomId('kick')

                .setLabel('Kick')

                .setEmoji('<:Kicked:1309240329953873930>')

                .setStyle(ButtonStyle.Secondary)

                .setDisabled(selected !== 'security_actions' || !interaction.member.permissions.has('KickMembers'));



            const row1 = new ActionRowBuilder().addComponents(userInfoButton, securityActionsButton);

            const row2 = new ActionRowBuilder().addComponents(banButton, kickButton);



            return [row1, row2];

        };



        // Zmiana w sposobie obsługi interakcji
        const response = await interaction.reply({
            embeds: [userInfoEmbed],
            components: createButtons('user_info'),
            ephemeral: true,
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({
                    content: 'You cannot use these buttons.',
                    ephemeral: true
                });
                return;
            }

            try {
                switch (i.customId) {
                    case 'user_info':
                        await i.deferUpdate();
                        await i.editReply({
                            embeds: [userInfoEmbed],
                            components: createButtons('user_info')
                        });
                        break;

                    case 'security_actions':
                        await i.deferUpdate();
                        await i.editReply({
                            embeds: [securityEmbed],
                            components: createButtons('security_actions')
                        });
                        break;

                    case 'ban':
                        if (interaction.member.permissions.has('BanMembers')) {
                            try {
                                await member.ban({ reason: 'Banned via slash security actions' });
                                await i.reply({
                                    content: `<:Fine:1309230992455630949> ${member.toString()} has been banned.`,
                                    ephemeral: true
                                });
                            } catch (error) {
                                await i.reply({
                                    content: '<:NotFine:1309235869567287296> Failed to ban the member.',
                                    ephemeral: true
                                });
                            }
                        } else {
                            await i.reply({
                                content: '<:PermissionsDeclined:1309230994951508031> You don\'t have permission to ban members.',
                                ephemeral: true
                            });
                        }
                        break;

                    case 'kick':
                        if (interaction.member.permissions.has('KickMembers')) {
                            try {
                                await member.kick('Kicked via security actions');
                                await i.reply({
                                    content: `<:Fine:1309230992455630949> ${member.toString()} has been kicked.`,
                                    ephemeral: true
                                });
                            } catch (error) {
                                await i.reply({
                                    content: '<:NotFine:1309235869567287296> Failed to kick the member.',
                                    ephemeral: true
                                });
                            }
                        } else {
                            await i.reply({
                                content: '<:PermissionsDeclined:1309230994951508031> You don\'t have permission to kick members.',
                                ephemeral: true
                            });
                        }
                        break;
                }
            } catch (error) {
                console.error('Error handling button interaction:', error);
                try {
                    await i.reply({
                        content: 'An error occurred while processing your request.',
                        ephemeral: true
                    });
                } catch (e) {
                    console.error('Error sending error message:', e);
                }
            }
        });

        collector.on('end', () => {
            try {
                interaction.editReply({
                    components: []
                }).catch(() => {});
            } catch (error) {
                console.error('Error removing buttons:', error);
            }
        });

    },

}; 
