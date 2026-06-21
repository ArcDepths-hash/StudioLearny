/**
 * ============================================================================
 * @file bot.js
 * @description Advanced StudioLearny Lesson Dispatch & Infrastructure Bot
 * [Upgraded: Dynamic Single-Message DM UI Framework]
 * @version 3.1.0
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
    ChannelType,
    ActivityType,
    PermissionFlagsBits
} = require('discord.js');
const http = require('http');

// Initialize the Gateway Client Instance with full structural intent scopes
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

// ============================================================================
// 1. SYSTEM CONFIGURATION & COMPONENT STATES
// ============================================================================
const OWNER_ID = '1511377539073966353'; // Verified Owner ID

const ROLES = {
    Basic: '1518179501056458792',
    Golden: '1518179528545931463',
    Diamond: '1518179554563194910'
};

// Internal Volatile State Machines stored across localized RAM allocations
const activeWizards = new Map();
const metricsEngine = {
    commandsExecuted: 0,
    wizardsStarted: 0,
    wizardsCompleted: 0,
    wizardsFailed: 0,
    bootTime: new Date()
};

/**
 * Internal Logging Facility providing highly structured terminal feedback
 */
const logger = {
    info: (msg) => console.log(`[INFO]  | ${new Date().toISOString()} | ${msg}`),
    warn: (msg) => console.warn(`[WARN]  | ${new Date().toISOString()} | ${msg}`),
    error: (msg, err) => console.error(`[ERROR] | ${new Date().toISOString()} | ${msg}`, err || ''),
    debug: (msg) => console.log(`[DEBUG] | ${new Date().toISOString()} | ${msg}`)
};

// ============================================================================
// 2. LIFECYCLE INITIALIZATION ENTRYPOINT
// ============================================================================
client.once('ready', async (instance) => {
    logger.info('============================================================================');
    logger.info(`🤖 SYSTEM INITIALIZED: ${instance.user.tag} IS ONLINE`);
    logger.info(`👑 Master Cluster Administrator Node ID:  ${OWNER_ID}`);
    logger.info(`🟢 Bracket Alpha (Basic):                ${ROLES.Basic}`);
    logger.info(`🟡 Bracket Beta (Golden):                ${ROLES.Golden}`);
    logger.info(`🔴 Bracket Delta (Diamond):               ${ROLES.Diamond}`);
    logger.info('============================================================================');

    // Establish production target presence values
    client.user.setPresence({
        status: 'online',
        activities: [{ 
            name: 'StudioLearny Classrooms', 
            type: ActivityType.Competing 
        }]
    });
});

// ============================================================================
// 3. INTERNAL DATA CLEANUP SWEEPER INTERVALS
// ============================================================================
setInterval(() => {
    const expirationThreshold = 15 * 60 * 1000; // 15 Minute absolute maximum window
    const dynamicNow = Date.now();
    let sweepCount = 0;

    for (const [userId, record] of activeWizards.entries()) {
        if (dynamicNow - record.startedAt > expirationThreshold) {
            activeWizards.delete(userId);
            sweepCount++;
            metricsEngine.wizardsFailed++;
            
            // Attempt to clean/edit the lingering message to an expired state before closing memory loops
            client.users.fetch(userId).then(async (user) => {
                const dmChannel = await user.createDM().catch(() => null);
                if (dmChannel && record.wizardMessageId) {
                    const mainMsg = await dmChannel.messages.fetch(record.wizardMessageId).catch(() => null);
                    if (mainMsg) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor('#e74c3c')
                            .setTitle('⚠️ Session Expired')
                            .setDescription('Your lesson drafting panel collapsed due to 15 minutes of user inactivity. Please request a new setup console.');
                        await mainMsg.edit({ embeds: [timeoutEmbed] }).catch(() => null);
                    }
                }
            }).catch(() => null);
        }
    }

    if (sweepCount > 0) {
        logger.info(`[Garbage Collector] Automatically swept ${sweepCount} lingering wizard profiles from RAM allocation layout.`);
    }
}, 60000);

