const sqlite3 = require('sqlite3').verbose();

class ServerEvents {
    constructor(client) {
        this.client = client;
    }

    async handleGuildJoin(guild) {
        const server_id = guild.id;
        const server_name = guild.name;
        const language = "en_us";
        
        const role_logs_channel_id = null;
        const role_logs_channel_name = null;
        const server_logs_channel_id = null;
        const server_logs_channel_name = null;
        const member_logs_channel_id = null;
        const member_logs_channel_name = null;
        const message_logs_channel_id = null;
        const message_logs_channel_name = null;
        const reaction_logs_channel_id = null;
        const reaction_logs_channel_name = null;

        const db = new sqlite3.Database('servers.db');
        
        return new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO servers (
                    server_id, server_name, role_logs_channel_id, role_logs_channel_name, 
                    server_logs_channel_id, server_logs_channel_name, 
                    member_logs_channel_id, member_logs_channel_name, 
                    message_logs_channel_id, message_logs_channel_name, 
                    reaction_logs_channel_id, reaction_logs_channel_name, 
                    language
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                server_id, server_name, role_logs_channel_id, role_logs_channel_name, 
                server_logs_channel_id, server_logs_channel_name, 
                member_logs_channel_id, member_logs_channel_name, 
                message_logs_channel_id, message_logs_channel_name, 
                reaction_logs_channel_id, reaction_logs_channel_name, 
                language
            ], (err) => {
                db.close();
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async handleGuildRemove(guild) {
        const server_id = guild.id;
        const db = new sqlite3.Database('servers.db');

        return new Promise((resolve, reject) => {
            db.run(`
                DELETE FROM servers WHERE server_id = ?
            `, [server_id], (err) => {
                db.close();
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = {
    name: 'guildEvents',
    execute(client) {
        const serverEvents = new ServerEvents(client);

        client.on('guildCreate', async (guild) => {
            try {
                await serverEvents.handleGuildJoin(guild);
                console.log(`Added new server to database: ${guild.name} (${guild.id})`);
            } catch (error) {
                console.error('Error handling guild join:', error);
            }
        });

        client.on('guildDelete', async (guild) => {
            try {
                await serverEvents.handleGuildRemove(guild);
                console.log(`Removed server from database: ${guild.name} (${guild.id})`);
            } catch (error) {
                console.error('Error handling guild remove:', error);
            }
        });
    }
}; 