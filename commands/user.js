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



        // Tworzenie embeda z informacjami o użytkowniku

        // const userFlags = [

        //     member.user.flags?.has('HOUSE_BRILLIANCE') ? '<:HypeSquad20:1234084736826347570>' : '',

        //     member.user.flags?.has('HOUSE_BALANCE') ? '<:HypeSquad10:1234084738550071326>' : '',

        //     member.user.flags?.has('HOUSE_BRAVERY') ? '<:HypeSquad00:1234084739921608784>' : '',

        //     member.user.flags?.has('ACTIVE_DEVELOPER') ? '<:ActiveDev0:1234084733986799668>' : '',

        //     member.user.flags?.has('EARLY_VERIFIED_BOT_DEVELOPER') ? '<:EarlyDev0:1234084744635875338>' : '',

        //     member.user.flags?.has('PARTNER') ? '<:Partner0:1234084741125247028>' : '',

        //     member.premiumSince ? '<:Booster2:1261343522188169227>' : '',

        //     guild.ownerId === member.id ? '<:Owner0:1234084745932177428>' : '',

        //     member.user.flags?.has('DISCORD_CERTIFIED_MODERATOR') ? '<:DiscordStaff:1261343775255433237>' : '',

        //     member.user.bot && !member.user.flags?.has('VERIFIED_BOT') ? '<:discordapp0:1234105198956515361>' : '',

        //     member.user.bot && member.user.flags?.has('VERIFIED_BOT') ? '<:verifiedapp0:1234105200411938938>' : '',

        // ].filter(Boolean);



        const accountCreatedAt = member.user.createdAt;

        const joinedAt = member.joinedAt;

        

        const userInfoEmbed = new EmbedBuilder()

            .setTitle('<:Member:1247954369639481498> Member Information Card')

            .setColor(member.displayHexColor)

            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))

            .addFields(

                { name: '<:Custom_Profile:1309232952697163960> **Displayed Username**', value: member.user.tag, inline: false },

                { name: '<:ID:1309218763521917040> **User ID**', value: member.id, inline: false },

                { name: '<:info:1309229015571234889> **User roles**', value: member.roles.cache.filter(r => r.name !== '@everyone').map(r => `<@&${r.id}>`).join(' ') || 'No roles', inline: false },

                { name: '<:info:1309229015571234889> **Highest role**', value: `<@&${member.roles.highest.id}>`, inline: false },

                // { name: '<:info:1309229015571234889> **User Badges**', value: userFlags.length ? userFlags.join(' ') : 'No badges', inline: false },

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

                { name: '<:Banned:1309234088594374717> Was Ever Banned?', value: wasBanned ? '<:Enabled:1248656166498730095> **Yes**' : '<:Disabled:1248656164342988832> No', inline: true },

                { name: '<:Kicked:1309240329953873930> Was Ever Kicked?', value: wasKicked ? '<:Enabled:1248656166498730095> **Yes**' : '<:Disabled:1248656164342988832> No', inline: true },

                { name: '<:Microphone_Muted:1309232020613890078> Was Ever Muted?', value: wasMuted ? '<:Enabled:1248656166498730095> **Yes**' : '<:Disabled:1248656164342988832> No', inline: true },

                { name: '<:WarnDeleted:1309243525539299459> Was Ever Warned?', value: wasWarned ? '<:Enabled:1248656166498730095> **Yes**' : '<:Disabled:1248656164342988832> No', inline: true },

                { name: '<:Report:1309246653240311880> Account is New', value: ((new Date() - member.user.createdAt) / (1000 * 60 * 60 * 24)) < 3 ? '<:Enabled:1248656166498730095> **Yes**' : '<:Disabled:1248656164342988832> No', inline: true },

                { name: '<:Report:1309246653240311880> No Profile Picture', value: !member.user.avatar ? '<:Enabled:1248656166498730095> **Yes**' : '<:Disabled:1248656164342988832> No', inline: true },

                { name: '<:SuspectedActivtie:1309234701709344889> Suspicious Account', value: isSuspicious ? '<:Enabled:1248656166498730095> **Yes**' : '<:Disabled:1248656164342988832> No', inline: true }

            );



        const createButtons = (selected) => {

            const userInfoButton = new ButtonBuilder()

                .setCustomId('user_info_button')

                .setLabel('User Information')

                .setStyle(selected === 'user_info' ? ButtonStyle.Success : ButtonStyle.Secondary);



            const securityActionsButton = new ButtonBuilder()

                .setCustomId('security_actions_button')

                .setLabel('Security Actions')

                .setStyle(selected === 'security_actions' ? ButtonStyle.Success : ButtonStyle.Secondary);



            const banButton = new ButtonBuilder()

                .setCustomId('ban_button')

                .setLabel('Ban')

                .setEmoji('<:Banned:1309234088594374717>')

                .setStyle(ButtonStyle.Secondary)

                .setDisabled(selected !== 'security_actions' || !interaction.member.permissions.has('BanMembers'));



            const kickButton = new ButtonBuilder()

                .setCustomId('kick_button')

                .setLabel('Kick')

                .setEmoji('<:Kicked:1309240329953873930>')

                .setStyle(ButtonStyle.Secondary)

                .setDisabled(selected !== 'security_actions' || !interaction.member.permissions.has('KickMembers'));



            const row1 = new ActionRowBuilder().addComponents(userInfoButton, securityActionsButton);

            const row2 = new ActionRowBuilder().addComponents(banButton, kickButton);



            return [row1, row2];

        };



        const response = await interaction.reply({

            embeds: [userInfoEmbed],

            components: createButtons('user_info'),

            ephemeral: true

        });



        const collector = response.createMessageComponentCollector({ time: 60000 });



        collector.on('collect', async i => {

            if (i.user.id !== interaction.user.id) return;



            switch (i.customId) {

                case 'user_info_button':

                    await i.update({

                        embeds: [userInfoEmbed],

                        components: createButtons('user_info')

                    });

                    break;



                case 'security_actions_button':

                    await i.update({

                        embeds: [securityEmbed],

                        components: createButtons('security_actions')

                    });

                    break;



                case 'ban_button':

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



                case 'kick_button':

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

        });



        collector.on('end', () => {

            interaction.editReply({

                components: []

            }).catch(() => {});

        });

    },

}; 
