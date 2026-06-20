const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http'); // Built-in Node.js package

// 1. CREATE A TINY WEB SERVER FOR RENDER (KEEPS IT ALIVE FOR FREE)
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('StudioLearny is alive!');
}).listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});

// 2. YOUR DISCORD BOT CODE
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const token = process.env.DISCORD_TOKEN;
let currentPrefix = '!'; 
const allowedPrefixes = ['!', '@', '#', '$', '%', '^', '&', '<', '>', '?', '/', '\\'];

client.once('ready', () => {
    console.log(`Bot is online! Using prefix: ${currentPrefix}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(currentPrefix)) return;

    const args = message.content.slice(currentPrefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'prefix' && args[0] === 'change') {
        await message.channel.send(
            `To change the prefix, please type your new prefix. It must be one of these characters:\n\`${allowedPrefixes.join(' ')}\``
        );

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, max: 1, time: 15000 });

        collector.on('collect', async (m) => {
            const chosenPrefix = m.content.trim();

            if (allowedPrefixes.includes(chosenPrefix)) {
                currentPrefix = chosenPrefix;
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
