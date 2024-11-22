const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const clientManager = require('./utils/clientManager');
const sqlite3 = require('sqlite3');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildWebhooks
    ]
});

clientManager.setClient(client);

// Kolekcja komend
client.commands = new Collection();

// Funkcja do rejestracji komend w API Discorda
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
        console.error('❌ Error during command deployment:', error);
    }
}

// Funkcja do inicjalizacji komend lokalnie
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
    console.log(`Failed to load: ${commandFiles.length - client.commands.size}`);
    console.log('\n');
}

// Funkcja do inicjalizacji eventów
async function initializeEvents() {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    console.log(`Found ${eventFiles.length} event files`);
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const eventModule = require(filePath);
        
        try {
            // Sprawdzamy, czy moduł zawiera wiele eventów
            const events = [eventModule];
            if (eventModule.emojiCreate) events.push(eventModule.emojiCreate);
            if (eventModule.emojiDelete) events.push(eventModule.emojiDelete);
            if (eventModule.emojiUpdate) events.push(eventModule.emojiUpdate);
            if (eventModule.createEvent) events.push(eventModule.createEvent);
            if (eventModule.deleteEvent) events.push(eventModule.deleteEvent);
            if (eventModule.updateEvent) events.push(eventModule.updateEvent);
            // Dodajemy webhook eventy
            if (eventModule.webhookCreate) events.push(eventModule.webhookCreate);
            if (eventModule.webhookDelete) events.push(eventModule.webhookDelete);
            if (eventModule.webhooksUpdate) events.push(eventModule.webhooksUpdate);
            if (eventModule.webhookUpdate) events.push(eventModule.webhookUpdate);

            for (const event of events) {
                if (event.name) {
                    if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args));
                    } else {
                        client.on(event.name, (...args) => event.execute(...args));
                    }
                    console.log(`✅ Successfully loaded event: ${event.name} from ${file}`);
                }
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
    console.log(`Bot is ready!`);
    
    client.user.setPresence({
        activities: [{ 
            name: `/help | ${client.guilds.cache.size} servers`,
            type: 3
        }],
        status: 'online'
    });
    
    client.on('guildCreate', () => {
        client.user.setPresence({
            activities: [{ 
                name: `/help | ${client.guilds.cache.size} servers`,
                type: 3
            }],
            status: 'online'
        });
    });

    client.on('guildDelete', () => {
        client.user.setPresence({
            activities: [{ 
                name: `/help | ${client.guilds.cache.size} servers`,
                type: 3
            }],
            status: 'online'
        });
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
            console.error('Error while handling command error:', e);
        }
    }
});

client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    if (error.code === 10062) return;
    console.error('Unhandled promise rejection:', error);
});

client.login(process.env.TOKEN);