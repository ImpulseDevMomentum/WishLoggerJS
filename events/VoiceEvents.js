const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadServerLogsChannelId, currentDateTime } = require('../utils/imports');
const VOICE_TIMES_FILE = 'voice_times.json';



class VoiceEvents {

    constructor(client) {
        this.client = client;
        this.userVoiceTimes = new Map();
        this.loadVoiceTimes();
    }

    loadVoiceTimes() {
        try {
            if (fs.existsSync(VOICE_TIMES_FILE)) {
                const data = JSON.parse(fs.readFileSync(VOICE_TIMES_FILE, 'utf8'));
                Object.entries(data).forEach(([userId, time]) => {
                    this.userVoiceTimes.set(userId, new Date(time));
                });
            }
        } catch (error) {
            console.error('Error loading voice times:', error);
        }
    }

    saveVoiceTimes() {
        try {
            const data = {};
            this.userVoiceTimes.forEach((time, userId) => {
                data[userId] = time.toISOString();
            });
            fs.writeFileSync(VOICE_TIMES_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving voice times:', error);
        }
    }

    async getMemberStatus(member) {
        const isMuted = member.voice.selfMute ? '<:Microphone_Muted:1309232020613890078>' : '<:Microphone:1309232018894098452>';
        const isDeafened = member.voice.selfDeaf ? '<:Sound_Muted:1309232024841883678>' : '<:Sound:1309232023088660520>';
        return `${isMuted}${isDeafened}`;

    }

    async handleVoiceStateUpdate(oldState, newState) {
        try {
            const member = newState.member;
            const guild = member.guild;
            const serverLanguage = await getServerLanguage(guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );
            const logsChannelId = await loadServerLogsChannelId(guild.id);
            if (!logsChannelId) return;
            const logsChannel = guild.channels.cache.get(logsChannelId);
            if (!logsChannel) return;

            if (!oldState.channel && newState.channel) {
                const joinTime = new Date();
                // console.log(`User ${member.id} joined at:`, joinTime);
                this.userVoiceTimes.set(member.id, joinTime);
                this.saveVoiceTimes();

                const memberStatus = await this.getMemberStatus(member);
                const usersOnChannel = Array.from(newState.channel.members.values())
                    .filter(user => user.id !== member.id);
                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.JOINED_VC_TITLE)
                    .setColor('#00FF00')
                    .addFields(
                        { 
                            name: languageStrings.USER, 
                            value: `${member.toString()} (${member.nickname || member.user.username}) ${memberStatus}`, 
                            inline: false 
                        },

                        { 
                            name: languageStrings.VC_NAME, 
                            value: `${newState.channel.name} (<#${newState.channel.id}>)`, 
                            inline: false 
                        },
                        { name: languageStrings.VC_ID, value: newState.channel.id, inline: false }
                    );


                if (usersOnChannel.length > 0) {
                    const usersList = await Promise.all(usersOnChannel
                        .slice(0, 7)
                        .map(async user => {
                            const status = await this.getMemberStatus(user);
                            return `${user.toString()} (${user.nickname || user.user.username}) ${status}`;
                        }));

                    let usersListStr = usersList.join(', ');

                    if (usersOnChannel.length > 7) {
                        usersListStr += `, and ${usersOnChannel.length - 7} more`;
                    }

                    embed.addFields({ 
                        name: languageStrings.USERS_ON_CHANNEL, 
                        value: usersListStr, 
                        inline: false 
                    });
                }

                embed.addFields({ 
                    name: languageStrings.TODAY_AT, 
                    value: currentDateTime(), 
                    inline: true 
                });
                await logsChannel.send({ embeds: [embed] });
            }

            else if (oldState.channel && !newState.channel) {
                const joinTime = this.userVoiceTimes.get(member.id);
                // console.log(`User ${member.id} join time was:`, joinTime);
                this.userVoiceTimes.delete(member.id);
                this.saveVoiceTimes();
                let timeSpentStr = languageStrings.UNKNOWN;

            
                if (joinTime) {
                    const now = new Date();
                    // console.log('Current time:', now);
                    const timeSpent = Math.floor((now - joinTime) / 1000);
                    // console.log('Time spent in seconds:', timeSpent);
                    const hours = Math.floor(timeSpent / 3600);
                    const minutes = Math.floor((timeSpent % 3600) / 60);
                    const seconds = timeSpent % 60;

                    
                    if (timeSpent > 0) {
                        timeSpentStr = `${hours}h ${minutes}m ${seconds}s`;
                    } else {
                        timeSpentStr = '0s';
                    }
                    // console.log('Formatted time:', timeSpentStr);
                }

                const memberStatus = await this.getMemberStatus(member);
                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.LEFT_VC_TITLE)
                    .setColor('#FF0000')
                    .addFields(
                        { 
                            name: languageStrings.USER, 
                            value: `${member.toString()} (${member.nickname || member.user.username}) ${memberStatus}`, 
                            inline: false 
                        },
                        { 
                            name: languageStrings.VC_NAME, 
                            value: `${oldState.channel.name} (<#${oldState.channel.id}>)`, 
                            inline: false 
                        },
                        { name: languageStrings.VC_ID, value: oldState.channel.id, inline: false },
                        { name: languageStrings.TIME_SPENT, value: timeSpentStr, inline: false },
                        { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                    );
                await logsChannel.send({ embeds: [embed] });
            }
            else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                const joinTime = new Date();
                // console.log(`User ${member.id} moved channels, new join time:`, joinTime); // Debug log
                this.userVoiceTimes.set(member.id, joinTime);
                this.saveVoiceTimes();
                const memberStatus = await this.getMemberStatus(member);
                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.MOVED_VC_TITLE)
                    .setColor('#0000FF')
                    .addFields(
                        { 
                            name: languageStrings.USER, 
                            value: `${member.toString()} (${member.nickname || member.user.username}) ${memberStatus}`, 
                            inline: false 
                        },
                        { name: languageStrings.USER_ID, value: member.id, inline: true },
                        { 
                            name: languageStrings.FROM_VC, 
                            value: `${oldState.channel.name} (${oldState.channel.toString()})`, 
                            inline: false 
                        },
                        { 
                            name: languageStrings.TO_VC, 
                            value: `${newState.channel.name} (${newState.channel.toString()})`, 
                            inline: false 
                        },
                        { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: false }
                    );
                await logsChannel.send({ embeds: [embed] });
            }

