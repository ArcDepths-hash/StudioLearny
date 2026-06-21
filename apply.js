/**
 * ============================================================================
 * @file apply.js
 * @description Advanced StudioLearny Dynamic Ticket & Faculty Vetting Engine
 * [Features: Auto-created Vetting Tickets & Bottom-Sticky Owner Control Console]
 * @version 1.5.0
 * @framework discord.js (v14+)
 * ============================================================================
 */

const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ActivityType,
    PermissionFlagsBits
} = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ============================================================================
// 1. SYSTEM CONFIGURATION & CONSTANTS
// ============================================================================
const OWNER_ID = '1511377539073966353'; 

const ROLES = {
    Basic: '1518179501056458792',
    Golden: '1518179528545931463',
    Diamond: '1518179554563194910'
};

// Tracks active sessions across memory heaps
// Mapping: channelId -> { targetApplicantId, currentTrial, targetTier, consoleMessageId }
const activeTicketSessions = new Map();

// ============================================================================
// 2. THE 12-TRIAL CURRICULUM ENGINE DATA STRUCTURE
// ============================================================================
const CURRICULUM = {
    Basic: {
        1: { title: "Pedagogy: Explaining Concepts", desc: "Explain the difference between a synchronous and asynchronous function to a complete beginner. Focus on structural clarity." },
        2: { title: "Syntax Check: Debugging Array Methods", desc: "Fix a broken `.map()` loop that inadvertently mutates the original global array. Provide the pure alternative." },
        3: { title: "Classroom Control: Handling Disruptions", desc: "Scenario: A student keeps posting irrelevant links in your programming channel. Detail your step-by-step resolution process." },
        4: { title: "Coding Challenge: Simple Logic", desc: "Write a JavaScript function that returns the factorial of an integer. Handle standard edge cases like 0 and negative numbers safely." },
        5: { title: "Documentation Literacy", desc: "Locate an obscure framework architecture feature in official docs and draft a snippet showing how you would demonstrate it." },
        6: { title: "Code Review: API Error Handling", desc: "Provide an asynchronous fetch block completely hardened against network crashes using reliable try/catch paradigms." },
        7: { title: "Curriculum Design: Lesson Plan", desc: "Outline a clear, 30-minute introductory curriculum timeline teaching Git/GitHub version tracking mechanics." },
        8: { title: "Presentation Scoping: Mini-Lecture", desc: "Draft a concise explanation detailing the exact scoping rules separating `var`, `let`, and `const` keywords." },
        9: { title: "Syntax Check: Object Destructuring", desc: "Extract deeply nested data points from a complex JSON response structure cleanly using a concise single-line assignment." },
        10: { title: "Student Support: Infinite Loops", desc: "A student provides a broken loop causing application crashes. Explain how you would guide them to the answer without handing over code." },
        11: { title: "Architecture: Basic Modularization", desc: "Explain the logical necessity of breaking a monolithic script into distinct utility files and configuration profiles." },
        12: { title: "Final Comprehensive Interview", desc: "Confirm long-term classroom commitment, lesson delivery availability, and core institutional objectives." }
    },
    Golden: {
        1: { title: "Pedagogy: Advanced Data Structures", desc: "Differentiate the operational behavior of Stacks versus Queues, outlining real-world practical use-cases." },
        2: { title: "Syntax Check: Memory Leaks", desc: "Analyze a running process dropping performance due to uncleared interval timers. Demonstrate the direct fix." },
        3: { title: "Mentorship: Code Optimization", desc: "Refactor a heavily nested quadratic loop scenario down to linear time complexity $O(N)$ cleanly." },
        4: { title: "Coding Challenge: Algorithms", desc: "Implement a fully optimized binary search algorithm block, detailing its algorithmic efficiency parameters." },
        5: { title: "Classroom Lead: Scope Deviations", desc: "A student derails a structured class with an ultra-advanced out-of-scope query. Outline your re-routing blueprint." },
        6: { title: "Architecture: Multi-File Frameworks", desc: "Design a configuration architecture for managing enterprise modularity with completely isolated system environments." },
        7: { title: "Code Review: Input Sanitation", desc: "Review an unsafe block vulnerable to malicious execution injections. Rewrite it using structural hardening mechanics." },
        8: { title: "Curriculum Design: Master Series Workshops", desc: "Draft a comprehensive weekend syllabus blueprint covering relational database structures and REST API modeling rules." },
        9: { title: "Syntax Check: Microtask Micro-Execution", desc: "Determine the exact console execution pattern of a loop sequence scheduling both resolved promises and immediate timeouts." },
        10: { title: "Student Support: Precision Artifacts", desc: "Draft an explanation guiding a confused student through JavaScript floating-point arithmetic errors like $0.1 + 0.2 \\neq 0.3$." },
        11: { title: "Infrastructure: Connection Pools", desc: "Explain data handling limits and connection pool optimization routines to a junior development class." },
        12: { title: "Golden Standard Verification", desc: "Final executive assessment of custom styling rules, design criteria compliance, and curriculum consistency." }
    },
    Diamond: {
        1: { title: "Pedagogy: Enterprise Architectures", desc: "Explain Monolithic systems versus distributed Microservice models, emphasizing horizontal scalability choke points." },
        2: { title: "Syntax Check: Race Conditions", desc: "Isolate a concurrent race condition overriding system variables. Refactor using robust asynchronous locking mechanisms." },
        3: { title: "Masterclass: Distributed Scale Designs", desc: "Draft a complete infrastructure layout for a real-time messaging pipeline handling 50k concurrent stream transactions." },
        4: { title: "Coding Challenge: Structural Cloning", desc: "Write an algorithm capable of recursively cloning multi-tiered self-referential objects without trigger overflows." },
        5: { title: "Mentorship: Senior Project Assessment", desc: "Review a complex backend capstone setup layout. Provide rigorous architectural critiques and optimizations." },
        6: { title: "Architecture: Automated Rollout Regimes", desc: "Detail your approach for teaching automated CI/CD pipeline structures with safe container rollbacks." },
        7: { title: "Code Review: Allocation Profiles", desc: "Explain the process of tracing memory allocation trends and tracking down garbage collection bottlenecks." },
        8: { title: "Curriculum Design: Advanced Computing", desc: "Construct a syllabus framework teaching distributed systems engineering, database sharding, and consensus models." },
        9: { title: "Syntax Check: Architectural Blueprints", desc: "Implement a production-grade instance of the Observer or Singleton pattern within a modular system context." },
        10: { title: "Faculty Leadership: Emergency Contingencies", desc: "A live lecture platform suffers severe system crashes. Outline your immediate plan to recover the class and direct your team under pressure." },
        11: { title: "Infrastructure: Global Caching Strategies", desc: "Detail how you teach multi-region proxy management, load balancers, and Redis caching topologies." },
        12: { title: "Diamond Absolute Vetting Evaluation", desc: "Final executive performance assessment regarding framework leadership, technical mastery, and structural synergy." }
    }
};

