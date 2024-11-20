const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');

const fs = require('fs');

const path = require('path');

require('dotenv').config();

const clientManager = require('./utils/clientManager');

const client = new Client({

    intents: [

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMembers,

        GatewayIntentBits.GuildMessages,

        GatewayIntentBits.GuildVoiceStates,

        GatewayIntentBits.MessageContent

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



// Event ready

client.once('ready', async () => {

    

    // Najpierw deployujemy komendy do Discorda

    await deployCommands();

    

    // Następnie inicjalizujemy je lokalnie

    await initializeCommands();
    console.log(`Serving ${client.guilds.cache.size} servers`);
    console.log(`Logged in as ${client.user.username}`);

    

    client.user.setPresence({

        activities: [{ 

            name: `/help | ${client.guilds.cache.size} servers`,

            type: 3

        }],

        status: 'online'

    });

    

    // Aktualizacja statusu przy zmianie liczby serwerów

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



// Reszta kodu pozostaje bez zmian...

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

    if (error.code === 10062) return; // Ignorujemy błędy "Unknown interaction"

    console.error('Unhandled promise rejection:', error);

});



client.login(process.env.TOKEN); 