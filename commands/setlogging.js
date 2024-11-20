const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

// Funkcja do inicjalizacji bazy danych
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('servers.db');
        
        db.run(`CREATE TABLE IF NOT EXISTS servers (
            server_id TEXT PRIMARY KEY,
            server_name TEXT,
            role_logs_channel_id TEXT,
            role_logs_channel_name TEXT,
            server_logs_channel_id TEXT,
            server_logs_channel_name TEXT,
            member_logs_channel_id TEXT,
            member_logs_channel_name TEXT,
            message_logs_channel_id TEXT,
            message_logs_channel_name TEXT,
            reaction_logs_channel_id TEXT,
            reaction_logs_channel_name TEXT,
            language TEXT DEFAULT 'en_eu'
        )`, (err) => {
            if (err) {
                db.close();
                reject(err);
                return;
            }
            resolve();
        });
        
        db.close();
    });
}

function updateLogChannel(serverId, serverName, logType, channelLogId, channelLogName) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('servers.db');
        
        // Najpierw sprawdź, czy serwer istnieje
        db.get('SELECT server_id FROM servers WHERE server_id = ?', [serverId], (err, row) => {
            if (err) {
                db.close();
                reject(err);
                return;
            }

            // Jeśli serwer nie istnieje, dodaj go
            if (!row) {
                db.run('INSERT INTO servers (server_id, server_name) VALUES (?, ?)', 
                    [serverId, serverName], (err) => {
                    if (err) {
                        db.close();
                        reject(err);
                        return;
                    }
                });
            }

            // Teraz zaktualizuj kanały logów
            let sql;
            let params;

            switch(logType) {
                case "Role Logs":
                    sql = `UPDATE servers SET 
                           role_logs_channel_id = ?, role_logs_channel_name = ?,
                           server_name = ?
                           WHERE server_id = ?`;
                    params = [channelLogId, channelLogName, serverName, serverId];
                    break;
                case "Server Logs":
                    sql = `UPDATE servers SET 
                           server_logs_channel_id = ?, server_logs_channel_name = ?,
                           server_name = ?
                           WHERE server_id = ?`;
                    params = [channelLogId, channelLogName, serverName, serverId];
                    break;
                case "Member Logs":
                    sql = `UPDATE servers SET 
                           member_logs_channel_id = ?, member_logs_channel_name = ?,
                           server_name = ?
                           WHERE server_id = ?`;
                    params = [channelLogId, channelLogName, serverName, serverId];
                    break;
                case "Message Logs":
                    sql = `UPDATE servers SET 
                           message_logs_channel_id = ?, message_logs_channel_name = ?,
                           server_name = ?
                           WHERE server_id = ?`;
                    params = [channelLogId, channelLogName, serverName, serverId];
                    break;
                case "Reaction Logs":
                    sql = `UPDATE servers SET 
                           reaction_logs_channel_id = ?, reaction_logs_channel_name = ?,
                           server_name = ?
                           WHERE server_id = ?`;
                    params = [channelLogId, channelLogName, serverName, serverId];
                    break;
                default:
                    sql = `UPDATE servers SET 
                           role_logs_channel_id = ?, role_logs_channel_name = ?,
                           server_logs_channel_id = ?, server_logs_channel_name = ?,
                           member_logs_channel_id = ?, member_logs_channel_name = ?,
                           message_logs_channel_id = ?, message_logs_channel_name = ?,
                           reaction_logs_channel_id = ?, reaction_logs_channel_name = ?,
                           server_name = ?
                           WHERE server_id = ?`;
                    params = [
                        channelLogId, channelLogName,
                        channelLogId, channelLogName,
                        channelLogId, channelLogName,
                        channelLogId, channelLogName,
                        channelLogId, channelLogName,
                        serverName, serverId
                    ];
            }

            db.run(sql, params, (err) => {
                db.close();
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogging')
        .setDescription('Set the logging channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Select a channel for logging')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('log_type')
                .setDescription('Select log type')
                .addChoices(
                    { name: 'All Logs', value: 'All Logs' },
                    { name: 'Role Logs', value: 'Role Logs' },
                    { name: 'Server Logs', value: 'Server Logs' },
                    { name: 'Member Logs', value: 'Member Logs' },
                    { name: 'Message Logs', value: 'Message Logs' },
                    { name: 'Reaction Logs', value: 'Reaction Logs' }
                )
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({ 
                content: '<:PermDenied:1248352895854973029> You don\'t have permissions to this command.',
                ephemeral: true 
            });
        }

        try {
            // Inicjalizuj bazę danych przy każdym wywołaniu komendy
            await initializeDatabase();

            const channel = interaction.options.getChannel('channel');
            const logType = interaction.options.getString('log_type') || 'All Logs';
            
            const serverId = interaction.guild.id;
            const serverName = interaction.guild.name;
            const channelLogId = channel.id;
            const channelLogName = channel.name;

            await updateLogChannel(serverId, serverName, logType, channelLogId, channelLogName);
            await interaction.reply({ 
                content: `<:Fine:1248352477502246932> Logging channel for ${logType} has been set to ${channel}`,
                ephemeral: true 
            });
        } catch (error) {
            console.error('Database error:', error);
            await interaction.reply({ 
                content: '<:NotFine:1248352479599661056> There was an error while setting the logging channel.',
                ephemeral: true 
            });
        }
    },
}; 