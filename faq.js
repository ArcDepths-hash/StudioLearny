const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Memory map to track who the bot recently asked for clarification
const recentClarifications = new Map();

client.once('ready', (c) => {
    console.log(`ℹ️ FAQ Bot is online as ${c.user.tag}`);
    client.user.setPresence({
        status: 'online',
        activities: [{ name: `StudioLearny FAQs`, type: ActivityType.Watching }]
    });
});

client.on('messageCreate', (message) => {
    // Ignore all bots
    if (message.author.bot) return;

    const userId = message.author.id;
    const msgLower = message.content.toLowerCase().trim();

    // =======================================================
    // LISTS OF POTENTIAL USER PHRASES (VARIATIONS)
    // =======================================================
    
    // Ways people tell a bot it wasn't talking to them
    const botDismissals = [
        'no not you', 'not you', 'wrong bot', 'shutup bot', 'shut up bot', 
        'go away', 'stop', 'quiet', 'wasnt talking to you', 'wasn\'t talking to you',
        'lol no', 'bruh no', 'not talking to you', 'stfu'
    ];

    // Ways people ask vague help questions
    const vagueQuestions = [
        'how to do this', 'how do i do this', 'anyone know how', 'anybody know how',
        'how to do this thing', 'how to make this work', 'need help with this'
    ];

    // Ways people complain about broken code
    const brokenCodePhrases = [
        'code working', 'code is not working', 'code isnt working', 'code working',
        'error in my code', 'code keeps crashing', 'code error', 'fix my code',
        'cant get this code'
    ];

    // =======================================================
    // LOGIC & TRIGGER CHECKS
    // =======================================================

    // --- 1. CONTEXT CHECK: User dismissing the bot ---
    if (recentClarifications.has(userId)) {
        const userIsDismissing = botDismissals.some(phrase => msgLower.includes(phrase));
        
        if (userIsDismissing) {
            recentClarifications.delete(userId);
            return message.reply('Understood. Apologies for the interruption.');
        }
    }

    // --- 2. TRIGGER: Vague Help Question ---
    const isVagueQuestion = vagueQuestions.some(phrase => msgLower.includes(phrase)) || 
                            (msgLower.includes('know') && msgLower.includes('how'));

    if (isVagueQuestion) {
        // Track this user for 45 seconds to see if they dismiss the bot next
        recentClarifications.set(userId, true);
        setTimeout(() => recentClarifications.delete(userId), 45000); 

        return message.reply('could u clarify what u mean whit this');
    }

    // --- 3. TRIGGER: Broken Code Help ---
    const isBrokenCode = brokenCodePhrases.some(phrase => msgLower.includes(phrase));

    if (isBrokenCode) {
        return message.reply('Please ask our moderation team or instructors for assistance.');
    }
});

// Separate web server port (8081) to prevent crashing your lesson-bot (8080)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('FAQ Bot Web Server Operational\n');
});

server.listen(8081, () => {
    console.log('FAQ Web Server listening on port 8081');
});

client.login(process.env.DISCORD_TOKEN);
