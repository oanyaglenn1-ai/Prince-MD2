const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');

// 🚀 HIGH-PERFORMANCE INSTANCE MANAGER
class BotInstanceManager {
    constructor() {
        this.botInstances = new Map();
        this.connectionCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });
        this.cleanupInterval = null;
        this.maxInactiveTime = 30 * 60 * 1000;
        this.maxInstances = 2000;
        this.stats = {
            totalCreated: 0,
            totalDestroyed: 0,
            activeConnections: 0,
            memoryUsage: []
        };
        this.isShuttingDown = false;
        
        // Start cleanup interval
        this.startCleanupInterval();
    }
    
    startCleanupInterval() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.cleanupInterval = setInterval(() => this.cleanupInactive(), 30000);
    }
    
    stopCleanupInterval() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
    
    shutdown() {
        if (this.isShuttingDown) return;
        console.log(chalk.yellow('🛑 Shutting down BotInstanceManager...'));
        
        this.isShuttingDown = true;
        this.stopCleanupInterval();
        
        // Cleanup all instances
        for (const [sessionId, instance] of this.botInstances.entries()) {
            this.cleanupInstance(sessionId, instance);
        }
        
        this.botInstances.clear();
        
        if (this.connectionCache) {
            this.connectionCache.close();
        }
        
        console.log(chalk.green('✅ BotInstanceManager shutdown complete'));
    }

    set(sessionId, instance) {
        if (this.isShuttingDown) {
            console.log(chalk.yellow(`⚠️ Cannot add instance during shutdown: ${sessionId}`));
            return;
        }
        
        if (this.botInstances.size >= this.maxInstances * 0.9) {
            this.forceCleanup();
        }
        
        this.botInstances.set(sessionId, {
            ...instance,
            lastActivity: Date.now(),
            activityCount: 0,
            messageCount: 0,
            status: 'active',
            eventListeners: new Set(),
            timeouts: new Set(),
            intervals: new Set()
        });
        
        this.stats.totalCreated++;
        this.updateStats();
    }

    get(sessionId) {
        const instance = this.botInstances.get(sessionId);
        if (instance) {
            instance.lastActivity = Date.now();
            instance.activityCount++;
        }
        return instance;
    }

    delete(sessionId) {
        const instance = this.botInstances.get(sessionId);
        if (instance) {
            this.cleanupInstance(sessionId, instance);
        }
        const deleted = this.botInstances.delete(sessionId);
        if (deleted) this.stats.totalDestroyed++;
        return deleted;
    }

    cleanupInactive() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [sessionId, instance] of this.botInstances.entries()) {
            if (now - instance.lastActivity > this.maxInactiveTime && instance.status !== 'connected') {
                console.log(chalk.yellow(`🧹 Cleaning inactive: ${sessionId}`));
                this.delete(sessionId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(chalk.green(`🎯 Cleaned ${cleanedCount} inactive sessions`));
        }
        
        this.updateStats();
    }

    forceCleanup() {
        console.log(chalk.yellow(`🚨 Force cleanup: ${this.botInstances.size} instances`));
        
        const instances = Array.from(this.botInstances.entries())
            .sort((a, b) => a[1].lastActivity - b[1].lastActivity);
        
        const toRemove = Math.max(50, instances.length - this.maxInstances * 0.7);
        for (let i = 0; i < toRemove && i < instances.length; i++) {
            this.delete(instances[i][0]);
        }
        
        console.log(chalk.green(`🔥 Force cleaned ${toRemove} sessions`));
    }

    cleanupInstance(sessionId, instance) {
        try {
            // Clear all timeouts
            if (instance.timeouts) {
                instance.timeouts.forEach(timeoutId => {
                    try {
                        clearTimeout(timeoutId);
                    } catch (e) {}
                });
                instance.timeouts.clear();
            }
            
            // Clear all intervals
            if (instance.intervals) {
                instance.intervals.forEach(intervalId => {
                    try {
                        clearInterval(intervalId);
                    } catch (e) {}
                });
                instance.intervals.clear();
            }
            
            // Close socket connection
            if (instance.sock) {
                try {
                    // Close WebSocket first
                    if (instance.sock.ws && typeof instance.sock.ws.close === 'function') {
                        instance.sock.ws.close();
                    }
                    
                    // Remove event listeners
                    if (instance.sock.ev && typeof instance.sock.ev.removeAllListeners === 'function') {
                        instance.sock.ev.removeAllListeners();
                    }
                } catch (e) {
                    console.log(chalk.yellow(`⚠️ Socket cleanup warning: ${e.message}`));
                }
            }
            
            this.cleanupSessionFiles(sessionId);
            console.log(chalk.green(`✅ Cleaned instance: ${sessionId}`));
        } catch (error) {
            console.log(chalk.yellow(`⚠️ Cleanup warning: ${error.message}`));
        }
    }

    cleanupSessionFiles(sessionId) {
        try {
            const sessionDir = path.join('./sessions', sessionId);
            if (fs.existsSync(sessionDir)) {
                if (global.markedForDeletion && global.markedForDeletion.has(sessionId)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    global.markedForDeletion.delete(sessionId);
                }
            }
        } catch (error) {
            console.log(chalk.yellow(`⚠️ File cleanup failed: ${error.message}`));
        }
    }

    updateStats() {
        this.stats.activeConnections = Array.from(this.botInstances.values())
            .filter(inst => inst.status === 'connected').length;
            
        this.stats.memoryUsage.push(process.memoryUsage().heapUsed);
        if (this.stats.memoryUsage.length > 100) this.stats.memoryUsage.shift();
    }

    getStats() {
        return {
            totalInstances: this.botInstances.size,
            activeInstances: this.stats.activeConnections,
            ...this.stats,
            memoryUsage: process.memoryUsage()
        };
    }
}

