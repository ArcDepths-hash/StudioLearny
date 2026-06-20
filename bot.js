const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const token = process.env.DISCORD_TOKEN;

// We use 'let' instead of 'const' so the bot can change this variable later
let currentPrefix = '!'; 

// A list of allowed special characters for the prefix
const allowedPrefixes = ['!', '@', '#', '$', '%', '^', '&', '<', '>', '?', '/', '\\'];

client.once('ready', () => {
    console.log(`Bot is online! Using prefix: ${currentPrefix}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Check if the message starts with whatever the CURRENT prefix is
    if (!message.content.startsWith(currentPrefix)) return;

    // Split the message into the command and arguments
    const args = message.content.slice(currentPrefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. !ping command (dynamically uses the current prefix)
    if (command === 'ping') {
        await message.channel.send('pong!');
    }

    // 2. !prefix change command
    if (command === 'prefix' && args[0] === 'change') {
        await message.channel.send(
            `To change the prefix, please type your new prefix. It must be one of these characters:\n\`${allowedPrefixes.join(' ')}\``
        );

        // Set up a collector to wait for the user's next message
        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, max: 1, time: 15000 });

        collector.on('collect', async (m) => {
            const chosenPrefix = m.content.trim();

            // Check if what they typed is in our allowed list
            if (allowedPrefixes.includes(chosenPrefix)) {
                currentPrefix = chosenPrefix; // Update the prefix!
                await message.channel.send(`Success! The prefix has been changed to: \`${currentPrefix}\``);
            } else {
                await message.channel.send(`Failed. \`${chosenPrefix}\` is not an allowed prefix character.`);
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                message.channel.send('Prefix change timed out. Please try again.');
            }
        });
    }
});

client.login(token);
