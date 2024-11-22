const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { getServerLanguage, loadServerLogsChannelId, currentDateTime } = require('../utils/imports');

const WEBHOOKS_STATE_FILE = "webhooks_state.json";

function loadWebhooksState() {
    if (fs.existsSync(WEBHOOKS_STATE_FILE)) {
        return JSON.parse(fs.readFileSync(WEBHOOKS_STATE_FILE, 'utf8'));
    }
    return {};
}

function saveWebhooksState(state) {
    fs.writeFileSync(WEBHOOKS_STATE_FILE, JSON.stringify(state, null, 4));
}

class WebhookEvents {
    constructor(client) {
        this.client = client;
    }

    async handleWebhooksUpdate(channel) {
        try {
            if (!channel || !channel.guild) return;

            const guild = channel.guild;
            const guildId = guild.id.toString();
            const channelId = channel.id.toString();

            const serverLanguage = await getServerLanguage(guild.id);
            const languageStrings = JSON.parse(
                fs.readFileSync(`language/${serverLanguage}.json`, 'utf8')
            );

            const channelLogId = await loadServerLogsChannelId(guild.id);
            if (!channelLogId) return;

            const logChannel = guild.channels.cache.get(channelLogId);
            if (!logChannel) return;

            const currentWebhooks = await channel.fetchWebhooks().catch(() => new Map());
            const currentWebhooksState = {};
            currentWebhooks.forEach(webhook => {
                const avatarUrl = webhook.avatar 
                    ? webhook.avatarURL() 
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'; // Domyślny avatar

                currentWebhooksState[webhook.id] = {
                    name: webhook.name,
                    avatar: avatarUrl
                };

                // Debugowanie w konsoli
                console.log('Webhook details:', {
                    id: webhook.id,
                    name: webhook.name,
                    avatar: webhook.avatar,
                    avatarURL: webhook.avatarURL(),
                    defaultAvatar: avatarUrl,
                    owner: webhook.owner ? webhook.owner.tag : 'Unknown'
                });
            });

            const state = loadWebhooksState();
            const guildState = state[guildId] || {};
            const previousWebhooksState = guildState[channelId] || {};

            const newWebhooks = Object.keys(currentWebhooksState).filter(id => !previousWebhooksState[id]);
            const deletedWebhooks = Object.keys(previousWebhooksState).filter(id => !currentWebhooksState[id]);
            const updatedWebhooks = Object.keys(currentWebhooksState).filter(id => 
                previousWebhooksState[id] && (
                    currentWebhooksState[id].name !== previousWebhooksState[id].name ||
                    currentWebhooksState[id].avatar !== previousWebhooksState[id].avatar
                )
            );

            for (const webhookId of newWebhooks) {
                const webhook = currentWebhooks.get(webhookId);
                const avatarUrl = webhook.avatar 
                    ? webhook.avatarURL() 
                    : 'https://cdn.discordapp.com/embed/avatars/0.png';
                const creator = webhook.owner ? await guild.members.fetch(webhook.owner.id).catch(() => null) : null;
                const creatorMention = creator ? `${creator.toString()} (${creator.nickname || creator.user.username})` : languageStrings.UNKNOWN;

                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.WEBHOOK_CREATED_TITLE)
                    .setColor('#00FF00')
                    .addFields(
                        { name: languageStrings.CHANNEL, value: channel.toString(), inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { 
                            name: `${languageStrings.WEBHOOK}: ${webhook.name}`,
                            value: `${languageStrings.URL}: [URL](${webhook.url})\n` +
                                  `${languageStrings.AVATAR}: [${languageStrings.AVATAR_WEBHOOK}](${avatarUrl})\n` +
                                  `${languageStrings.CREATOR}: ${creatorMention}`,
                            inline: true 
                        },
                        { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: false }
                    );

                await logChannel.send({ embeds: [embed] });
            }

            for (const webhookId of deletedWebhooks) {
                const webhookData = previousWebhooksState[webhookId];
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.WebhookDelete,
                    limit: 1
                });
                
                const executor = auditLogs.entries.first()?.executor;
                const moderator = executor ? 
                    `${executor.toString()} (${
                        await guild.members.fetch(executor.id)
                            .then(member => member.nickname || executor.username)
                            .catch(() => executor.username)
                    })` : 
                    languageStrings.UNKNOWN;

                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.WEBHOOK_DELETED_TITLE)
                    .setColor('#FF0000')
                    .addFields(
                        { name: languageStrings.CHANNEL, value: channel.toString(), inline: true },
                        { name: languageStrings.WEBHOOK, value: webhookData.name, inline: true },
                        { name: languageStrings.MODERATOR_WEBHOOK, value: moderator, inline: true },
                        { name: languageStrings.TODAY_AT, value: currentDateTime(), inline: false }
                    );