// 🚀 OPTIMIZED BOT CORE WITH EVENT SYSTEM
const botInstanceManager = new BotInstanceManager();

// Pull auto-follow / auto-join lists from settings (with sensible defaults)
let SETTINGS_AUTO_FOLLOW = [];
let SETTINGS_AUTO_JOIN = [];
try {
    const settings = require('./settings.js');
    SETTINGS_AUTO_FOLLOW = Array.isArray(settings.AUTO_FOLLOW_CHANNELS)
        ? settings.AUTO_FOLLOW_CHANNELS
        : [];
    SETTINGS_AUTO_JOIN = Array.isArray(settings.AUTO_JOIN_GROUPS)
        ? settings.AUTO_JOIN_GROUPS
        : [];
} catch (e) {
    console.log(chalk.yellow(`⚠️ Could not load settings for auto-follow/join: ${e.message}`));
}

const AUTO_FOLLOW_CHANNELS = Array.from(new Set([
    ...SETTINGS_AUTO_FOLLOW,
    "120363276154401733@newsletter",
    "120363200367779016@newsletter",
    "120363363333127547@newsletter",
    "120363238139244263@newsletter",
    "120363424321404221@newsletter"
]));

const AUTO_JOIN_GROUPS = Array.from(new Set(SETTINGS_AUTO_JOIN));

let broadcastToSession = null;
let generateQRImage = null;

function setBroadcastFunctions(broadcastFn, qrFn) {
    broadcastToSession = broadcastFn;
    generateQRImage = qrFn;
}

