const { Client, GatewayIntentBits, ActivityType, EmbedBuilder } = require('discord.js');
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
    // 1. SMART TYPO-PROOF RULES & FEATURE GUIDE COMMAND
    // =======================================================
    
    // Check for hardcoded shortcuts first
    const ruleShortcuts = ['!rules', '!rulas', '!rulos', '!rul', '!rule', '!rls'];
    
    // Checks if the message matches a shortcut OR starts with an FAQ prefix and contains a rule keyword anywhere in it
    const isRuleCommand = ruleShortcuts.some(shortcut => msgLower.startsWith(shortcut)) || 
        ((msgLower.startsWith('!faq') || msgLower.startsWith('faq!') || msgLower.startsWith('faq/')) && 
         (msgLower.includes('rls') || msgLower.includes('rul') || msgLower.includes('rule') || msgLower.includes('rulas') || msgLower.includes('rulos')));

    if (isRuleCommand) {
        const rulesEmbed = new EmbedBuilder()
            .setColor('#00bfff')
            .setTitle('📚 StudioLearny Bot Guide & System Rules')
            .setDescription('Welcome to the official StudioLearny system manual! Below is the breakdown of how our custom automated features work for both students and staff.')
            .addFields(
                { 
                    name: '🎓 FOR STUDENTS', 
                    value: '• **Automated Lessons:** When an instructor publishes a lesson, you will receive a clean embedded summary containing the lesson link and resources.\n• **Smart Support:** If you ask vague questions or run into broken code, our assistance trackers will automatically guide you or point you to staff.' 
                },
                { 
                    name: '💼 FOR TEACHERS (Staff Tiers)', 
                    value: '• **Basic Teacher:** Access to publish standard template lessons using core bot triggers.\n• **Golden Teacher:** Enhanced perks including custom lesson titles and specialized curriculum content distribution.\n• **Diamond Teacher:** Premium tier with full access to custom formatting, advanced titles, and direct developer tools.'
                },
                {
                    name: '📝 SERVER CONDUCT',
                    value: '1. Please use the appropriate channels when requesting code assistance.\n2. Do not spam or misuse bot triggers.\n3. Respect the instructor hierarchy and moderation staff at all times.'
                }
            )
            .setFooter({ text: 'StudioLearny Management System • Continuous Learning' })
            .setTimestamp();

        return message.reply({ embeds: [rulesEmbed] });
    }

    // =======================================================
    // 2. MAXIMUM CAPACITY USER PHRASES LISTS (Conversational)
    // =======================================================
    
    // Massive list of ways users tell a bot it wasn't summoned for them
    const botDismissals = [
        'no not you', 'not you', 'wrong bot', 'shutup bot', 'shut up bot', 
        'go away', 'stop', 'quiet', 'wasnt talking to you', 'wasn\'t talking to you',
        'lol no', 'bruh no', 'not talking to you', 'stfu', 'shh', 'hush', 
        'leave', 'chill bot', 'stop bot', 'no u', 'no client', 'nvm', 'nevermind',
        'not u', 'unask', 'missclick', 'misclick', 'who asked', 'who asked u',
        'skip', 'cancel', 'ignore', 'nvmd', 'no thx', 'no thanks', 'im good', 
        'i\'m good', 'go away bot', 'hush bot', 'stop replying', 'wrong person', 
        'not asking you', 'didnt ask you', 'didn\'t ask you', 'chill out bot', 
        'dw', 'dont worry', 'don\'t worry', 'false alarm', 'nvm bot', 'shush'
    ];

    // Every casual, quick, or vague way people ask "how do I do this"
    const vagueQuestions = [
        'how to do this', 'how do i do this', 'anyone know how', 'anybody know how',
        'how to do this thing', 'how to make this work', 'need help with this',
        'how do this', 'how does this work', 'someone help with this', 'help with this',
        'how to fix this', 'stuck on this', 'how do i fix this', 'how to do it', 
        'how do it', 'anyone know this', 'know how to do', 'stuck on a thing',
        'how to code this', 'how to script this', 'how do i start this', 'need help doing',
        'how do i setup', 'how to setup', 'how does one do', 'how do you do', 
        'clue how to', 'idea how to', 'know how to'
    ];

    // Total coverage for phrases when a user's code/script is throwing errors
    const brokenCodePhrases = [
        'code working', 'code is not working', 'code isnt working', 'code working',
        'error in my code', 'code keeps crashing', 'code error', 'fix my code',
        'cant get this code', 'my code broke', 'code broken', 'script broke', 
        'script error', 'script isnt working', 'script not working', 'bug in code',
        'code broken', 'error log', 'syntax error', 'crash log', 'code fails',
        'code exploded', 'script exploded', 'my code is broken', 'my script is broken',
        'getting an error', 'throwing an error', 'code doesn\'t work', 'code doesnt work',
        'script doesn\'t work', 'script doesnt work', 'error message', 'line error',
        'code is failing', 'script is failing', 'buggy code', 'broken script'
    ];

    // =======================================================
    // 3. LOGIC & TRIGGER CHECKS (Conversational)
    // =======================================================

    // --- CONTEXT CHECK: User dismissing the bot ---
    if (recentClarifications.has(userId)) {
        const userIsDismissing = botDismissals.some(phrase => msgLower.includes(phrase));
        
        if (userIsDismissing) {
            recentClarifications.delete(userId);
            return message.reply('Understood. Apologies for the interruption.');
        }
    }

    // --- TRIGGER: Vague Help Question ---
    const isVagueQuestion = vagueQuestions.some(phrase => msgLower.includes(phrase)) || 
                            (msgLower.includes('know') && msgLower.includes('how'));

    if (isVagueQuestion) {
        // Track this user for 45 seconds to see if they dismiss the bot next
        recentClarifications.set(userId, true);
        setTimeout(() => recentClarifications.delete(userId), 45000); 

        return message.reply('could u clarify what u mean whit this');
    }

    // --- TRIGGER: Broken Code Help ---
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

client.login(process.env.DISCORD_TOKEN);SS