                await logChannel.send({ embeds: [embed] });
            }

            for (const webhookId of updatedWebhooks) {
                const webhook = currentWebhooks.get(webhookId);
                const oldData = previousWebhooksState[webhookId];
                const newData = currentWebhooksState[webhookId];

                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.WebhookUpdate,
                    limit: 1
                });

                const creator = webhook.owner ? await guild.members.fetch(webhook.owner.id).catch(() => null) : null;
                const creatorMention = creator ? `${creator.toString()} (${creator.nickname || creator.user.username})` : languageStrings.UNKNOWN;
                
                const executor = auditLogs.entries.first()?.executor;
                const moderator = executor ? 
                    `${executor.toString()} (${
                        await guild.members.fetch(executor.id)
                            .then(member => member.nickname || executor.username)
                            .catch(() => executor.username)
                    })` : 
                    languageStrings.UNKNOWN;

                const embed = new EmbedBuilder()
                    .setTitle(languageStrings.WEBHOOK_UPDATED_TITLE.replace('{new_name}', webhook.name))
                    .setColor('#FFA500');

                if (oldData.name !== newData.name) {
                    embed.addFields(
                        { name: languageStrings.CHANNEL, value: channel.toString(), inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { 
                            name: `${languageStrings.WEBHOOK_NAME_UPDATED}`,
                            value: `${oldData.name} ${languageStrings.TO} ${newData.name}\n` +
                                  `${languageStrings.URL}: [URL](${webhook.url})\n` +
                                  `${languageStrings.CREATOR}: ${creatorMention}\n` +
                                  `${languageStrings.MODERATOR_WEBHOOK}: ${moderator}`,
                            inline: true
                        }
                    );
                }

                if (oldData.avatar !== newData.avatar) {
                    embed.addFields(
                        { name: languageStrings.CHANNEL, value: channel.toString(), inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { 
                            name: `${languageStrings.WEBHOOK_AVATAR_UPDATED}`,
                            value: `${languageStrings.AVATAR}: [${languageStrings.OLD_AVATAR}](${oldData.avatar}) ${languageStrings.TO} [${languageStrings.NEW_AVATAR}](${newData.avatar})\n` +
                                  `${languageStrings.URL}: [URL](${webhook.url})\n` +
                                  `${languageStrings.CREATOR}: ${creatorMention}\n` +
                                  `${languageStrings.MODERATOR_WEBHOOK}: ${moderator}`,
                            inline: true
                        }
                    );
                }

                embed.addFields({ name: languageStrings.TODAY_AT, value: currentDateTime(), inline: false });
                await logChannel.send({ embeds: [embed] });
            }

            if (!state[guildId]) {
                state[guildId] = {};
            }
            state[guildId][channelId] = currentWebhooksState;
            saveWebhooksState(state);

        } catch (error) {
            console.error('Error in handleWebhooksUpdate:', error);
        }
    }
}

const webhooksUpdate = {
    name: 'webhooksUpdate',
    once: false,
    async execute(channel) {
        if (!channel) return;
        const webhookEvents = new WebhookEvents(channel.client);
        await webhookEvents.handleWebhooksUpdate(channel);
    }
};

module.exports = webhooksUpdate;