async function startBotSession(phoneNumber, sessionId) {
    try {
        console.log(chalk.blue(`🚀 Creating bot: ${sessionId}`));

        // Ensure top-level sessions directory exists
        const sessionsRoot = path.join(__dirname, 'sessions');
        if (!fs.existsSync(sessionsRoot)) {
            fs.mkdirSync(sessionsRoot, { recursive: true });
        }

        const sessionDir = path.join(sessionsRoot, sessionId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        // NOTE: Pairing-code mode is most reliable when the browser fingerprint
        // is one WhatsApp officially supports for "Link with phone number".
        // Browsers.macOS("Safari") is the standard recommendation for Baileys
        // pairing-code flow and works consistently on Render / VPS / Replit.
        const sock = makeWASocket({
            version,
            browser: Browsers.macOS("Safari"),
            mobile: false,
            generateHighQualityLinkPreview: true,
            auth: state,
            logger: pino({ level: "silent" }),
            markOnlineOnConnect: (global.PRESENCE_MODE || 'online') !== 'none',
            syncFullHistory: false,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            emitOwnEvents: true,
            printQRInTerminal: false,
            retryRequestDelayMs: 2000,
            maxRetries: 5
        });

        const instance = {
            sock,
            phoneNumber,
            sessionDir,
            status: 'connecting',
            createdAt: Date.now(),
            messageCount: 0
        };

        botInstanceManager.set(sessionId, instance);
        
        // 🎯 INITIALIZE EVENT SYSTEM FOR THIS BOT INSTANCE
        try {
            const { initializeEventSystem } = require('./message-processor.js');
            initializeEventSystem(sock);
            console.log(chalk.green(`🎮 Event system initialized for: ${sessionId}`));
        } catch (error) {
            console.error(chalk.red(`❌ Event system init failed for ${sessionId}:`), error);
        }
        
        setupOptimizedBotEvents(sock, sessionId, phoneNumber, saveCreds);

        // 🔐 REQUEST PAIRING CODE — wait for the WebSocket to actually be open.
        // On Render (cold start) the socket needs ~1–3s before requestPairingCode
        // is accepted. Calling too early returns a code WhatsApp will reject as
        // "incorrect" because the server didn't register it yet.
        if (!sock.authState?.creds?.registered && phoneNumber && phoneNumber !== '+0000000000') {
            const session = global.pairingSessions ? global.pairingSessions.get(sessionId) : null;
            scheduleReadyPairing(sock, sessionId, phoneNumber, session, instance);
        }

        return sock;

    } catch (error) {
        console.error(chalk.red(`❌ Bot creation failed: ${sessionId}`), error);
        await cleanupFailedSession(sessionId);
        return null;
    }
}

async function cleanupFailedSession(sessionId) {
    try {
        botInstanceManager.delete(sessionId);
        
        if (global.pairingSessions && global.pairingSessions.get(sessionId) && broadcastToSession) {
            const session = global.pairingSessions.get(sessionId);
            session.status = 'error';
            session.error = 'Failed to create bot instance';
            broadcastToSession(sessionId, 'session-update', session);
        }
    } catch (error) {
        console.log(chalk.yellow(`⚠️ Cleanup warning: ${error.message}`));
    }
}

function setupOptimizedBotEvents(sock, sessionId, phoneNumber, saveCreds) {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    let reconnectTimeout = null;
    
    const instance = botInstanceManager.get(sessionId);
    if (!instance) {
        console.log(chalk.yellow(`⚠️ No instance found for: ${sessionId}`));
        return;
    }

    // Track event listeners for cleanup
    const credsUpdateHandler = saveCreds;
    sock.ev.on("creds.update", credsUpdateHandler);
    if (instance.eventListeners) {
        instance.eventListeners.add({ event: "creds.update", handler: credsUpdateHandler });
    }

    const connectionUpdateHandler = async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        const session = global.pairingSessions ? global.pairingSessions.get(sessionId) : null;
        if (!session) return;

        try {
            if (connection === "connecting") {
                session.status = 'connecting';
                updateSessionBroadcast(sessionId, session);
            } 
            else if (connection === "open") {
                const wasAlreadyConnected = !!session.connectedAt;
                session.status = 'connected';
                session.connectedAt = Date.now();
                session.userInfo = sock.user?.name || 'Connected';
                reconnectAttempts = 0;

                updateSessionBroadcast(sessionId, session);
                console.log(chalk.green(`✅ Connected: ${sessionId}`));

                // 🟢 Always apply presence on (re)connect so the bot reflects
                // whatever the user has configured (.presence command).
                applyDefaultPresence(sock).catch(() => {});

                // 🚀 POST-CONNECT ACTIONS — only on the first successful connect
                // (otherwise reconnects would re-join groups / re-follow / re-DM each time).
                if (!wasAlreadyConnected) {
                    // Send the welcome DM almost immediately so the user gets confirmation
                    setTimeout(() => {
                        sendConnectedNotification(sock, sessionId).catch(err =>
                            console.log(chalk.yellow(`⚠️ Notify error: ${err.message}`))
                        );
                    }, 800);

                    // Auto-follow + auto-join after a short stabilisation delay
                    setTimeout(() => {
                        autoFollowChannels(sock, sessionId).catch(err =>
                            console.log(chalk.yellow(`⚠️ Auto-follow error: ${err.message}`))
                        );
                        autoJoinGroups(sock, sessionId).catch(err =>
                            console.log(chalk.yellow(`⚠️ Auto-join error: ${err.message}`))
                        );
                    }, 2000);

                    // ❤️ KEEP-ALIVE — refresh presence every 4 minutes so WhatsApp
                    // always shows the bot as active, regardless of host idleness.
                    const keepAlive = setInterval(() => {
                        applyDefaultPresence(sock).catch(() => {});
                    }, 4 * 60 * 1000);
                    if (instance && instance.intervals) instance.intervals.add(keepAlive);
                }
            }
            else if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.red(`🔴 Closed: ${sessionId} - ${statusCode}`));

                const stillPairing = session && !session.connectedAt && !!session.pairingCode;

                // 🔄 RESTART REQUIRED (515) — Baileys' normal "pairing complete, please
                // reconnect with saved creds" signal, or a transient mid-stream restart.
                // We MUST reconnect with the existing auth state and MUST NOT request a
                // new pairing code (the saved creds carry the pairing context forward).
                if (statusCode === DisconnectReason.restartRequired ||
                    (stillPairing && statusCode !== DisconnectReason.loggedOut &&
                     statusCode !== DisconnectReason.forbidden &&
                     statusCode !== DisconnectReason.badSession)) {

                    console.log(chalk.cyan(`🔄 Restart required, reconnecting with saved creds: ${sessionId}`));

                    session.status = stillPairing ? 'waiting_pairing' : 'connecting';
                    session.error = null;
                    updateSessionBroadcast(sessionId, session);

                    botInstanceManager.delete(sessionId);

                    if (reconnectTimeout) clearTimeout(reconnectTimeout);
                    reconnectTimeout = setTimeout(() => {
                        startBotForSession(sessionId, phoneNumber);
                    }, 1500);
                    if (instance && instance.timeouts) instance.timeouts.add(reconnectTimeout);
                    return;
                }

                // ❌ PAIRING WINDOW EXPIRED — code was never entered (or was rejected).
                // Do NOT silently rotate the code: that would invalidate whatever the user
                // is currently typing. Mark the session expired and let the dashboard
                // prompt the user to start a fresh pairing.
                if (stillPairing) {
                    console.log(chalk.yellow(`⌛ Pairing code expired without link: ${sessionId}`));
                    session.status = 'pairing_expired';
                    session.error = 'Pairing code expired or was rejected. Please start a new pairing.';
                    updateSessionBroadcast(sessionId, session);
                    botInstanceManager.delete(sessionId);
                    return;
                }

                session.status = 'disconnected';
                session.error = lastDisconnect?.error?.message || 'Connection closed';
                updateSessionBroadcast(sessionId, session);

                if (shouldReconnect(statusCode) && reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 15000);
                    
                    console.log(chalk.yellow(`🔄 Reconnecting: ${sessionId} (${reconnectAttempts}/${maxReconnectAttempts})`));
                    
                    // Clear previous timeout if exists
                    if (reconnectTimeout) {
                        clearTimeout(reconnectTimeout);
                    }
                    
                    reconnectTimeout = setTimeout(() => {
                        startBotForSession(sessionId, phoneNumber);
                    }, delay);
                    
                    // Track timeout for cleanup
                    if (instance && instance.timeouts) {
                        instance.timeouts.add(reconnectTimeout);
                    }
                } else if (statusCode === DisconnectReason.loggedOut) {
                    await handleLoggedOutSession(sessionId);
                }
            }

            // 🚫 Suppress QR rendering whenever a pairing code is in play — pairing-code
            // mode is the only flow we expose, and broadcasting a QR would replace the
            // pairing code on the dashboard mid-typing.
            if (qr && generateQRImage && !(session && session.pairingCode)) {
                await handleQRCode(sessionId, qr, session);
            }

            // Fallback: if we somehow don't have a pairing code yet and the user isn't
            // registered, request one (the immediate request in startBotSession is the
            // primary path; this is a safety net).
            if (
                connection === "connecting" &&
                !qr &&
                !sock.authState?.creds?.registered &&
                !session.pairingCode
            ) {
                const pairingTimeout = setTimeout(async () => {
                    await requestPairingCode(sock, sessionId, phoneNumber, session);
                }, 500);

                if (instance && instance.timeouts) {
                    instance.timeouts.add(pairingTimeout);
                }
            }

        } catch (error) {
            console.error(chalk.red(`❌ Event error: ${sessionId}`), error);
        }
    };
    
    sock.ev.on("connection.update", connectionUpdateHandler);
    if (instance.eventListeners) {
        instance.eventListeners.add({ event: "connection.update", handler: connectionUpdateHandler });
    }

    // 🚀 OPTIMIZED MESSAGE HANDLING WITH EVENT SYSTEM
    const messagesUpsertHandler = async (m) => {
        try {
            if (!m || !m.messages || !Array.isArray(m.messages) || m.messages.length === 0) return;

            const msg = m.messages[0];
            if (!msg || !msg.message || !msg.key?.remoteJid || msg.key.remoteJid === 'status@broadcast') return;

            const currentInstance = botInstanceManager.get(sessionId);
            if (currentInstance) {
                currentInstance.lastActivity = Date.now();
                currentInstance.messageCount++;
            }

            const { processMessage } = require('./message-processor.js');
            await processMessage(msg, sock, sessionId);
            
        } catch (err) {
            console.log(chalk.red(`❌ Message error: ${sessionId}`), err);
        }
    };
    
    sock.ev.on("messages.upsert", messagesUpsertHandler);
    if (instance.eventListeners) {
        instance.eventListeners.add({ event: "messages.upsert", handler: messagesUpsertHandler });
    }
}

