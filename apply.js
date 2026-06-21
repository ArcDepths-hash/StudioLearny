/**
 * ============================================================================
 * @file apply.js
 * @description Advanced StudioLearny Role Application & Faculty Vetting Engine
 * [Features: 100% Automated Hardcoded 12-Trial Curriculum Vetting Matrix]
 * @version 1.4.0
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
    ActivityType
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

const activeVettingSessions = new Map();

// ============================================================================
// 2. THE 12-TRIAL CURRICULUM ENGINE DATA STRUCTURE
// ============================================================================
const CURRICULUM = {
    Basic: {
        1: { title: "Pedagogy: Explaining Concepts", desc: "Ask the applicant to explain the difference between a synchronous and asynchronous function to a complete beginner. Evaluate clarity." },
        2: { title: "Syntax Check: Debugging Array Methods", desc: "Give them a broken `.map()` loop that mutates the original array. They must fix it to use pure functions and explain the correction." },
        3: { title: "Classroom Control: Handling Disruptions", desc: "Scenario: A student keeps posting irrelevant links in the programming channel. How do they handle it without ruining the learning vibe?" },
        4: { title: "Coding Challenge: Simple Logic", desc: "Have them write a JavaScript function that returns the factorial of an integer, handling edge cases like 0 and negative inputs." },
        5: { title: "Documentation Literacy", desc: "Ask them to find a specific obscure framework feature in the official docs and explain how they would present it to a class." },
        6: { title: "Code Review: API Error Handling", desc: "Provide a fetch request missing a try/catch block or HTTP status check. They must rewrite it safely." },
        7: { title: "Curriculum Design: Lesson Plan", desc: "Have them outline a 30-minute introductory lesson plan for Git/GitHub basics." },
        8: { title: "Live Presentation: Mini-Lecture", desc: "Have them spend 3 minutes live (or via text draft) explaining variables and scoping (`var`, `let`, `const`)." },
        9: { title: "Syntax Check: Object Destructuring", desc: "Challenge them to extract deeply nested properties from a complex JSON object cleanly in one line." },
        10: { title: "Student Support: Debugging Logic", desc: "Provide a student code snippet where a loop runs infinitely. They must guide the student to the answer instead of giving it away." },
        11: { title: "Architecture: Basic Modularization", desc: "Have them explain how and why they would split a massive single-file script into distinct utility modules." },
        12: { title: "Final Comprehensive Interview", desc: "Final verification of schedule availability, classroom commitment, and alignment with StudioLearny values." }
    },
    Golden: {
        1: { title: "Pedagogy: Advanced Data Structures", desc: "Explain the visual and operational difference between a Stack and a Queue, detailing real-world applications." },
        2: { title: "Syntax Check: Memory Leaks", desc: "Show them code with uncleared intervals or unhandled stream listeners. They must locate the memory leak and plug it." },
        3: { title: "Mentorship: Code Optimization", desc: "Give them a functional but highly nested, unoptimized nested loop array filter. They must optimize it to linear time complexity $O(N)$." },
        4: { title: "Coding Challenge: Algorithms", desc: "Ask them to implement a clean binary search algorithm and explain its runtime performance metrics." },
        5: { title: "Classroom Lead: Handling Complex Questions", desc: "A student asks an advanced, out-of-scope question that derails the current lesson. How do they pivot smoothly?" },
        6: { title: "Architecture: Multi-File Frameworks", desc: "Evaluate their plan for structuring an enterprise-grade multi-module workspace application with config isolation." },
        7: { title: "Code Review: Security Vulnerabilities", desc: "Present code using unsafe environment variable access or SQL/eval injections. They must harden the file." },
        8: { title: "Curriculum Design: Advanced Workshop", desc: "Review their syllabus outline for a full weekend crash-course covering REST API design and relational databases." },
        9: { title: "Syntax Check: Event Loops & Microtasks", desc: "Quiz them on the precise execution order of an event loop containing `setTimeout`, `process.nextTick`, and a resolved Promise." },
        10: { title: "Student Support: Explaining Edge Cases", desc: "How do they explain JavaScript floating-point precision issues ($0.1 + 0.2 \\neq 0.3$) to a frustrated student?" },
        11: { title: "Infrastructure: Database Integration", desc: "Have them explain standard database connection pool management and how they would teach connection pooling safely." },
        12: { title: "Golden Standard Review", desc: "Final evaluation of their branding understanding, design consistency, and commitment to the Golden Faculty tier." }
    },
    Diamond: {
        1: { title: "Pedagogy: High-Level Architecture", desc: "Explain Microservices vs. Monoliths to a graduating senior class, highlighting deployment and scaling bottlenecks." },
        2: { title: "Syntax Check: Concurrency & Race Conditions", desc: "Present multi-threaded or concurrent asynchronous tasks overriding shared variables. They must refactor using safe locking mechanics." },
        3: { title: "Masterclass: Systems Design Challenge", desc: "Have them sketch out an infrastructure system layout for a real-time chat application handling 50k concurrent users." },
        4: { title: "Coding Challenge: Complex Recursion", desc: "Have them construct a custom deep-clone algorithm handling recursive self-referential objects and symbols cleanly." },
        5: { title: "Mentorship: Senior Project Assessment", desc: "Simulate reviewing a complex student capstone architecture. They must give constructive architectural critiques." },
        6: { title: "Architecture: Production Deployment Pipelines", desc: "Detail how they would teach and implement safe CI/CD automated test integrations and container rollouts." },
        7: { title: "Code Review: Memory Profiles & Profiling", desc: "Explain how to diagnose heap dumps and garbage collection drops using Chrome DevTools or performance profilers." },
        8: { title: "Curriculum Design: Masterclass Creation", desc: "Present a comprehensive syllabus blueprint for an advanced distributed systems and database replication class." },
        9: { title: "Syntax Check: Advanced Design Patterns", desc: "Challenge them to explain and implement a functional Singleton, Observer, or Factory pattern in an active system framework." },
        10: { title: "Faculty Leadership: Handling Crisis", desc: "An entire live classroom session crashes due to infrastructure failure. How do they salvage the class and lead under pressure?" },
        11: { title: "Infrastructure: Cloud & Global Scaling", desc: "Assess their knowledge of caching layers (Redis), CDNs, and load balancing mechanics for high-availability deployments." },
        12: { title: "Diamond Absolute Vetting Evaluation", desc: "Final executive assessment of engineering excellence, teaching mastery, and leadership compatibility for the Diamond Faculty circle." }
    }
};

// ============================================================================
// 3. CORE LIFECYCLE INITIALIZATION
// ============================================================================
client.once('ready', (instance) => {
    console.log(`============================================================================`);
    console.log(`ℹ️ APPLY SYSTEM OPERATIONAL: ${instance.user.tag} IS ACTIVE`);
    console.log(`👑 Vetting Magistrate ID: ${OWNER_ID}`);
    console.log(`============================================================================`);
    
    client.user.setPresence({
        status: 'online',
        activities: [{ name: 'Faculty Vetting Trials', type: ActivityType.Watching }]
    });
});

// ============================================================================
// 4. CHAT COMMAND ROUTERS: !apply & !rankup
// ============================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const msgLower = message.content.toLowerCase().trim();

    // --- COMMAND: !apply ---
    if (msgLower === '!apply') {
        await message.delete().catch(() => null);

        const applyDashboardEmbed = new EmbedBuilder()
            .setTitle('🏛️ StudioLearny Faculty Entrance Bureau')
            .setDescription('Welcome to the qualification portal. Click the button below to initialize your application file for entry-level **Basic Teacher** infrastructure.')
            .setColor('#3498db')
            .addFields({ 
                name: '📘 Basic Blueprint Requirements', 
                value: '• Must not hold any active instructor rank profiles.\n• Requires passing a 12-trial evaluation block overseen by the Root Administrator.' 
            })
            .setFooter({ text: 'StudioLearny Certification Framework • Entrance Exam' });

        const applyRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('app_init_basic')
                    .setLabel('Apply for Basic Teacher')
                    .setStyle(ButtonStyle.Primary)
            );

        return message.channel.send({ embeds: [applyDashboardEmbed], components: [applyRow] });
    }

    // --- COMMAND: !rankup ---
    if (msgLower === '!rankup') {
        await message.delete().catch(() => null);

        const rankupDashboardEmbed = new EmbedBuilder()
            .setTitle('⭐ StudioLearny Faculty Rankup Escalator')
            .setDescription('Ready to elevate your structural clearance? Use the buttons below to initiate your next deployment layer verification cycle.')
            .setColor('#f1c40f')
            .addFields(
                { name: '🟡 Golden Rankup', value: 'Requires: Active **Basic Teacher** role.\n*Unlocks design frame overrides.*', inline: true },
                { name: '🔴 Diamond Masterclass', value: 'Requires: Active **Golden Teacher** role.\n*Unlocks premium media modules & global alerts.*', inline: true }
            )
            .setFooter({ text: 'StudioLearny Certification Framework • Promotion System' });

        const rankupRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('app_init_golden')
                    .setLabel('Rankup: Golden Teacher')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('app_init_diamond')
                    .setLabel('Rankup: Diamond Master')
                    .setStyle(ButtonStyle.Danger)
            );

        return message.channel.send({ embeds: [rankupDashboardEmbed], components: [rankupRow] });
    }
});

// ============================================================================
// 5. INTERACTION ROUTER (DYNAMIC PROGRESSION LOOP)
// ============================================================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const userId = interaction.user.id;
    const member = interaction.member;
    if (!member || !interaction.guild) return;

    const hasBasic = member.roles.cache.has(ROLES.Basic);
    const hasGolden = member.roles.cache.has(ROLES.Golden);
    const hasDiamond = member.roles.cache.has(ROLES.Diamond);

    // ------------------------------------------------------------------------
    // INTERACTION TIER INITIATION
    // ------------------------------------------------------------------------
    if (interaction.customId.startsWith('app_init_')) {
        let requestedTier = '';
        let passesGatekeeping = false;
        let errorMessage = '';

        if (interaction.customId === 'app_init_basic') {
            requestedTier = 'Basic';
            if (!hasBasic && !hasGolden && !hasDiamond) passesGatekeeping = true;
            else errorMessage = '❌ **Gatekeeper Exception:** You already hold a faculty position. Use `!rankup` to upgrade.';
        }

        if (interaction.customId === 'app_init_golden') {
            requestedTier = 'Golden';
            if (hasBasic && !hasGolden && !hasDiamond) passesGatekeeping = true;
            else errorMessage = '❌ **Gatekeeper Exception:** You must be a **Basic Teacher** to rank up to Golden.';
        }

        if (interaction.customId === 'app_init_diamond') {
            requestedTier = 'Diamond';
            if (hasGolden && !hasDiamond) passesGatekeeping = true;
            else errorMessage = '❌ **Gatekeeper Exception:** You must be a **Golden Teacher** to rank up to Diamond.';
        }

        if (!passesGatekeeping) return interaction.reply({ content: errorMessage, ephemeral: true });

        const hiddenHandshakeEmbed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🔏 Vetting Stream Locked')
            .setDescription(`Your application file for **${requestedTier} Faculty Status** is pre-compiled.\n\nClick below to securely initialize your evaluation setup room.`);

        const hiddenHandshakeRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`launch_setup_${userId}_${requestedTier}`)
                    .setLabel('🚀 Launch !setup Hook')
                    .setStyle(ButtonStyle.Secondary)
            );

        return interaction.reply({ embeds: [hiddenHandshakeEmbed], components: [hiddenHandshakeRow], ephemeral: true });
    }

    // ------------------------------------------------------------------------
    // OWNER EVALUATION ACTION HANDLERS
    // ------------------------------------------------------------------------
    if (interaction.customId.startsWith('vet_pass_') || interaction.customId.startsWith('vet_fail_')) {
        if (userId !== OWNER_ID) {
            return interaction.reply({ content: '❌ **Security Boundary Breach:** Access denied.', ephemeral: true });
        }

        const isPassAction = interaction.customId.startsWith('vet_pass_');
        const targetApplicantId = interaction.customId.split('_')[2];
        const sessionRecord = activeVettingSessions.get(targetApplicantId);

        if (!sessionRecord) return interaction.reply({ content: '❌ **Exception:** Active registry data not found.', ephemeral: true });

        // Handle Rejection / Session Vaporization
        if (!isPassAction) {
            activeVettingSessions.delete(targetApplicantId);
            const rejectEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Evaluation File Vaporized')
                .setDescription(`⚠️ <@${targetApplicantId}> failed to satisfy conditions at **Trial ${sessionRecord.currentTrial}/12**.`);
            
            await interaction.update({ content: ' ', embeds: [rejectEmbed], components: [] }).catch(() => null);
            return setTimeout(() => interaction.message.delete().catch(() => null), 4000);
        }

        // Handle Progression Loop
        if (sessionRecord.currentTrial < 12) {
            const nextTrialIndex = sessionRecord.currentTrial + 1;
            const nextTrialData = CURRICULUM[sessionRecord.targetTier][nextTrialIndex];

            // Securely advance the internal counter state AFTER verifying they cleared the previous one
            sessionRecord.currentTrial = nextTrialIndex;

            const updatedConsoleEmbed = new EmbedBuilder()
                .setColor('#e67e22')
                .setTitle(`⚖️ Vetting Ledger: Trial ${sessionRecord.currentTrial} / 12 [${sessionRecord.targetTier.toUpperCase()} MODE]`)
                .setDescription(`**Applicant:** <@${targetApplicantId}>\n**Target Rank:** \`${sessionRecord.targetTier} Faculty\`\n\n✅ *Previous stage cleared successfully.*\n\n**Current Active Trial Requirements:**\n🏁 **Objective:** ${nextTrialData.title}\n📋 **Directives:** ${nextTrialData.desc}\n\n*Magistrate: Evaluate performance. Press Pass Trial only AFTER the applicant has completed these requirements.*`)
                .setFooter({ text: `Vetting Matrix Secure Stream • Reserved for Owner Node Authorization` })
                .setTimestamp();

            return await interaction.update({ embeds: [updatedConsoleEmbed] }).catch(() => null);

        } else {
            // PROMOTION PROTOCOLS -> ALL 12 TRIALS RECOGNIZED AS COMPLETE
            activeVettingSessions.delete(targetApplicantId);
            const targetApplicantMember = await interaction.guild.members.fetch(targetApplicantId).catch(() => null);

            if (!targetApplicantMember) return interaction.reply({ content: '❌ **Error:** Applicant left server.', ephemeral: true });

            // Process mutations across the member role ledger sheets safely
            if (sessionRecord.targetTier === 'Basic') {
                await targetApplicantMember.roles.add(ROLES.Basic).catch(() => null);
            } else if (sessionRecord.targetTier === 'Golden') {
                await targetApplicantMember.roles.remove(ROLES.Basic).catch(() => null);
                await targetApplicantMember.roles.add(ROLES.Golden).catch(() => null);
            } else if (sessionRecord.targetTier === 'Diamond') {
                await targetApplicantMember.roles.remove(ROLES.Basic).catch(() => null);
                await targetApplicantMember.roles.remove(ROLES.Golden).catch(() => null);
                await targetApplicantMember.roles.add(ROLES.Diamond).catch(() => null);
            }

            const successReceipt = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('👑 Vetting Complete • Commission Granted')
                .setDescription(`🏆 **Promotion Matrix Confirmed.** <@${targetApplicantId}> cleared all 12 vetting trials successfully!\n\n**New Classification Rank:** Verified **${sessionRecord.targetTier} Teacher** Profile Infrastructure Loaded.`);

            await interaction.update({ content: ' ', embeds: [successReceipt], components: [] }).catch(() => null);
            
            await interaction.channel.send({
                content: `🎉 **Faculty Announcement:** Congratulations to <@${targetApplicantId}> on passing the 12 rigorous trials and advancing to **${sessionRecord.targetTier} Faculty Status**! 🎓`
            });

            return setTimeout(() => interaction.message.delete().catch(() => null), 4000);
        }
    }

    // ------------------------------------------------------------------------
    // APPLICANT INITIALIZES THE SECURE SESSION PANEL
    // ------------------------------------------------------------------------
    if (interaction.customId.startsWith('launch_setup_')) {
        const [, , targetApplicantId, targetTier] = interaction.customId.split('_');

        if (userId !== targetApplicantId) return interaction.reply({ content: '❌ Security mismatch.', ephemeral: true });
        if (activeVettingSessions.has(targetApplicantId)) return interaction.reply({ content: '⚠️ You already have an evaluation console pending.', ephemeral: true });

        const initialTrialData = CURRICULUM[targetTier][1];

        const evaluationEmbed = new EmbedBuilder()
            .setColor('#e67e22')
            .setTitle(`⚖️ Vetting Ledger: Trial 1 / 12 [${targetTier.toUpperCase()} MODE]`)
            .setDescription(`**Applicant:** <@${targetApplicantId}>\n**Target Rank:** \`${targetTier} Faculty\`\n\n**Current Active Trial Requirements:**\n🏁 **Objective:** ${initialTrialData.title}\n📋 **Directives:** ${initialTrialData.desc}\n\n*Magistrate: Evaluate performance. Press Pass Trial only AFTER the applicant has completed these requirements.*`)
            .setFooter({ text: `Reserved for Owner Node Authorization` })
            .setTimestamp();

        const vettingControlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`vet_pass_${targetApplicantId}`).setLabel('Pass Trial ✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`vet_fail_${targetApplicantId}`).setLabel('Fail/Vaporize Session ❌').setStyle(ButtonStyle.Danger)
            );

        const evalMessageInstance = await interaction.channel.send({
            content: `📢 **Evaluation Request Instantiated** for <@${targetApplicantId}>. Vetting node is live.`,
            embeds: [evaluationEmbed],
            components: [vettingControlRow]
        });

        activeVettingSessions.set(targetApplicantId, {
            currentTrial: 1,
            targetTier: targetTier,
            evaluationMessageId: evalMessageInstance.id,
            channelId: interaction.channelId
        });

        return interaction.reply({ content: '✅ **Handshake Resolved.** Your ledger file has been parsed into the control channel.', ephemeral: true });
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