client.once('ready', (instance) => {
    console.log(`============================================================================`);
    console.log(`ℹ️ TICKET VETTING ENGINE ONLINE: ${instance.user.tag}`);
    console.log(`👑 Root Vetting Magistrate ID: ${OWNER_ID}`);
    console.log(`============================================================================`);
    
    client.user.setPresence({
        status: 'online',
        activities: [{ name: 'Vetting Tickets', type: ActivityType.Watching }]
    });
});

// ============================================================================
// 3. UTILITY HELPER: GENERATE STICKY MANAGEMENT CONSOLE
// ============================================================================
async function sendStickyConsole(channel, session) {
    // Purge previous instance footprint to keep workspace orderly
    if (session.consoleMessageId) {
        const oldMsg = await channel.messages.fetch(session.consoleMessageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => null);
    }

    const trialData = CURRICULUM[session.targetTier][session.currentTrial];

    const consoleEmbed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`⚖️ Vetting System: Trial ${session.currentTrial} / 12 [${session.targetTier.toUpperCase()} MODE]`)
        .setDescription(`**Applicant:** <@${session.targetApplicantId}>\n**Target Rank:** \`${session.targetTier} Faculty\`\n\n**Current Active Task:**\n🏁 **Objective:** ${trialData.title}\n📋 **Directives:** ${trialData.desc}\n\n*Magistrate <@${OWNER_ID}>: Review the answers above. Press Pass to load the next task phase.*`)
        .setFooter({ text: 'StudioLearny Console • Always Sticks to Bottom' })
        .setTimestamp();

    const controlRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`ticket_pass_${session.targetApplicantId}`).setLabel('Pass Trial ✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`ticket_fail_${session.targetApplicantId}`).setLabel('Fail/Close Ticket ❌').setStyle(ButtonStyle.Danger)
        );

    const freshConsoleInstance = await channel.send({ embeds: [consoleEmbed], components: [controlRow] });
    session.consoleMessageId = freshConsoleInstance.id;
}