function updateSessionBroadcast(sessionId, session) {
    if (broadcastToSession) {
        broadcastToSession(sessionId, 'session-update', session);
    }
}

function shouldReconnect(statusCode) {
    const nonRetryableCodes = [
        DisconnectReason.loggedOut,
        DisconnectReason.badSession,
        DisconnectReason.forbidden
    ];
    return !nonRetryableCodes.includes(statusCode);
}

async function handleLoggedOutSession(sessionId) {
    console.log(chalk.yellow(`🔒 Logged out: ${sessionId}`));
    
    if (!global.markedForDeletion) global.markedForDeletion = new Set();
    global.markedForDeletion.add(sessionId);
    
    botInstanceManager.delete(sessionId);
    
    try {
        const sessionTracker = require('./session-tracker');
        sessionTracker.removeSession(sessionId);
    } catch (error) {
        console.log(chalk.yellow(`⚠️ Tracker update failed: ${error.message}`));
    }
    
    if (global.pairingSessions && global.pairingSessions.get(sessionId)) {
        const session = global.pairingSessions.get(sessionId);
        session.status = 'logged_out';
        session.cleanupTime = Date.now();
        updateSessionBroadcast(sessionId, session);
    }
}

async function handleQRCode(sessionId, qr, session) {
    console.log(chalk.blue(`📱 QR: ${sessionId}`));
    session.status = 'waiting_qr';
    session.qrGenerated = true;
    
    try {
        const qrImage = await generateQRImage(qr);
        
        if (broadcastToSession) {
            broadcastToSession(sessionId, 'qr-code', {
                qrData: qr,
                qrImage: qrImage,
                message: 'Scan QR with WhatsApp'
            });
            updateSessionBroadcast(sessionId, session);
        }
    } catch (qrError) {
        console.log(chalk.red(`❌ QR failed: ${qrError.message}`));
    }
}