            if (oldState.streaming !== newState.streaming && newState.channel) {
                const memberStatus = await this.getMemberStatus(member);
                const embed = new EmbedBuilder()
                    .setTitle(newState.streaming ? 
                        languageStrings.STREAM_STARTED_TITLE : 
                        languageStrings.STREAM_ENDED_TITLE
                    )
                    .setColor(newState.streaming ? '#00FF00' : '#FF0000')
                    .addFields(
                        { 
                            name: languageStrings.USER, 
                            value: `${member.toString()} (${member.nickname || member.user.username}) ${memberStatus}`, 
                            inline: false 
                        },
                        { 
                            name: languageStrings.VC_NAME, 
                            value: `<#${newState.channel.id}>`, 
                            inline: false 
                        },
                        { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                    );

                await logsChannel.send({ embeds: [embed] });
            }

            if (oldState.serverMute !== newState.serverMute || oldState.serverDeaf !== newState.serverDeaf) {

                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate,
                    limit: 1
                });

                const entry = auditLogs.entries.first();
                if (!entry || entry.target.id !== member.id) return;


                const moderator = entry.executor;
                let action, color;

                if (oldState.serverMute !== newState.serverMute) {
                    action = newState.serverMute ? 
                        languageStrings.MUTED_VC : 
                        languageStrings.UNMUTED_VC;
                    color = newState.serverMute ? '#FF0000' : '#00FF00';

                } else {
                    action = newState.serverDeaf ? 
                        languageStrings.DEAFENED : 
                        languageStrings.UNDEAFENED;
                    color = newState.serverDeaf ? '#FF0000' : '#00FF00';
                }
                const memberStatus = await this.getMemberStatus(member);
                const embed = new EmbedBuilder()
                    .setTitle(action)
                    .setColor(color)
                    .addFields(
                        { 
                            name: languageStrings.USER, 
                            value: `${member.toString()} (${member.nickname || member.user.username}) ${memberStatus}`, 
                            inline: false 
                        },
                        { name: languageStrings.USER_ID, value: member.id, inline: false },
                        { name: languageStrings.MODERATOR, value: moderator.toString(), inline: false },
                        { name: languageStrings.MODERATOR_ID, value: moderator.id, inline: false },
                        { 
                            name: languageStrings.CHANNEL, 
                            value: `<#${newState.channel?.id || 'Unknown'}>`, 
                            inline: false 
                        },

                        { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: true }
                    );

                await logsChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in handleVoiceStateUpdate:', error);
        }
    }
}

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState) {
        const voiceEvents = new VoiceEvents(oldState.client);
        await voiceEvents.handleVoiceStateUpdate(oldState, newState);
    }
};