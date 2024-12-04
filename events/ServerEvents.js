const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class ServerEvents {
    constructor(client) {
        this.client = client;
    }

    async handleGuildJoin(guild) {
        const disallowedPath = path.join(__dirname, '../utils/DisallowedServers.json');
        const disallowedData = JSON.parse(fs.readFileSync(disallowedPath, 'utf8'));

        if (disallowedData.Banned[guild.id]) {
            console.log(`Attempted to join banned server: ${guild.name} (${guild.id})`);
            await guild.leave();
            return;
        }

        const serverInfo = {
            name: guild.name,
            description: guild.description || "No description",
            ownerId: guild.ownerId,
            ownerTag: (await guild.fetchOwner()).user.tag,
            joinedAt: new Date().toISOString()
        };

        disallowedData.Servers[guild.id] = serverInfo;
        fs.writeFileSync(disallowedPath, JSON.stringify(disallowedData, null, 2));

        const db = new sqlite3.Database('servers.db');
        
        try {
            const exists = await new Promise((resolve, reject) => {
                db.get('SELECT server_id FROM servers WHERE server_id = ?', [guild.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? true : false);
                });
            });

            if (!exists) {
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO servers (
                            server_id, server_name, 
                            role_logs_channel_id, role_logs_channel_name,
                            server_logs_channel_id, server_logs_channel_name,
                            member_logs_channel_id, member_logs_channel_name,
                            message_logs_channel_id, message_logs_channel_name,
                            reaction_logs_channel_id, reaction_logs_channel_name,
                            language
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        guild.id, guild.name,
                        null, null,
                        null, null,
                        null, null,
                        null, null,
                        null, null,
                        'en_us'
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        } finally {
            db.close();
        }

        this.client.user.setPresence({
            activities: [{ 
                name: `/help | ${this.client.guilds.cache.size} servers`,
                type: 3
            }],
            status: 'online'
        });
    }

    async handleGuildRemove(guild) {
        const disallowedPath = path.join(__dirname, '../utils/DisallowedServers.json');
        const disallowedData = JSON.parse(fs.readFileSync(disallowedPath, 'utf8'));

        if (!disallowedData.Banned[guild.id] && disallowedData.Servers[guild.id]) {
            delete disallowedData.Servers[guild.id];
            fs.writeFileSync(disallowedPath, JSON.stringify(disallowedData, null, 2));
            console.log(`Removed server from Servers list: ${guild.name} (${guild.id})`);
        } else if (disallowedData.Banned[guild.id]) {
            console.log(`Server ${guild.name} (${guild.id}) remains in banned list`);
        }

        const db = new sqlite3.Database('servers.db');
        
        try {
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM servers WHERE server_id = ?', [guild.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } finally {
            db.close();
        }

        this.client.user.setPresence({
            activities: [{ 
                name: `/help | ${this.client.guilds.cache.size} servers`,
                type: 3
            }],
            status: 'online'
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