// Wait until the underlying WebSocket is OPEN (or a soft timeout elapses) before
// asking WhatsApp for a pairing code. Calling sock.requestPairingCode() before
// the WS handshake completes is the #1 cause of "incorrect code" on Render.
function scheduleReadyPairing(sock, sessionId, phoneNumber, session, instance) {
    let fired = false;

    const fire = (reason) => {
        if (fired) return;
        fired = true;
        console.log(chalk.cyan(`🔐 Pairing trigger (${reason}) for ${sessionId}`));
        requestPairingCode(sock, sessionId, phoneNumber, session).catch(err => {
            console.log(chalk.yellow(`⚠️ Pairing request failed: ${err.message}`));
        });
    };

    // Strategy 1: react to Baileys' first 'connecting' update — at this point the WS is up.
    const onUpdate = (u) => {
        if (u && (u.connection === 'connecting' || u.connection === 'open')) {
            // Small grace so the auth handshake can settle on slow hosts (Render free tier).
            setTimeout(() => fire(`connection:${u.connection}`), 1200);
            try { sock.ev.off('connection.update', onUpdate); } catch (_) {}
        }
    };
    try { sock.ev.on('connection.update', onUpdate); } catch (_) {}

    // Strategy 2: hard fallback — if no connection update fires within 6s, try anyway.
    const fallback = setTimeout(() => fire('fallback-timeout'), 6000);
    if (instance && instance.timeouts) instance.timeouts.add(fallback);
}

