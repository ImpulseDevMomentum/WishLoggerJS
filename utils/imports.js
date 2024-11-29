const Discord = require('discord.js');
const { Client, GatewayIntentBits, Partials, ChannelType } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const humanize = require('humanize-duration');
const { getClient } = require('./clientManager');

const client = getClient();

function loadRoleLogsChannelId(serverId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('servers.db');
        db.get('SELECT role_logs_channel_id FROM servers WHERE server_id = ?', [serverId], (err, row) => {
            db.close();
            if (err) reject(err);
            resolve(row ? row.role_logs_channel_id : null);
        });
    });
}

function loadServerLogsChannelId(serverId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('servers.db');
        db.get('SELECT server_logs_channel_id FROM servers WHERE server_id = ?', [serverId], (err, row) => {
            db.close();
            if (err) reject(err);
            resolve(row ? row.server_logs_channel_id : null);
        });
    });
}

function loadMemberLogsChannelId(serverId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('servers.db');
        db.get('SELECT member_logs_channel_id FROM servers WHERE server_id = ?', [serverId], (err, row) => {
            db.close();
            if (err) reject(err);
            resolve(row ? row.member_logs_channel_id : null);
        });
    });
}

function loadMessageLogsChannelId(serverId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('servers.db');
        db.get('SELECT message_logs_channel_id FROM servers WHERE server_id = ?', [serverId], (err, row) => {
            db.close();
            if (err) reject(err);
            resolve(row ? row.message_logs_channel_id : null);
        });
    });
}

function loadReactionLogsChannelId(serverId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('servers.db');
        db.get('SELECT reaction_logs_channel_id FROM servers WHERE server_id = ?', [serverId], (err, row) => {
            db.close();
            if (err) reject(err);
            resolve(row ? row.reaction_logs_channel_id : null);
        });
    });
}

function loadJson(filename) {
    try {
        if (fs.existsSync(filename)) {
            return JSON.parse(fs.readFileSync(filename, 'utf8'));
        }
        return {};
    } catch (error) {
        console.error(`Error loading JSON file ${filename}:`, error);
        return {};
    }
}

function saveJson(filename, data) {
    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error(`Error saving JSON file ${filename}:`, error);
    }
}

function updateServerLanguage(serverId, language) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('servers.db');
        db.run('UPDATE servers SET language = ? WHERE server_id = ?', [language, serverId], (err) => {
            db.close();
            if (err) reject(err);
            resolve();
        });
    });
}

function getServerLanguage(serverId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('servers.db');
        db.get('SELECT language FROM servers WHERE server_id = ?', [serverId], (err, row) => {
            db.close();
            if (err) reject(err);
            resolve(row ? row.language : 'en_eu');
        });
    });
}

function currentDateTime() {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const relative = `<t:${Math.floor(now.getTime() / 1000)}:R>`;
    return `**${formatted}** ${relative}`;
}

function formatTimedelta(milliseconds) {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

module.exports = {
    client,
    loadRoleLogsChannelId,
    loadServerLogsChannelId,
    loadMemberLogsChannelId,
    loadMessageLogsChannelId,
    loadReactionLogsChannelId,
    loadJson,
    saveJson,
    updateServerLanguage,
    getServerLanguage,
    currentDateTime,
    formatTimedelta
}; 