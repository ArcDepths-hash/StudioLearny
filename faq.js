const { Client, GatewayIntentBits, ActivityType, EmbedBuilder, ChannelType } = require('discord.js');
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

client.on('messageCreate', async (message) => {
    // Ignore all bots
    if (message.author.bot) return;

    const userId = message.author.id;
    const msgLower = message.content.toLowerCase().trim();

    // =======================================================
    // 1. SMART TYPO-PROOF RULES & FEATURE GUIDE COMMAND
    // =======================================================
    const ruleShortcuts = ['!rules', '!rulas', '!rulos', '!rul', '!rule', '!rls'];
    
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
    // 2. ADMINISTRATIVE COMMANDS (!clean dm)
    // =======================================================
    if (msgLower === '!clean dm') {
        try {
            // Open/fetch the target user's Direct Message channel object
            const dmChannel = await message.author.createDM();
            
            // Send initial processing status message in public channel
            const processingNotice = await message.reply('🧹 *Attempting to scrub historical bot footprints from your direct messages...*');

            // Fetch the last 50 messages from the DM channel pipeline
            const dmHistory = await dmChannel.messages.fetch({ limit: 50 });
            
            // Isolate only messages that were sent by this bot client instance
            const botMessages = dmHistory.filter(msg => msg.author.id === client.user.id);

            if (botMessages.size === 0) {
                await processingNotice.edit('✨ Your DM history with this node is already empty or clear of active bot frames.');
                setTimeout(() => processingNotice.delete().catch(() => null), 7000);
                return;
            }

            let scrubbedCount = 0;
            
            // Sequentially edit the bot's messages down to empty markers or attempt direct deletion loops
            for (const [id, botMsg] of botMessages) {
                // Bots can delete their own text strings inside private DM contexts
                await botMsg.delete().catch(async () => {
                    // Fallback: If message age or state flags block absolute deletion, scrub content using systemic voids
                    await botMsg.edit({ content: '▫️ *Session history cleared by user choice.*', embeds: [], components: [] }).catch(() => null);
                });
                scrubbedCount++;
            }

            // Update public processing notification to display success metrics
            await processingNotice.edit(`✅ **Cleanup Sequence Complete.** Successfully cleared or voided \`${scrubbedCount}\` bot frames inside your private DM feed.`);
            
            // Clean up the public tracking notification after 7 seconds
            setTimeout(() => processingNotice.delete().catch(() => null), 7000);
            return;

        } catch (error) {
            console.error('[FAQ Engine Exception] Direct Message clean routine blocked:', error);
            const failureNotice = await message.reply('❌ **Matrix Transmission Blundered:** Failed to execute full DM scrub. Ensure your account privacy permissions permit server-member communication updates.');
            setTimeout(() => failureNotice.delete().catch(() => null), 7000);
            return;
        }
    }

    // =======================================================
    // 3. MAXIMUM CAPACITY USER PHRASES LISTS (Conversational)
    // =======================================================
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

    const vagueQuestions = [
        'how to do this', 'how do i do this', 'anyone know how', 'anybody know how',
        'how to do this thing', 'how to make this work', 'need help with this',
        'how do this', 'how does this work', 'someone help with this', 'help with this',
        'how to fix this', 'stuck on this', 'how do i fix this', 'how to do it', 
        'how do it', 'anyone know this', 'know how to do', 'stuck on a thing',
        'how to code this', 'how to script this', 'how do i start this', 'need help doing',
        'how do i setup', 'how to setup', 'how does one do', 'how you do', 
        'clue how to', 'idea how to', 'know how to'
    ];

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
    // 4. LOGIC & TRIGGER CHECKS WITH SELF-CLEANUP
    // =======================================================

    // --- CONTEXT CHECK: User dismissing the bot ---
    if (recentClarifications.has(userId)) {
        const userIsDismissing = botDismissals.some(phrase => msgLower.includes(phrase));
        
        if (userIsDismissing) {
            recentClarifications.delete(userId);
            const dismissalReply = await message.reply('Understood. Apologies for the interruption.');
            
            // Decays the apology message after 5 seconds to minimize channel pollution
            setTimeout(() => dismissalReply.delete().catch(() => null), 5000);
            return;
        }
    }

    // --- TRIGGER: Vague Help Question ---
    const isVagueQuestion = vagueQuestions.some(phrase => msgLower.includes(phrase)) || msgLower.includes('how');

    if (isVagueQuestion) {
        recentClarifications.set(userId, true);
        setTimeout(() => recentClarifications.delete(userId), 45000); 

        const clarificationReply = await message.reply('could u clarify what u mean whit this');

        // Decays the clarification prompt after 30 seconds
        setTimeout(() => clarificationReply.delete().catch(() => null), 30000);
        return;
    }

    // --- TRIGGER: Broken Code Help ---
    const isBrokenCode = brokenCodePhrases.some(phrase => msgLower.includes(phrase));

    if (isBrokenCode) {
        const staffRedirectReply = await message.reply('Please ask our moderation team or instructors for assistance.');
        
        // Decays the assistance redirect block after 20 seconds
        setTimeout(() => staffRedirectReply.delete().catch(() => null), 20000);
        return;
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