// ============================================================================
// 4. MAIN CHAT COMMAND ROUTING MATRIX
// ============================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const tokenizedArgs = message.content.split(/\s+/);
    const primarySignature = tokenizedArgs[0].toLowerCase();

    // ------------------------------------------------------------------------
    // COMMAND: !authorized [SYSTEM CORE ANALYTICS]
    // ------------------------------------------------------------------------
    if (primarySignature === '!authorized') {
        metricsEngine.commandsExecuted++;
        logger.debug(`Evaluating authorization parameters for Node Request: ${message.author.id}`);

        const baseReportEmbed = new EmbedBuilder()
            .setTitle('🖥️ StudioLearny Authorization Framework Diagnostics')
            .setTimestamp()
            .setFooter({ text: 'Engine Version: 3.1.0-Prod • Core Architecture Active' });

        if (message.author.id === OWNER_ID) {
            const upTimeMs = Date.now() - metricsEngine.bootTime.getTime();
            const days = Math.floor(upTimeMs / (24 * 60 * 60 * 1000));
            const hours = Math.floor((upTimeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const minutes = Math.floor((upTimeMs % (60 * 60 * 1000)) / (60 * 1000));

            baseReportEmbed.setColor('#7289da')
                .setDescription('👑 **Master Root Access Matrix Verified.**\nYou possess global override bypass authorization privileges across this deployment cluster.')
                .addFields(
                    { name: '📡 Cluster Status', value: '🟢 Active / Normal Execution', inline: true },
                    { name: '⏱️ Core Node Uptime', value: `\`${days}d ${hours}h ${minutes}m\``, inline: true },
                    { name: '💾 Active RAM Sessions', value: `\`${activeWizards.size}\` Wizard Instances`, inline: true },
                    { name: '📊 Routed Core Commands', value: `\`${metricsEngine.commandsExecuted}\` Calls`, inline: true },
                    { name: '📈 Total Setup Successes', value: `\`${metricsEngine.wizardsCompleted}\` Iterations`, inline: true },
                    { name: '📉 Total Aborts/Timeouts', value: `\`${metricsEngine.wizardsFailed}\` Failures`, inline: true }
                );
            return message.reply({ embeds: [baseReportEmbed] });
        }

        if (!message.guild) {
            baseReportEmbed.setColor('#e74c3c')
                .setDescription('❌ **Context Execution Error:** Staff role evaluations require an active Guild context channel environment.');
            return message.reply({ embeds: [baseReportEmbed] });
        }

        const staffMember = message.member;
        if (!staffMember) return;

        let dynamicRankIndicator = '🚫 Standard Classroom Visitor (No Elevation Access)';
        let tierColorCode = '#95a5a6';

        if (staffMember.roles.cache.has(ROLES.Diamond)) {
            dynamicRankIndicator = '💎 Premium Diamond Faculty Level';
            tierColorCode = '#3498db';
        } else if (staffMember.roles.cache.has(ROLES.Golden)) {
            dynamicRankIndicator = '⭐ Elevated Golden Teaching Staff';
            tierColorCode = '#f1c40f';
        } else if (staffMember.roles.cache.has(ROLES.Basic)) {
            dynamicRankIndicator = '📖 Standard Syllabus Instructor';
            tierColorCode = '#2ecc71';
        }

        baseReportEmbed.setColor(tierColorCode)
            .setDescription(`📋 **User Credential Manifest Ledger:**\n\n**Account Identifier:** \`${message.author.id}\`\n**Verified Tier Rank:** **${dynamicRankIndicator}**`)
            .addFields({ 
                name: '🔧 Permissions Status', 
                value: staffMember.permissions.has(PermissionFlagsBits.Administrator) ? '✅ Server Admin Privileges Present' : 'ℹ️ Standard Faculty Restrictions Applied'
            });

        return message.reply({ embeds: [baseReportEmbed] });
    }

    // ------------------------------------------------------------------------
    // COMMAND: !lesson [LESSON BUILDER PIPELINE BOOTLOADER]
    // ------------------------------------------------------------------------
    if (primarySignature === '!lesson') {
        metricsEngine.commandsExecuted++;
        
        if (!message.guild) {
            return message.reply('❌ **Context Failure:** Lesson generation deployment components can only be instantiated within a valid server text channel.');
        }

        const contextualMember = message.member;
        if (!contextualMember) return;

        const userHasBasic = contextualMember.roles.cache.has(ROLES.Basic);
        const userHasGolden = contextualMember.roles.cache.has(ROLES.Golden);
        const userHasDiamond = contextualMember.roles.cache.has(ROLES.Diamond);
        const isMasterOverride = (message.author.id === OWNER_ID);

        if (!userHasBasic && !userHasGolden && !userHasDiamond && !isMasterOverride) {
            return message.reply('❌ **Security Boundary Warning:** Your current user security certificate doesn\'t contain any valid Instructor Roles.');
        }

        logger.info(`Instantiating UI layout sequence inside channel ${message.channelId} for candidate: ${message.author.id}`);

        const interactiveActionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tier_basic')
                    .setLabel('Basic Blueprint')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!userHasBasic && !isMasterOverride && !userHasDiamond && !userHasGolden),
                new ButtonBuilder()
                    .setCustomId('tier_golden')
                    .setLabel('Golden Blueprint')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!userHasGolden && !isMasterOverride && !userHasDiamond),
                new ButtonBuilder()
                    .setCustomId('tier_diamond')
                    .setLabel('Diamond Masterclass')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!userHasDiamond && !isMasterOverride)
            );

        const corePanelEmbed = new EmbedBuilder()
            .setTitle('🎓 StudioLearny Automated Content Engine')
            .setDescription('Welcome to the centralized content orchestration dashboard. Please select your target tier profile infrastructure below to initialize your conversational setup sequence.')
            .setColor('#5865f2')
            .addFields(
                { name: '📘 Basic Layer', value: 'Includes Title, Content Outlines, and Core Documentation Links.', inline: true },
                { name: '⭐ Golden Layer', value: 'Adds custom branding frame capabilities and accent coloring overrides.', inline: true },
                { name: '💎 Diamond Masterclass', value: 'Full asset integration, media thumbnails, and automated global broadcast alerts.', inline: true }
            )
            .setFooter({ text: 'Ensure your private Direct Messages are completely open prior to selecting an option!' });

        return message.reply({
            embeds: [corePanelEmbed],
            components: [interactiveActionRow]
        });
    }
});