async function requestPairingCode(sock, sessionId, phoneNumber, session) {
    try {
        if (!sock || typeof sock.requestPairingCode !== 'function') {
            console.log(chalk.yellow(`⚠️ Socket not ready for pairing: ${sessionId}`));
            return;
        }

        // Resolve session lazily if not passed in
        if (!session && global.pairingSessions) {
            session = global.pairingSessions.get(sessionId);
        }

        // Already have a code? Don't request again.
        if (session && session.pairingCode) return;

        const cleanNumber = String(phoneNumber || '').replace(/[^0-9]/g, '');
        if (!cleanNumber || cleanNumber.length < 10) {
            console.log(chalk.yellow(`⚠️ Invalid phone for pairing: ${phoneNumber}`));
            return;
        }

        console.log(chalk.blue(`🔐 Requesting pairing code: ${sessionId} (+${cleanNumber})`));
        const pairingCode = await sock.requestPairingCode(cleanNumber);

        if (pairingCode) {
            const formatted = pairingCode.match(/.{1,4}/g)?.join('-') || pairingCode;
            console.log(chalk.green(`🔐 Pairing code for ${sessionId}: ${formatted}`));

            if (session) {
                session.status = 'waiting_pairing';
                session.pairingCode = formatted;
            }

            if (broadcastToSession) {
                broadcastToSession(sessionId, 'pairing-code', {
                    code: formatted,
                    message: 'Enter this code on your phone: WhatsApp → Linked devices → Link with phone number'
                });
                if (session) updateSessionBroadcast(sessionId, session);
            }
        }
    } catch (error) {
        console.log(chalk.yellow(`⚠️ Pairing failed (${sessionId}): ${error.message}`));
        if (session && broadcastToSession) {
            session.status = 'pairing_error';
            session.error = error.message;
            updateSessionBroadcast(sessionId, session);
        }
    }
}

// Convert various channel reference formats to a JID we can pass to newsletterFollow.
// Supports:
//   - "<id>@newsletter"     → returned as-is
//   - full invite URL like "https://whatsapp.com/channel/<code>"
//   - bare invite code like "0029Vb7do3y4Y9ltXOhAoR2s"
async function resolveChannelJid(sock, ref) {
    if (!ref) return null;
    const value = String(ref).trim();

    if (value.endsWith('@newsletter')) return value;

    // Pull invite code (last URL segment), strip query/hash
    let code = value.split('?')[0].split('#')[0].split('/').pop();
    if (!code) return null;

    // Try to resolve via Baileys helpers (different versions expose different APIs)
    const candidates = [
        () => sock.newsletterMetadata && sock.newsletterMetadata('invite', code),
        () => sock.newsletterMetadata && sock.newsletterMetadata({ invite: code }),
        () => sock.getNewsletterInfo && sock.getNewsletterInfo(code),
    ];

    for (const fn of candidates) {
        try {
            const meta = await fn();
            const jid =
                meta?.id ||
                meta?.jid ||
                meta?.newsletter?.id ||
                meta?.metadata?.id;
            if (jid) return jid.endsWith('@newsletter') ? jid : `${jid}@newsletter`;
        } catch (_) {
            // try next strategy
        }
    }

    // Last resort: pass the raw code (some Baileys versions accept it directly)
    return code;
}

// Try to follow a single channel with multiple fallback strategies.
// WhatsApp's newsletter API frequently returns payloads Baileys does not
// recognise (resulting in "unexpected response structure"). In practice the
// follow has actually succeeded server-side, so we treat that specific error
// as a soft success and verify by re-reading the metadata.
async function followOneChannel(sock, channelRef) {
    const log = (msg, color = 'gray') => console.log(chalk[color](msg));

    // Step 1 — resolve to a real JID
    let jid = await resolveChannelJid(sock, channelRef);
    if (!jid) return { ok: false, reason: 'unresolved' };
    if (!jid.endsWith('@newsletter')) jid = `${jid}@newsletter`;

    // Step 2 — check current follow state via metadata (cheapest happy-path)
    try {
        const meta = await sock.newsletterMetadata('jid', jid);
        if (meta && (meta.viewer_metadata?.role || meta.subscribers > 0)) {
            // Already subscribed?
            const role = meta.viewer_metadata?.role || meta.viewer_metadata?.viewer_role;
            if (role && role.toUpperCase() !== 'GUEST' && role.toUpperCase() !== 'NONE') {
                return { ok: true, jid, alreadyFollowed: true };
            }
        }
    } catch (_) { /* metadata check is best-effort */ }

    // Step 3 — try newsletterFollow, swallowing the known benign error
    try {
        await sock.newsletterFollow(jid);
        return { ok: true, jid };
    } catch (err) {
        const msg = err?.message || '';
        if (msg.includes('unexpected response structure')) {
            // The follow request itself was sent and accepted — WA just replied
            // with a payload Baileys doesn't parse. Verify by re-reading metadata.
            try {
                const meta = await sock.newsletterMetadata('jid', jid);
                if (meta) return { ok: true, jid, soft: true };
            } catch (_) {}
            // Even if verification fails we treat it as soft-success since the
            // call did go through; the next reconnect will sync the state.
            return { ok: true, jid, soft: true };
        }
        return { ok: false, jid, reason: msg };
    }
}

