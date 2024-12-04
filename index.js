const { Client, GatewayIntentBits, Collection, REST, Routes, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const clientManager = require('./utils/clientManager');
const sqlite3 = require('sqlite3');
const ServerEvents = require('./events/ServerEvents');



const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildModeration
    ],
    partials: [
        Partials.GuildMember,
        Partials.User
    ]
});

clientManager.setClient(client);
client.commands = new Collection();

async function deployCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    console.log('Found command files:', commandFiles);
    console.log('\n');

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command) {
            commands.push(command.data.toJSON());
        }
    }

    const rest = new REST().setToken(process.env.TOKEN);

    try {
        console.log(`Starting to refresh ${commands.length} application (/) commands.`);
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Successfully registered ${data.length} application commands.`);
        console.log('\n');

    } catch (error) {
        console.error('❌ Error during command deployment! -> ', error);
    }
}
async function initializeCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    console.log(`Found ${commandFiles.length} command files`);

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        try {
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`❌ Failed to load command ${file}: Missing required "data" or "execute" property`);
            }

        } catch (error) {
            console.log(`❌ Failed to load command ${file}: ${error.message}`);
        }
    }

    console.log(`Successfully loaded: ${client.commands.size}`);
    console.log(`Failed to load -> ${commandFiles.length - client.commands.size}`);
    console.log('\n');
}

async function initializeEvents() {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    console.log(`Found ${eventFiles.length} event files`);

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        console.log(`Loading event file: ${file}`);
        const eventModule = require(filePath);

        try {
            if (Array.isArray(eventModule)) {
                console.log(`Loading multiple events from ${file}`);
                eventModule.forEach(event => {
                    if (event.name) {
                        console.log(`Registering event: ${event.name} from ${file}`);
                        if (event.once) {
                            client.once(event.name, (...args) => event.execute(...args));
                        } else {
                            client.on(event.name, (...args) => event.execute(...args));
                        }
                        console.log(`✅ Successfully loaded event: ${event.name} from ${file}`);
                    }
                });
            } else if (eventModule.name) {
                console.log(`Registering single event: ${eventModule.name} from ${file}`);
                if (eventModule.once) {
                    client.once(eventModule.name, (...args) => eventModule.execute(...args));
                } else {
                    client.on(eventModule.name, (...args) => eventModule.execute(...args));
                }
                console.log(`✅ Successfully loaded event: ${eventModule.name} from ${file}`);
            }
        } catch (error) {
            console.log(`❌ Failed to load event ${file}: ${error.message}`);
        }
    }
    console.log('\n');
}

client.once('ready', async () => {
    console.log(`\n=== BOT STARTUP ===`);
    console.log(`Logged in as ${client.user.tag}`);
    ServerEvents.execute(client);

    console.log('\n=== CHECKING BANNED SERVERS ===');
    const disallowedPath = path.join(__dirname, 'utils/DisallowedServers.json');
    const disallowedData = JSON.parse(fs.readFileSync(disallowedPath, 'utf8'));

    for (const guild of client.guilds.cache.values()) {
        if (disallowedData.Banned[guild.id]) {
            console.log(`Leaving banned server: ${guild.name} (${guild.id})`);
            await guild.leave();
        }
    }

    console.log('Banned servers check complete.\n');
    console.log('\n=== CHECKING SERVERS LIST ===');

    try {
        await Promise.all(client.guilds.cache.map(async (guild) => {
            if (!disallowedData.Servers[guild.id]) {
                const serverInfo = {
                    name: guild.name,
                    description: guild.description || "No description",
                    ownerId: guild.ownerId,
                    ownerTag: (await guild.fetchOwner()).user.tag,
                    joinedAt: new Date().toISOString()
                };

                disallowedData.Servers[guild.id] = serverInfo;
                console.log(`Added missing server to DisallowedServers.json: ${guild.name}`);
            }
        }));

        for (const serverId in disallowedData.Servers) {
            if (!client.guilds.cache.has(serverId)) {
                delete disallowedData.Servers[serverId];
                console.log(`Removed non-existent server from DisallowedServers.json: ${serverId}`);
            }
        }

        fs.writeFileSync(disallowedPath, JSON.stringify(disallowedData, null, 2));
    } catch (error) {
        console.error('Error during servers list check:', error);
    }
    console.log('Servers list check complete.\n');

    await deployCommands();
    await initializeCommands();
    await initializeEvents();

    console.log('\n=== DATABASE CHECK ===');
    const db = new sqlite3.Database('servers.db');

    try {
        await Promise.all(client.guilds.cache.map(async (guild) => {
            return new Promise((resolve, reject) => {
                db.get('SELECT role_logs_channel_id FROM servers WHERE server_id = ?', [guild.id], async (err, row) => {
                    if (err) {
                        console.error(`Error checking server ${guild.name}: ${err}`);
                        resolve();
                        return;
                    }

                    if (!row) {
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
                            if (err) {
                                console.error(`Failed to add server ${guild.name} (${guild.id}): ${err}`);
                            } else {
                                console.log(`Added missing server to database: ${guild.name}`);
                            }
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        }));

    } catch (error) {
        console.error('Error during database check:', error);
    } finally {
        db.close();
        console.log('Database check complete.\n');
    }

    console.log(`\n=== SERVER STATUS ===`);
    console.log(`Serving ${client.guilds.cache.size} servers`);
    console.log(`Wish is ready!`);

    client.user.setPresence({
        activities: [{ 
            name: `/help | ${client.guilds.cache.size} servers`,
            type: 3
        }],
        status: 'online'
    });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;

    }
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        try {
            const errorMessage = {
                content: 'There was an error while executing this command!',
                ephemeral: true

            };

            if (interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else if (!interaction.replied) {
                await interaction.reply(errorMessage);
            }

        } catch (e) {
            console.error('Error while handling command error! -> ', e);
        }
    }
});

client.on('error', error => {
    console.error('Discord client error! -> ', error);
});



process.on('unhandledRejection', error => {
    if (error.code === 10062) return;
    console.error('Unhandled promise rejection:', error);
});

client.on('debug', console.log);
client.on('guildMemberRemove', (member) => {
    console.log('RAW guildMemberRemove event triggered for:', member.user.tag);
});

client.login(process.env.TOKEN);