// ============================================================================
// 5. INTERACTION SUB-ROUTINE HANDLER (BUTTON ACCESS POINT)
// ============================================================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    logger.debug(`Processing Button Component Node hit: ${interaction.customId} from executor: ${interaction.user.id}`);

    const systemTierIdentifiers = {
        'tier_basic': 'Basic',
        'tier_golden': 'Golden',
        'tier_diamond': 'Diamond'
    };

    const evaluatedTargetTier = systemTierIdentifiers[interaction.customId];
    if (!evaluatedTargetTier) return; 

    const userId = interaction.user.id;
    const requiredCryptographicRole = ROLES[evaluatedTargetTier];
    const originalTargetGuild = interaction.guild;

    if (!originalTargetGuild) return;

    const activeMemberObject = await originalTargetGuild.members.fetch(userId).catch(() => null);
    if (!activeMemberObject) {
        return interaction.reply({ content: '❌ **State Resolver Error:** The core could not safely fetch your member profile state across this cluster.', ephemeral: true });
    }

    const isSystemOwnerOverride = (userId === OWNER_ID);
    const validationSuccess = activeMemberObject.roles.cache.has(requiredCryptographicRole) || isSystemOwnerOverride;

    if (!validationSuccess) {
        return interaction.reply({
            content: `❌ **Access Control Failure:** You lack the corresponding structural role badge necessary to claim the **${evaluatedTargetTier} Class Container System**.`,
            ephemeral: true
        });
    }

    metricsEngine.wizardsStarted++;

    if (activeWizards.has(userId)) {
        activeWizards.delete(userId);
    }

    try {
        const directCommsPipe = await interaction.user.createDM();

        const queryStepOneEmbed = new EmbedBuilder()
            .setTitle(`🎬 Curriculum Wizard Deployment Panel • [${evaluatedTargetTier.toUpperCase()} MODE]`)
            .setDescription(`Greetings ${activeMemberObject.displayName},\nLet's build your learning layout frame step by step.`)
            .addFields({ 
                name: '📝 STEP 1: Primary Core Header Title', 
                value: 'Please reply directly to this message with your intended lesson **Headline Title**.\n*(Constraint Limits: 3 - 100 characters total)*' 
            })
            .setColor('#2ecc71')
            .setFooter({ text: 'Warning: This pipeline tracking frame will auto-terminate after 15 minutes of inactivity.' });

        const wizardMessage = await directCommsPipe.send({ embeds: [queryStepOneEmbed] });

        // Instantiate RAM record with saved message configuration ID tracking points
        activeWizards.set(userId, {
            tier: evaluatedTargetTier,
            targetChannelId: interaction.channelId,
            guildId: interaction.guildId,
            startedAt: Date.now(),
            step: 1,
            wizardMessageId: wizardMessage.id, // <-- CRITICAL: Retain frame pointer ID
            data: {
                title: null,
                outline: null,
                linkUrl: null,
                customColor: '#00bfff',
                mediaAssetUrl: null,
                durationEstimate: 'Unspecified',
                facultyAuthorSignature: activeMemberObject.displayName
            }
        });

        await interaction.reply({
            content: '📬 **Setup Thread Dispatched.** The deployment automation pipeline has successfully established contact inside your Direct Messages.',
            ephemeral: true
        });

    } catch (concurrencyError) {
        logger.error(`Failed to lock onto DM channels with target node user: ${userId}`, concurrencyError);
        metricsEngine.wizardsFailed++;
        return interaction.reply({
            content: '❌ **Handshake Transmission Blundered:** The engine failed to open a direct dialogue profile framework with your user. Please navigate to `User Settings -> Privacy & Safety` and check "Allow direct messages from server members".',
            ephemeral: true
        });
    }
});