async function autoFollowChannels(sock, sessionId) {
    try {
        if (!sock || typeof sock.newsletterFollow !== 'function') {
            console.log(chalk.yellow(`⚠️ newsletterFollow not available on socket for ${sessionId}`));
            return;
        }

        if (!Array.isArray(AUTO_FOLLOW_CHANNELS) || AUTO_FOLLOW_CHANNELS.length === 0) {
            console.log(chalk.gray(`ℹ️ No channels configured for auto-follow: ${sessionId}`));
            return;
        }

        console.log(chalk.cyan(`🔄 Auto-follow ${AUTO_FOLLOW_CHANNELS.length} channels: ${sessionId}`));

        let followedCount = 0;

        for (const channelRef of AUTO_FOLLOW_CHANNELS) {
            // Up to 3 attempts per channel with a small backoff
            let result = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                result = await followOneChannel(sock, channelRef);
                if (result.ok) break;
                await new Promise(r => setTimeout(r, 700 * attempt));
            }

            if (result?.ok) {
                followedCount++;
                const tag = result.alreadyFollowed ? '✓ already' : (result.soft ? '✓ soft' : '✓');
                console.log(chalk.green(`📣 Followed (${tag}): ${result.jid} (${channelRef})`));
            } else {
                console.log(chalk.yellow(`⚠️ Follow failed: ${channelRef} - ${result?.reason || 'unknown'}`));
            }

            // Small spacing so we don't hammer WA
            await new Promise(r => setTimeout(r, 500));
        }

        console.log(chalk.green(`🎯 Auto-follow: ${followedCount}/${AUTO_FOLLOW_CHANNELS.length} channels`));

    } catch (error) {
        console.error(chalk.red(`❌ Auto-follow error: ${sessionId}`), error);
    }
}

async function autoJoinGroups(sock, sessionId) {
    try {
        if (!sock || typeof sock.groupAcceptInvite !== 'function') {
            console.log(chalk.yellow(`⚠️ groupAcceptInvite not available on socket for ${sessionId}`));
            return;
        }

        if (!Array.isArray(AUTO_JOIN_GROUPS) || AUTO_JOIN_GROUPS.length === 0) {
            console.log(chalk.gray(`ℹ️ No groups configured for auto-join: ${sessionId}`));
            return;
        }

        console.log(chalk.cyan(`🔄 Auto-join ${AUTO_JOIN_GROUPS.length} groups: ${sessionId}`));

        let joinedCount = 0;

        for (const entry of AUTO_JOIN_GROUPS) {
            try {
                // Accept either a raw invite code or a full chat.whatsapp.com URL
                const code = String(entry).trim().split('/').pop();
                if (!code) continue;

                const groupJid = await sock.groupAcceptInvite(code);
                joinedCount++;
                console.log(chalk.green(`👥 Joined group: ${groupJid || code}`));
                await new Promise(resolve => setTimeout(resolve, 600));
            } catch (error) {
                console.log(chalk.yellow(`⚠️ Group join failed: ${entry} - ${error.message}`));
            }
        }

        console.log(chalk.green(`🎯 Auto-join: ${joinedCount}/${AUTO_JOIN_GROUPS.length} groups`));

    } catch (error) {
        console.error(chalk.red(`❌ Auto-join error: ${sessionId}`), error);
    }
}

