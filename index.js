const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');

const fs = require('fs');

const path = require('path');

require('dotenv').config();



const client = new Client({

    intents: [

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMembers,

        GatewayIntentBits.GuildMessages,

        GatewayIntentBits.GuildVoiceStates,

        GatewayIntentBits.MessageContent

    ]

});



// Kolekcja komend

client.commands = new Collection();



// Funkcja do rejestracji komend w API Discorda

async function deployCommands() {

    const commands = [];

    const commandsPath = path.join(__dirname, 'commands');

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));



    console.log('Found command files:', commandFiles);



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

    


    console.log('\n');
    console.log(`Successfully loaded: ${client.commands.size}`);

    console.log(`Failed to load: ${commandFiles.length - client.commands.size}`);

}



// Event ready

client.once('ready', async () => {

    console.log(`Logged in as ${client.user}`);

    

    // Najpierw deployujemy komendy do Discorda

    await deployCommands();

    

    // Następnie inicjalizujemy je lokalnie

    await initializeCommands();


    console.log(`Serving ${client.guilds.cache.size} servers`);

    console.log(`${client.user} is ready!`);

    

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

        if (interaction.replied || interaction.deferred) {

            await interaction.followUp({

                content: 'There was an error while executing this command!',

                ephemeral: true

            });

        } else {

            await interaction.reply({

                content: 'There was an error while executing this command!',

                ephemeral: true

            });

        }

    }

});



client.on('error', error => {

    console.error('Discord client error:', error);

});



process.on('unhandledRejection', error => {

    console.error('Unhandled promise rejection:', error);

});



client.login(process.env.TOKEN); 