// ============================================================================
// 4. STICKY INTERCEPTOR: FORCES CONSOLE TO THE BOTTOM ON ANY MESSAGE
// ============================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const msgLower = message.content.toLowerCase().trim();

    // Check if message belongs inside an active vetting ticket room
    if (activeTicketSessions.has(message.channelId)) {
        const session = activeTicketSessions.get(message.channelId);
        // Re-render immediately at the base of the channel
        return await sendStickyConsole(message.channel, session);
    }

    // --- SETUP COMMAND A: !apply ---
    if (msgLower === '!apply') {
        await message.delete().catch(() => null);

        const applyEmbed = new EmbedBuilder()
            .setTitle('🏛️ StudioLearny Entrance Bureau')
            .setDescription('Click below to initialize your application ticket for entry-level **Basic Teacher** standing.')
            .setColor('#3498db')
            .setFooter({ text: 'StudioLearny Operations • Entrance Portal' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('init_ticket_basic').setLabel('Apply: Basic Teacher').setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [applyEmbed], components: [row] });
    }

    // --- SETUP COMMAND B: !rankup ---
    if (msgLower === '!rankup') {
        await message.delete().catch(() => null);

        const rankupEmbed = new EmbedBuilder()
            .setTitle('⭐ StudioLearny Rankup Escalator')
            .setDescription('Elevate your faculty status footprint. Use the options below to build your rankup verification trial channel.')
            .setColor('#f1c40f')
            .setFooter({ text: 'StudioLearny Operations • Promotion Portal' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('init_ticket_golden').setLabel('Rankup: Golden Teacher').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('init_ticket_diamond').setLabel('Rankup: Diamond Master').setStyle(ButtonStyle.Danger)
        );

        return message.channel.send({ embeds: [rankupEmbed], components: [row] });
    }
});