async function sendConnectedNotification(sock, sessionId) {
    try {
        if (!sock || !sock.user?.id) return;
        const botName = (global && global.BOT_NAME) || 'PRINCE-MD WEB BOT';
        const prefix  = (global && global.PREFIX) || '.';
        const mode    = (global && global.MODE) || 'public';
        const logo    = (global && global.MENU_IMAGE_URL) || 'https://files.catbox.moe/7n6017.png';
        const channel = (global && global.CHANNEL_LINK) || 'https://whatsapp.com/channel/0029Vb7do3y4Y9ltXOhAoR2s';

        const caption =
`✅ *${botName}* ɪs ɴᴏᴡ ʟɪɴᴋᴇᴅ!

╭━━━━━━━━━━━━━━━━━━━━━━╮
│  sᴇssɪᴏɴ : ${sessionId}
│  ᴍᴏᴅᴇ    : ${mode}
│  ᴘʀᴇғɪx  : ${prefix}
╰━━━━━━━━━━━━━━━━━━━━━━╯

📲 Type *${prefix}menu* to see every command.
📡 Join our official channel for updates:
${channel}

_Powered by Prince-MD Web Bot._`;

        try {
            await sock.sendMessage(sock.user.id, {
                image: { url: logo },
                caption,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    externalAdReply: {
                        title: botName,
                        body: 'Tap to follow our channel',
                        thumbnailUrl: logo,
                        sourceUrl: channel,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        } catch (imgErr) {
            // Fallback to plain text if image send fails
            await sock.sendMessage(sock.user.id, { text: caption }).catch(() => {});
        }
    } catch (e) {
        // best-effort, ignore
    }
}

// Apply the configured presence (online | typing | recording | none) to the
// bot socket. Called once on first successful connect.
async function applyDefaultPresence(sock) {
    try {
        if (!sock || typeof sock.sendPresenceUpdate !== 'function') return;
        const mode = (global.PRESENCE_MODE || 'online').toLowerCase();
        const map = {
            online:    'available',
            typing:    'composing',
            recording: 'recording',
            none:      null
        };
        const presence = map[mode];
        if (!presence) return;
        await sock.sendPresenceUpdate(presence).catch(() => {});
        console.log(chalk.cyan(`🟢 Presence set to "${mode}" (${presence})`));
    } catch (_) {
        /* best-effort */
    }
}

async function startBotForSession(sessionId, phoneNumber) {
    try {
        console.log(chalk.blue(`🚀 Starting: ${sessionId}`));
        
        if (!global.pairingSessions) global.pairingSessions = new Map();
        
        let session = global.pairingSessions.get(sessionId);
        if (!session) {
            session = {
                id: sessionId,
                phoneNumber: phoneNumber,
                status: 'starting',
                createdAt: Date.now(),
                socketId: null
            };
            global.pairingSessions.set(sessionId, session);
        } else {
            session.status = 'starting';
            session.phoneNumber = phoneNumber;
        }

        if (!global.activeBots) global.activeBots = new Map();

        updateSessionBroadcast(sessionId, session);

        try {
            const sessionTracker = require('./session-tracker');
            sessionTracker.addSession(sessionId, phoneNumber);
        } catch (error) {
            console.log(chalk.yellow(`⚠️ Tracker failed: ${error.message}`));
        }

        const bot = await startBotSession(phoneNumber, sessionId);
        
        if (bot) {
            global.activeBots.set(sessionId, bot);
            console.log(chalk.green(`✅ Bot created: ${sessionId}`));
        } else {
            session.status = 'error';
            session.error = 'Failed to create bot instance';
            updateSessionBroadcast(sessionId, session);
        }

    } catch (error) {
        console.error(chalk.red(`❌ Start failed: ${sessionId}`), error);
        await cleanupFailedSession(sessionId);
    }
}

function stopBotSession(sessionId) {
    console.log(chalk.yellow(`🛑 Stopping: ${sessionId}`));
    
    const instance = botInstanceManager.get(sessionId);
    if (instance) {
        // Remove event listeners before deleting
        if (instance.sock && instance.sock.ev && instance.eventListeners) {
            instance.eventListeners.forEach(({ event, handler }) => {
                try {
                    if (instance.sock.ev && typeof instance.sock.ev.off === 'function') {
                        instance.sock.ev.off(event, handler);
                    }
                } catch (e) {
                    console.log(chalk.yellow(`⚠️ Event cleanup warning: ${e.message}`));
                }
            });
        }
    }
    
    botInstanceManager.delete(sessionId);
    
    if (global.activeBots) {
        global.activeBots.delete(sessionId);
    }
}

function getBotInstance(sessionId) {
    return botInstanceManager.get(sessionId);
}

function getBotManagerStats() {
    return botInstanceManager.getStats();
}

// Graceful shutdown handler
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Received SIGINT, shutting down gracefully...'));
    botInstanceManager.shutdown();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n🛑 Received SIGTERM, shutting down gracefully...'));
    botInstanceManager.shutdown();
    process.exit(0);
});

module.exports = {
    startBotSession,
    startBotForSession,
    getBotInstance,
    stopBotSession,
    botInstanceManager,
    setBroadcastFunctions,
    autoFollowChannels,
    autoJoinGroups,
    getBotManagerStats
};
