const { EmbedBuilder, Events, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadMemberLogsChannelId, currentDateTime } = require('../utils/imports');


class MemberUpdates {
    constructor(client) {
        this.client = client;
    }

    async handleMemberUpdate(oldMember, newMember) {
        try {
            const serverLanguage = await getServerLanguage(oldMember.guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
                const channelLogId = await loadMemberLogsChannelId(newMember.guild.id);
                if (!channelLogId) return;
                const logChannel = newMember.guild.channels.cache.get(channelLogId);
                if (!logChannel) return;
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate,
                    limit: 1
                });

                const entry = auditLogs.entries.first();
                if (!entry || entry.target.id !== newMember.id) return;
                const moderator = entry.executor;
                const reason = entry.reason || languageStrings.NO_REASON_PROVIDED;
                let embed;

                if (newMember.communicationDisabledUntil) {
                    const timeoutUntil = new Date(newMember.communicationDisabledUntil);
                    const warsawTime = timeoutUntil.toLocaleString('en-US', { 
                        timeZone: 'Europe/Warsaw',
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                    });

                    const moderatorNick = await newMember.guild.members.fetch(moderator.id)
                        .then(m => m.nickname || moderator.username)
                        .catch(() => moderator.username);
                    const memberNick = newMember.nickname || newMember.user.username;

                    embed = new EmbedBuilder()
                        .setTitle(languageStrings.MEMBER_TIMED_OUT_TITLE)
                        .setColor('#FF0000')
                        .addFields(
                            { name: languageStrings.USER, value: `${newMember.toString()} (${memberNick})`, inline: false },
                            { name: languageStrings.USER_ID, value: newMember.id, inline: false },
                            { name: languageStrings.REASON, value: `**${reason}**`, inline: false },
                            { name: languageStrings.MODERATOR, value: `${moderator.toString()} (${moderatorNick})`, inline: false },
                            { name: languageStrings.MODERATOR_ID, value: moderator.id, inline: false },
                            { name: languageStrings.TIMEOUT_UNTIL, value: warsawTime, inline: true },
                            { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                        );

                } else {
                    const moderatorNick = await newMember.guild.members.fetch(moderator.id)
                        .then(m => m.nickname || moderator.username)
                        .catch(() => moderator.username);
                    const memberNick = newMember.nickname || newMember.user.username;

                    embed = new EmbedBuilder()
                        .setTitle(languageStrings.MEMBER_UNMUTED_TITLE)
                        .setColor('#00FF00')
                        .addFields(
                            { name: languageStrings.USER, value: `${newMember.toString()} (${memberNick})`, inline: false },
                            { name: languageStrings.USER_ID, value: newMember.id, inline: false },
                            { name: languageStrings.MODERATOR, value: `${moderator.toString()} (${moderatorNick})`, inline: false },
                            { name: languageStrings.MODERATOR_ID, value: moderator.id, inline: false },
                            { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                        );
                }
                await logChannel.send({ embeds: [embed] });

            }

            if (oldMember.displayName !== newMember.displayName) {
                const channelLogId = await loadMemberLogsChannelId(oldMember.guild.id);
                if (!channelLogId) return;
                const logChannel = oldMember.guild.channels.cache.get(channelLogId);
                if (!logChannel) return;
                const embed = new EmbedBuilder()

                    .setTitle(languageStrings.EDITED_DISPLAY_NAME_TITLE)
                    .setColor('#800080');

                embed.addFields(
                    { name: languageStrings.USER, value: oldMember.toString() },
                    { name: languageStrings.OLD, value: oldMember.displayName, inline: false },
                    { name: languageStrings.NEW, value: newMember.displayName, inline: false }
                );

                const auditLogs = await oldMember.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate,
                    limit: 1
                });

                const entry = auditLogs.entries.first();

                if (entry && entry.target.id === newMember.id && 

                    entry.changes.find(change => change.key === 'nick')) {

                    const moderator = entry.executor;

                    const moderatorNick = await oldMember.guild.members.fetch(moderator.id)

                        .then(m => m.nickname || moderator.username)

                        .catch(() => moderator.username);



                    embed.addFields({ 

                        name: languageStrings.CHANGED_BY, 

                        value: `${moderator.toString()} (${moderatorNick})`, 

                        inline: false 

                    });

                }

                embed.addFields({ 

                    name: languageStrings.TODAY_AT, 

                    value: currentDateTime(), 

                    inline: true 

                });



                await logChannel.send({ embeds: [embed] });

            }


