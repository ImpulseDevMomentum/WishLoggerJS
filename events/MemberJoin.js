const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadMemberLogsChannelId, currentDateTime } = require('../utils/imports');

const INVITE_CACHE_FILE = 'invite_cache.json';
const USERS_INFO_FILE = 'users_info.json';

function loadJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return {};
    }
}

function saveJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

class MemberJoin {
    constructor(client) {
        this.client = client;
        this.inviteCache = loadJsonFile(INVITE_CACHE_FILE);
        this.usersInfo = loadJsonFile(USERS_INFO_FILE);
    }

    async handleMemberJoin(member) {
        try {
            const serverLanguage = await getServerLanguage(member.guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const invitesBefore = this.inviteCache[member.guild.id] || {};
            const invitesAfter = await member.guild.invites.fetch();

            let usedInvite = null;
            for (const [, invite] of invitesAfter) {
                if (invitesBefore[invite.code] && invitesBefore[invite.code] < invite.uses) {
                    usedInvite = invite;
                    break;
                }
            }

            this.inviteCache[member.guild.id] = Object.fromEntries(
                invitesAfter.map(invite => [invite.code, invite.uses])
            );
            saveJsonFile(INVITE_CACHE_FILE, this.inviteCache);

            const isFirstJoin = !this.usersInfo[member.id];
            if (isFirstJoin) {
                this.usersInfo[member.id] = { joinedAt: member.joinedAt.toString() };
            }

            const channelLogId = await loadMemberLogsChannelId(member.guild.id);
            if (!channelLogId) return;

            const channel = member.guild.channels.cache.get(channelLogId);
            if (!channel) return;

            let embed;
            if (member.user.bot) {
                embed = new EmbedBuilder()
                    .setTitle(languageStrings.BOT_ADDED_TITLE)
                    .setColor('#00FF00')
                    .addFields(
                        { name: languageStrings.NAME, value: member.user.username, inline: false },
                        { 
                            name: languageStrings.AUTHORIZED_BY, 
                            value: usedInvite ? usedInvite.inviter.toString() : languageStrings.UNKNOWN, 
                            inline: false 
                        },
                        { 
                            name: languageStrings.VERIFIED, 
                            value: `${member.user.flags.has(1 << 16) ? '<:Enabled:1309252483411087423>' : '<:NotFine:1309235869567287296>'}`, 
                            inline: false 
                        }
                    );
            } else {
                embed = new EmbedBuilder()
                    .setTitle(languageStrings.USER_JOINED_TITLE)
                    .setColor('#00FF00')
                    .addFields(
                        { name: languageStrings.USER, value: `${member.toString()} (${member.user.tag})`, inline: false },
                        { name: languageStrings.USER_ID, value: member.id.toString(), inline: false }
                    );

                const accountCreatedDaysAgo = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
                if (accountCreatedDaysAgo < 3) {
                    embed.addFields({ name: languageStrings.ACCOUNT_AGE, value: languageStrings.ACCOUNT_AGE_WARNING, inline: false });
                }

                const banLogs = await member.guild.fetchAuditLogs({
                    limit: 100,
                    type: 22
                });

                const kickLogs = await member.guild.fetchAuditLogs({
                    limit: 100,
                    type: 20
                });

                const banLog = banLogs.entries.find(entry => 
                    entry.target?.id === member.id
                );

                const kickLog = kickLogs.entries.find(entry => 
                    entry.target?.id === member.id
                );

                if (banLog) {
                    embed.addFields({ 
                        name: languageStrings.WAS_EVER_BANNED, 
                        value: `${languageStrings.USER_PREVIOUSLY_BANNED}\n${languageStrings.BANNED_BY}: <@${banLog.executor.id}> (${banLog.executor.tag})`, 
                        inline: false 
                    });
                }

                if (kickLog) {
                    embed.addFields({ 
                        name: languageStrings.WAS_EVER_KICKED, 
                        value: `${languageStrings.USER_PREVIOUSLY_KICKED}\n${languageStrings.KICKED_BY}: <@${kickLog.executor.id}> (${kickLog.executor.tag})`, 
                        inline: false 
                    });
                }

                const joinStatus = isFirstJoin ? languageStrings.USER_FIRST_JOIN : languageStrings.USER_REJOINED;
                embed.addFields({ name: languageStrings.JOINED_BEFORE, value: joinStatus, inline: false });

                if (usedInvite) {
                    embed.addFields(
                        { 
                            name: languageStrings.INVITED_BY, 
                            value: `${usedInvite.inviter.toString()} (${usedInvite.inviter.tag})`, 
                            inline: false 
                        },
                        { name: languageStrings.INVITE_CODE, value: `https://discord.gg/${usedInvite.code}`, inline: false },
                        { name: languageStrings.INVITE_USES, value: usedInvite.uses.toString(), inline: false }
                    );
                }
            }

            embed.addFields({ name: languageStrings.TODAY_AT, value: currentDateTime(), inline: false });
            await channel.send({ embeds: [embed] });

            saveJsonFile(USERS_INFO_FILE, this.usersInfo);
        } catch (error) {
            console.error('Error in handleMemberJoin:', error);
        }
    }
}

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member) {
        const memberJoin = new MemberJoin(member.client);
        await memberJoin.handleMemberJoin(member);
    }
};