// ============================================================================
// 5. INTERACTION MANAGEMENT ENGINE (TICKET SPIN-UP & TRIAL GRADING)
// ============================================================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const userId = interaction.user.id;
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const hasBasic = member.roles.cache.has(ROLES.Basic);
    const hasGolden = member.roles.cache.has(ROLES.Golden);
    const hasDiamond = member.roles.cache.has(ROLES.Diamond);

    // ------------------------------------------------------------------------
    // SUB-ROUTINE: INITIALIZE AND CREATE PRIVATE VETTING TICKET
    // ------------------------------------------------------------------------
    if (interaction.customId.startsWith('init_ticket_')) {
        let targetTier = interaction.customId.split('_')[2];
        targetTier = targetTier.charAt(0).toUpperCase() + targetTier.slice(1); // Standardize string

        let passesGatekeeping = false;
        let gateMessage = '';

        if (targetTier === 'Basic') {
            if (!hasBasic && !hasGolden && !hasDiamond) passesGatekeeping = true;
            else gateMessage = '❌ You already hold faculty placement file records.';
        } else if (targetTier === 'Golden') {
            if (hasBasic && !hasGolden && !hasDiamond) passesGatekeeping = true;
            else gateMessage = '❌ You must hold active **Basic Teacher** rank options to deploy Golden requests.';
        } else if (targetTier === 'Diamond') {
            if (hasGolden && !hasDiamond) passesGatekeeping = true;
            else gateMessage = '❌ You must hold active **Golden Teacher** rank options to deploy Diamond requests.';
        }

        if (!passesGatekeeping) return interaction.reply({ content: gateMessage, ephemeral: true });

        // Acknowledge immediate request processing footprint
        await interaction.deferReply({ ephemeral: true });

        // Spin up the completely isolated text ticket channel
        const cleanName = `${targetTier.toLowerCase()}-vetting-${interaction.user.username}`;
        const vettingChannel = await guild.channels.create({
            name: cleanName,
            type: 0, // GuildText Channel
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // Public Lockout
                { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }, // Applicant
                { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] } // You
            ]
        });

        const initialSessionData = {
            targetApplicantId: userId,
            currentTrial: 1,
            targetTier: targetTier,
            consoleMessageId: null
        };

        activeTicketSessions.set(vettingChannel.id, initialSessionData);

        // Render Trial 1 console directly onto the fresh channel canvas base
        await sendStickyConsole(vettingChannel, initialSessionData);

        return interaction.editReply({ content: `✅ **Vetting Channel Established.** Please proceed directly to your evaluation interface room: <#${vettingChannel.id}>` });
    }

    // ------------------------------------------------------------------------
    // SUB-ROUTINE: MASTER MANAGEMENT AND PROGRESSION TRACKING (OWNER LOCKED)
    // ------------------------------------------------------------------------
    if (interaction.customId.startsWith('ticket_pass_') || interaction.customId.startsWith('ticket_fail_')) {
        if (userId !== OWNER_ID) {
            return interaction.reply({ content: '❌ **Security Matrix Alert:** Action locked to Root Administrator.', ephemeral: true });
        }

        const isPassAction = interaction.customId.startsWith('ticket_pass_');
        const session = activeTicketSessions.get(interaction.channelId);

        if (!session) return interaction.reply({ content: '❌ **Exception:** Session routing maps not found.', ephemeral: true });

        const targetMemberInstance = await guild.members.fetch(session.targetApplicantId).catch(() => null);

        // --- HANDLER: EXECUTING FAIL ACTION / CLOSING TERMINAL ---
        if (!isPassAction) {
            activeTicketSessions.delete(interaction.channelId);
            
            const abortEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Evaluation Terminated')
                .setDescription(`⚠️ Application framework closed down. Vetting path terminated at **Trial ${session.currentTrial}/12**.\n\n*Destroying channel elements...*`);
            
            await interaction.update({ embeds: [abortEmbed], components: [] }).catch(() => null);
            return setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
        }

        // --- HANDLER: PROGRESSION SYSTEM MARKERS ---
        if (session.currentTrial < 12) {
            // Securely bump the baseline counter forward
            session.currentTrial += 1;
            
            // Re-render updated task variables directly at the bottom
            return await sendStickyConsole(interaction.channel, session);

        } else {
            // --- HANDLER: CLEARING STEP 12 SUCCESSFULLY (GRANT ROLES & CELEBRATE) ---
            activeTicketSessions.delete(interaction.channelId);

            if (!targetMemberInstance) {
                return interaction.reply({ content: '❌ **State Error:** Applicant left server environments.', ephemeral: true });
            }

            // Execute rank mutations cleanly to protect server tier lines
            if (session.targetTier === 'Basic') {
                await targetMemberInstance.roles.add(ROLES.Basic).catch(() => null);
            } else if (session.targetTier === 'Golden') {
                await targetMemberInstance.roles.remove(ROLES.Basic).catch(() => null);
                await targetMemberInstance.roles.add(ROLES.Golden).catch(() => null);
            } else if (session.targetTier === 'Diamond') {
                await targetMemberInstance.roles.remove(ROLES.Basic).catch(() => null);
                await targetMemberInstance.roles.remove(ROLES.Golden).catch(() => null);
                await targetMemberInstance.roles.add(ROLES.Diamond).catch(() => null);
            }

            const graduationEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('👑 Vetting Phase Complete')
                .setDescription(`🏆 **Verification Succeeded.** <@${session.targetApplicantId}> has passed all 12 institutional vetting challenges!\n\n**Assigned Faculty Profile:** \`${session.targetTier} Teacher\` Credentials successfully injected.\n\n*Closing out current vetting room terminal hooks...*`);

            await interaction.update({ embeds: [graduationEmbed], components: [] }).catch(() => null);

            // Announce promotion tracking details to a public channel if preferred, or leave it in current context channel
            await interaction.channel.send({
                content: `🎉 **Faculty Announcement:** Congratulations to <@${session.targetApplicantId}> on clearing their 12 operational trials and advancing to **${session.targetTier} Standing**! 🎓`
            });

            return setTimeout(() => interaction.channel.delete().catch(() => null), 7000);
        }
    }
});

// ============================================================================
// 6. INFRASTRUCTURE KEEP-ALIVE SERVER PORT HOOK ROUTINES
// ============================================================================
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Apply Vetting Triage Web Server Operational\n');
});

server.listen(8081, () => {
    console.log('📡 Apply Vetting Web Server listening securely on isolated port 8081');
});

client.login(process.env.DISCORD_TOKEN);