            const currentBoostCount = newMember.guild.premiumSubscriptionCount;
            const currentBoostLevel = newMember.guild.premiumTier;
            const previousBoostCount = oldMember.guild.premiumSubscriptionCount;
            const previousBoostLevel = oldMember.guild.premiumTier;

            if (!oldMember.premiumSince && newMember.premiumSince) {
                await this.logBoostEvent(
                    newMember,
                    languageStrings,
                    true,
                    currentBoostCount,
                    currentBoostLevel,
                    previousBoostCount,
                    previousBoostLevel
                );
            }

            if (oldMember.premiumSince && !newMember.premiumSince) {
                await this.logBoostEvent(
                    newMember,
                    languageStrings,
                    false,
                    currentBoostCount,
                    currentBoostLevel,
                    previousBoostCount,
                    previousBoostLevel
                );
            }

        } catch (error) {
            console.error('Error in handleMemberUpdate:', error);
        }
    }

    async logBoostEvent(member, languageStrings, isBoost, boostCount, boostLevel, previousBoostCount, previousBoostLevel) {

        try {

            if (!member.guild._boostEventLogged) {

                member.guild._boostEventLogged = new Map();

            }



            if (!member.guild._boostEventLogged.get(member.id)) {

                member.guild._boostEventLogged.set(member.id, true);



                const channelLogId = await loadServerLogsChannelId(member.guild.id);

                if (!channelLogId) return;



                const channel = member.guild.channels.cache.get(channelLogId);

                if (!channel) return;



                const embedTitle = isBoost ? languageStrings.BOOST_TITLE : languageStrings.UNBOOST_TITLE;

                const embedColor = isBoost ? '#FF69B4' : '#FF0000';



                const embed = new EmbedBuilder()

                    .setTitle(embedTitle)

                    .setColor(embedColor)

                    .addFields(

                        { 

                            name: languageStrings.USER, 

                            value: `${member.toString()} (${member.nickname || member.user.username})` 

                        },

                        { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }

                    );



                let message;

                if (isBoost) {

                    if (boostCount !== previousBoostCount && boostLevel === previousBoostLevel) {

                        message = languageStrings.SERVER_BOOST_INCREASE.replace('{boost_count}', boostCount);

                    } else if (boostLevel !== previousBoostLevel && boostCount === previousBoostCount) {

                        message = languageStrings.BOOST_LEVEL_INCREASE.replace('{boost_level}', boostLevel);

                    } else if (boostCount !== previousBoostCount && boostLevel !== previousBoostLevel) {

                        message = languageStrings.BOOST_AND_LEVEL_INCREASE

                            .replace('{boost_count}', boostCount)

                            .replace('{boost_level}', boostLevel);

                    }

                } else {

                    if (boostCount !== previousBoostCount && boostLevel === previousBoostLevel) {
                        message = languageStrings.SERVER_BOOST_DECREASE.replace('{boost_count}', boostCount);
                    } else if (boostLevel !== previousBoostLevel && boostCount === previousBoostCount) {
                        message = languageStrings.BOOST_LEVEL_DECREASE.replace('{boost_level}', boostLevel);
                    } else if (boostCount !== previousBoostCount && boostLevel !== previousBoostLevel) {
                        message = languageStrings.BOOST_AND_LEVEL_DECREASE
                            .replace('{boost_count}', boostCount)
                            .replace('{boost_level}', boostLevel);
                    }
                }

                embed.addFields({ 
                    name: languageStrings.BOOST_UPDATE, 
                    value: message, 
                    inline: false 
                });

                await channel.send({ embeds: [embed] });
                setTimeout(() => {
                    member.guild._boostEventLogged.delete(member.id);
                }, 5000);
            }

        } catch (error) {
            console.error('Error in logBoostEvent:', error);
        }
    }
}

module.exports = {
    name: Events.GuildMemberUpdate,
    once: false,
    async execute(oldMember, newMember) {
        const memberUpdates = new MemberUpdates(oldMember.client);
        await memberUpdates.handleMemberUpdate(oldMember, newMember);
    }
};