// ============================================================================
// 6. DM DATA HARVESTER CORE (CONVERSATIONAL STATE PIPELINE)
// ============================================================================
client.on('messageCreate', async (message) => {
    if (message.channel.type !== ChannelType.DM || message.author.bot) return;

    const userId = message.author.id;
    const dynamicSessionState = activeWizards.get(userId);

    if (!dynamicSessionState) return;

    const normalizedRawPayload = message.content.trim();

    try {
        // Fetch the active single layout core message from DM channel history cache
        const mainWizardMessage = await message.channel.messages.fetch(dynamicSessionState.wizardMessageId).catch(() => null);
        
        // 🧼 AUTOMATIC USER TEXT CLEANUP: Instantly delete the teacher's typed payload
        await message.delete().catch(() => null);

        if (!mainWizardMessage) {
            activeWizards.delete(userId);
            metricsEngine.wizardsFailed++;
            return message.channel.send('❌ **UI Frame Anchoring Defect:** The tracking display setup link was severed. Please initialize a new session command (`!lesson`) inside the server workspace.');
        }

        // --------------------------------------------------------------------
        // STATE PIPELINE STEP 1: EXTRACT HEADLINE TITLE
        // --------------------------------------------------------------------
        if (dynamicSessionState.step === 1) {
            if (normalizedRawPayload.length < 3 || normalizedRawPayload.length > 100) {
                const retryEmbed1 = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('⚠️ Structural Integrity Fault')
                    .setDescription('Lesson Titles cannot be shorter than 3 characters or extend past 100 characters.\n\nPlease type and re-submit a cleaner title variation below:');
                return await mainWizardMessage.edit({ embeds: [retryEmbed1] }).catch(() => null);
            }
            
            dynamicSessionState.data.title = normalizedRawPayload;
            dynamicSessionState.step = 2;

            const transitionEmbed2 = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('📖 Step 2: Comprehensive Lesson Concept Outline')
                .setDescription('Please write a robust description summary mapping out exactly what metrics and technologies are going to be examined within this academic lesson block.\n\n*(Constraint Limits: 10 - 1000 characters maximum)*');
            
            return await mainWizardMessage.edit({ embeds: [transitionEmbed2] }).catch(() => null);
        }

        // --------------------------------------------------------------------
        // STATE PIPELINE STEP 2: EXTRACT BRIEF OUTLINE DESCRIPTION
        // --------------------------------------------------------------------
        if (dynamicSessionState.step === 2) {
            if (normalizedRawPayload.length < 10 || normalizedRawPayload.length > 1000) {
                const retryEmbed2 = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('⚠️ Structural Integrity Fault')
                    .setDescription(`Your content outline submission must be reasonably descriptive. Your response contained \`${normalizedRawPayload.length}\` characters. Ensure it spans between 10 and 1000 characters:`);
                return await mainWizardMessage.edit({ embeds: [retryEmbed2] }).catch(() => null);
            }
            
            dynamicSessionState.data.outline = normalizedRawPayload;
            dynamicSessionState.step = 3;

            const transitionEmbed3 = new EmbedBuilder()
                .setColor('#9b59b6')
                .setTitle('🔗 Step 3: Material Distribution Hyperlink / URL Asset')
                .setDescription('Please submit a fully functional external web address linking out to your codebases or notes repositories (e.g., `https://github.com/`).\n\n*If this module does not rely on an external destination platform, reply with `none`.*');
            
            return await mainWizardMessage.edit({ embeds: [transitionEmbed3] }).catch(() => null);
        }

        // --------------------------------------------------------------------
        // STATE PIPELINE STEP 3: EXTRACT EXTERNAL WEB TARGETS
        // --------------------------------------------------------------------
        if (dynamicSessionState.step === 3) {
            if (normalizedRawPayload.toLowerCase() !== 'none') {
                const standardizedUrlValidatorPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
                if (!standardizedUrlValidatorPattern.test(normalizedRawPayload)) {
                    const retryEmbed3 = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('❌ Format Compilation Rejection')
                        .setDescription('The compiler failed to securely parse your input line as a valid network URL trajectory point. Provide a secure path starting with `http://` or `https://`, or submit `none`:');
                    return await mainWizardMessage.edit({ embeds: [retryEmbed3] }).catch(() => null);
                }
                dynamicSessionState.data.linkUrl = normalizedRawPayload;
            } else {
                dynamicSessionState.data.linkUrl = null;
            }

            if (dynamicSessionState.tier === 'Golden' || dynamicSessionState.tier === 'Diamond') {
                dynamicSessionState.step = 4;
                const transitionEmbed4 = new EmbedBuilder()
                    .setColor('#f1c40f')
                    .setTitle('🎨 Step 4: [Tier-Exclusive Benefit] Hex Sidebar Customization')
                    .setDescription('As an authenticated VIP tier instructor asset, you hold rights to overwrite global styling modules.\n\nPlease supply a valid Hexadecimal string sequence (e.g., `#ff0055` or `00ffcc`) to brand your frame borders, or type `default`.');
                return await mainWizardMessage.edit({ embeds: [transitionEmbed4] }).catch(() => null);
            } else {
                return buildAndDispatchLessonManifest(mainWizardMessage, dynamicSessionState, userId);
            }
        }

        // --------------------------------------------------------------------
        // STATE PIPELINE STEP 4: FRAME ACCENT HEX MATRIX PROCESSING (Golden/Diamond Only)
        // --------------------------------------------------------------------
        if (dynamicSessionState.step === 4) {
            if (normalizedRawPayload.toLowerCase() !== 'default') {
                const rigorousHexEvaluatorFormat = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/;
                if (!rigorousHexEvaluatorFormat.test(normalizedRawPayload)) {
                    const retryEmbed4 = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('❌ Hex Compiler Integrity Failure')
                        .setDescription('The system could not map your formatting choice into an functional render matrix. Verify it looks clean like `#aabbcc` or `ff0022`. Re-enter color or type `default`:');
                    return await mainWizardMessage.edit({ embeds: [retryEmbed4] }).catch(() => null);
                }
                dynamicSessionState.data.customColor = normalizedRawPayload.startsWith('#') ? normalizedRawPayload : `#${normalizedRawPayload}`;
            } else {
                dynamicSessionState.data.customColor = dynamicSessionState.tier === 'Golden' ? '#f1c40f' : '#e74c3c';
            }

            if (dynamicSessionState.tier === 'Diamond') {
                dynamicSessionState.step = 5;
                const transitionEmbed5 = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('💎 Step 5: [Diamond-Exclusive Benefit] Vector Thumbnail Integration')
                    .setDescription('You possess active permissions to interface rich graphic layouts directly into the framework canvas.\n\nPlease drop a clean network path pointing directly to an online image file asset (must conclude with extensions like `.png`, `.jpg`, `.jpeg`, or `.gif`), or submit `none` to leave layout components dark.');
                return await mainWizardMessage.edit({ embeds: [transitionEmbed5] }).catch(() => null);
            } else {
                return buildAndDispatchLessonManifest(mainWizardMessage, dynamicSessionState, userId);
            }
        }

        // --------------------------------------------------------------------
        // STATE PIPELINE STEP 5: ASSIGN RICH MEDIA GRAPHICAL ELEMENTS (Diamond Only)
        // --------------------------------------------------------------------
        if (dynamicSessionState.step === 5) {
            if (normalizedRawPayload.toLowerCase() !== 'none') {
                const rigidGraphicExtensionFilter = /\.(jpeg|jpg|gif|png)$/i;
                if (!rigidGraphicExtensionFilter.test(normalizedRawPayload) && !normalizedRawPayload.startsWith('http')) {
                    const retryEmbed5 = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('❌ Graphic Resource Interception')
                        .setDescription('The payload string failed validation checks. Ensure the link points directly to an image ending in an extension like `.png` or `.jpg`, or submit `none`:');
                    return await mainWizardMessage.edit({ embeds: [retryEmbed5] }).catch(() => null);
                }
                dynamicSessionState.data.mediaAssetUrl = normalizedRawPayload;
            } else {
                dynamicSessionState.data.mediaAssetUrl = null;
            }

            return buildAndDispatchLessonManifest(mainWizardMessage, dynamicSessionState, userId);
        }

    } catch (unhandledPipelineError) {
        logger.error(`Critical state system exception recorded for user block: ${userId}`, unhandledPipelineError);
        activeWizards.delete(userId);
        metricsEngine.wizardsFailed++;
        return message.channel.send('❌ **Pipeline Execution Engine Interrupted:** A catastrophic execution exception broke your setup stream. The local heap file tracker has been dumped to preserve structural stability. Please issue `!lesson` inside the server again.');
    }
});

// ============================================================================
// 7. COMPILATION RUNTIME ENGINE & FINAL DISPATCH UNIT
// ============================================================================
/**
 * Programmatic assembler aggregating step answers and shipping layout instances back to originating channels
 */
async function buildAndDispatchLessonManifest(targetWizardMsgInstance, finalSessionState, uniqueUserId) {
    try {
        logger.info(`Compiling programmatic class embed model. Mapping trajectory back onto room asset id: ${finalSessionState.targetChannelId}`);

        const deliveryTargetChannelInstance = await client.channels.fetch(finalSessionState.targetChannelId);
        if (!deliveryTargetChannelInstance) {
            throw new Error('Destination channel location could not be verified by the core node cache.');
        }

        const finalExportEmbedTemplate = new EmbedBuilder()
            .setTitle(`📚 Curriculum Deployment: ${finalSessionState.data.title}`)
            .setDescription(finalSessionState.data.outline)
            .setColor(finalSessionState.data.customColor)
            .setTimestamp()
            .addFields({ 
                name: '👨‍🏫 Appointed Faculty Instructor', 
                value: `\`${finalSessionState.data.facultyAuthorSignature}\` (${finalSessionState.sessionTier || finalSessionState.tier} Unit Structure)`, 
                inline: false 
            });

        if (finalSessionState.data.linkUrl) {
            finalExportEmbedTemplate.addFields({ 
                name: '🔗 Verified Study Materials & Code', 
                value: `[Access Classroom Resources Here](${finalSessionState.data.linkUrl})`, 
                inline: false 
            });
        }

        if (finalSessionState.data.mediaAssetUrl) {
            finalExportEmbedTemplate.setThumbnail(finalSessionState.data.mediaAssetUrl);
        }

        // Send output configurations to the public target server channel
        if (finalSessionState.tier === 'Diamond') {
            finalExportEmbedTemplate.setFooter({ text: '⚡ Diamond Executive Architecture Block • StudioLearny Academic Cluster' });
            await deliveryTargetChannelInstance.send({
                content: '🔔 @everyone **An Elite Diamond Class Has Launched!** Review the technical specifications posted below.',
                embeds: [finalExportEmbedTemplate]
            });
        } else if (finalSessionState.tier === 'Golden') {
            finalExportEmbedTemplate.setFooter({ text: '⭐ Golden Premium Framework Element • StudioLearny Staff Content' });
            await deliveryTargetChannelInstance.send({ embeds: [finalExportEmbedTemplate] });
        } else {
            finalExportEmbedTemplate.setFooter({ text: '📖 StudioLearny Standard Core Syllabus' });
            await deliveryTargetChannelInstance.send({ embeds: [finalExportEmbedTemplate] });
        }

        // Structural clean-up sequence tracking indices inside RAM
        activeWizards.delete(uniqueUserId);
        metricsEngine.wizardsCompleted++;

        // 🧼 OVERWRITE PANEL FOR CLEAN DM RECEIPT
        const deploymentConfirmationReceiptEmbed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🚀 Frame Transmission Successful')
            .setDescription('✅ **Compilation Matrix Confirmed.** Your customized curriculum blueprint package has been securely written into your server classroom environment.\n\n*This interaction terminal is now closed.*');

        return await targetWizardMsgInstance.edit({ embeds: [deploymentConfirmationReceiptEmbed] }).catch(() => null);

    } catch (engineCompilationFailure) {
        logger.error(`Critical Failure occurred at output generation phase for node profile: ${uniqueUserId}`, engineCompilationFailure);
        activeWizards.delete(uniqueUserId);
        metricsEngine.wizardsFailed++;
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('❌ Global Output Deployment Error')
            .setDescription('The application engine failed to post your finalized components into the target channel. Double-check that the bot retains "Send Messages" and "Embed Links" permissions inside that server space.');
        
        return await targetWizardMsgInstance.edit({ embeds: [errorEmbed] }).catch(() => null);
    }
}

// ============================================================================
// 8. INFRASTRUCTURE KEEP-ALIVE SERVER PORT HOOK ROUTINES
// ============================================================================
const deploymentNetworkInterfaceServer = http.createServer((request, response) => {
    logger.debug(`Keep-alive tracking interface hit recorded: ${request.method} ${request.url}`);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    
    response.end(JSON.stringify({
        status: 'ONLINE',
        nodeEngine: 'StudioLearny_Bot_JS_v3',
        uptimeSeconds: Math.floor((Date.now() - metricsEngine.bootTime.getTime()) / 1000),
        activeWizardTracks: activeWizards.size,
        totalDispatches: metricsEngine.wizardsCompleted
    }));
});

deploymentNetworkInterfaceServer.listen(8080, () => {
    logger.info('📡 Keep-Alive Network Health Monitor interface bound securely across port 8080');
});

client.login(process.env.DISCORD_TOKEN);
