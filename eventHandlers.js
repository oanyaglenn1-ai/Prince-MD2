// eventHandlers.js - COMPLETE WORKING ANTIDELETE
const chalk = require('chalk');
const NodeCache = require('node-cache');

class OptimizedEventHandlers {
    constructor(sock) {
        this.sock = sock;
        
        // 🚀 ENHANCED CACHING FOR ANTIDELETE
        this.deletedMessages = new NodeCache({ 
            stdTTL: 600,        // 10 minutes
            checkperiod: 120,
            maxKeys: 10000,     // Increased for more messages
            useClones: false
        });
        
        this.typingSessions = new Map();
        this.recordingSessions = new Map();
        
        // 🎯 DEFAULT FEATURE STATES
        this.featureStates = {
            antidelete: true,
            autoview: true,
            autotyping: true,
            autorecording: true,
            antileft: false,
            autolike: true,
            autoreact: true
        };
        
        // 🚀 PERFORMANCE OPTIMIZATIONS
        this.stats = {
            antideleteTriggers: 0,
            autoviewTriggers: 0,
            autotypingTriggers: 0,
            autorecordingTriggers: 0,
            autoreactTriggers: 0,
            messagesStored: 0,
            errors: 0,
            lastReset: Date.now()
        };
        
        this.rateLimits = new Map();
        this.messageProcessors = new Map();
        
        console.log(chalk.green('🚀 Optimized EventHandlers initialized for 880+ users'));
    }

    // 🎯 SETUP ALL HANDLERS
    setupAllHandlers() {
        this.setupAntiDelete();
        this.setupAutoViewStatus();
        this.setupAutoTyping();
        this.setupAutoRecording();
        this.setupAutoLikeStatus();
        this.setupStatusReact();
        this.setupAntiLeft();

        console.log(chalk.cyan('✅ All event handlers activated'));
    }

    // 🛡️ ANTI-LEFT — automatically re-add anyone who leaves a protected group.
    // Runs while the bot is connected; the bot must be a group admin to re-add.
    setupAntiLeft() {
        if (!this.antiLeftGroups) this.antiLeftGroups = new Map(); // jid -> { reAdded: number }

        this.sock.ev.on('group-participants.update', async (update) => {
            try {
                if (!update || !update.id) return;
                if (update.action !== 'remove') return;

                const enabledForGroup = this.antiLeftGroups.has(update.id);
                const enabledGlobally = !!this.featureStates.antileft;
                if (!enabledForGroup && !enabledGlobally) return;

                const stats = this.antiLeftGroups.get(update.id) || { reAdded: 0 };
                const participants = update.participants || [];
                if (!participants.length) return;

                // Quick rate-limit so we don't hammer WhatsApp on mass-leaves.
                const now = Date.now();
                const last = this.rateLimits.get(`antileft:${update.id}`) || 0;
                if (now - last < 1500) return;
                this.rateLimits.set(`antileft:${update.id}`, now);

                for (const jid of participants.slice(0, 5)) {
                    try {
                        await this.sock.groupParticipantsUpdate(update.id, [jid], 'add');
                        stats.reAdded += 1;
                        console.log(chalk.green(`🛡️ Anti-left: re-added ${jid} → ${update.id}`));
                    } catch (err) {
                        // Common: not-admin / forbidden / user blocked group invites.
                        // Try a fallback DM with the invite link so they can rejoin themselves.
                        try {
                            const code = await this.sock.groupInviteCode(update.id);
                            if (code) {
                                await this.sock.sendMessage(jid, {
                                    text: `🛡️ You were re-invited to the group. Tap to rejoin:\nhttps://chat.whatsapp.com/${code}`
                                }).catch(() => {});
                            }
                        } catch (_) { /* ignore */ }
                    }
                }

                this.antiLeftGroups.set(update.id, stats);
            } catch (e) {
                this.stats.errors++;
            }
        });

        console.log(chalk.green('🛡️ Anti-left listener active'));
    }

    enableAntiLeft(groupJid) {
        if (!this.antiLeftGroups) this.antiLeftGroups = new Map();
        this.antiLeftGroups.set(groupJid, this.antiLeftGroups.get(groupJid) || { reAdded: 0 });
        this.featureStates.antileft = true;
        return true;
    }

    disableAntiLeft(groupJid) {
        if (this.antiLeftGroups) this.antiLeftGroups.delete(groupJid);
        // Keep the global flag enabled if other groups still want it.
        if (!this.antiLeftGroups || this.antiLeftGroups.size === 0) {
            this.featureStates.antileft = false;
        }
        return true;
    }

    isAntiLeftEnabled(groupJid) {
        return !!(this.antiLeftGroups && this.antiLeftGroups.has(groupJid));
    }

    getAntiLeftStats(groupJid) {
        const s = this.antiLeftGroups && this.antiLeftGroups.get(groupJid);
        return s || { reAdded: 0 };
    }

    // 🛡️ ENHANCED ANTIDELETE WITH MULTIPLE DETECTION METHODS
    setupAntiDelete() {
        console.log(chalk.yellow('🛡️ Setting up anti-delete listeners...'));
        
        // METHOD 1: messages.delete event (Primary)
        this.sock.ev.on('messages.delete', async (deleteData) => {
            if (!this.featureStates.antidelete) return;
            
            console.log(chalk.yellow(`🔍 Anti-delete triggered: ${deleteData.keys?.length || 0} messages`));
            
            if (!deleteData.keys?.length) return;
            
            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('antidelete') || 0;
            if (now - lastTrigger < 1000) return;
            this.rateLimits.set('antidelete', now);
            
            this.stats.antideleteTriggers++;
            
            // 🚀 PROCESS DELETED MESSAGES
            for (const key of deleteData.keys.slice(0, 5)) {
                await this.handleDeletedMessage(key);
            }
        });

        // METHOD 2: messages.update for revocations (Backup)
        this.sock.ev.on('messages.update', async (updates) => {
            if (!this.featureStates.antidelete || !updates.length) return;

            for (const update of updates) {
                // Check for message revocation (deletion)
                if (update.update && (
                    update.update.messageStubType === 67 || // Message deleted for everyone
                    update.update.messageStubType === 0     // Message revoked
                )) {
                    console.log(chalk.yellow(`🔍 Message revocation detected: ${update.key.id}`));
                    await this.handleDeletedMessage(update.key);
                }
            }
        });

        // METHOD 3: Protocol message handling (Alternative)
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.antidelete || m.type !== 'notify') return;

            for (const msg of m.messages) {
                // Check for protocol messages indicating deletion
                if (msg.message?.protocolMessage?.type === 5) { // REVOKE
                    const key = msg.message.protocolMessage.key;
                    console.log(chalk.yellow(`🔍 Protocol revoke detected: ${key.id}`));
                    await this.handleDeletedMessage(key);
                }
            }
        });

        console.log(chalk.green('✅ Anti-delete listeners activated'));
    }

    // 🎯 HANDLE DELETED MESSAGE
    async handleDeletedMessage(key) {
        try {
            const messageId = key.id;
            const deletedMessage = this.deletedMessages.get(messageId);
            
            if (!deletedMessage) {
                console.log(chalk.yellow(`⚠️ No stored message found for: ${messageId}`));
                return;
            }

            const content = this.extractMessageContent(deletedMessage);
            const deleter = key.participant || 'Unknown';
            const chatJid = key.remoteJid;
            const sender = deletedMessage.key?.participant || deletedMessage.key?.remoteJid || 'Unknown';
            
            console.log(chalk.green(`🎯 Retrieved deleted message: ${messageId.substring(0, 8)}...`));
            
            // 🚀 CREATE ANNOUNCEMENT
            const announcement = this.createDeleteAnnouncement(content, deleter, sender);
            
            // 🚀 SEND TO SAME CHAT
            const success = await this.safeSendMessage(chatJid, {
                text: announcement,
                mentions: [deleter, sender].filter(Boolean)
            });

            if (success) {
                console.log(chalk.green(`✅ Anti-delete announced in: ${chatJid}`));
                
                // 🚀 ALSO SEND TO BOT OWNER IF DIFFERENT CHAT
                const botNumber = this.sock.user?.id;
                if (botNumber && chatJid !== botNumber) {
                    await this.safeSendMessage(botNumber, {
                        text: `🚨 *Message Deleted Report*\n\n💬 ${content.substring(0, 100)}...\n👤 From: ${sender}\n🗑️ Deleted by: ${deleter}\n💬 Chat: ${chatJid}`
                    });
                }
            }

            // Remove from cache after processing
            this.deletedMessages.del(messageId);

        } catch (error) {
            this.stats.errors++;
            console.log(chalk.red(`❌ Anti-delete error: ${error.message}`));
        }
    }

    // 🎯 CREATE DELETE ANNOUNCEMENT
    createDeleteAnnouncement(content, deleter, sender) {
        const deleterName = deleter.split('@')[0];
        const senderName = sender.split('@')[0];
        
        let announcement = `🚨 *Message Deleted*\n\n`;
        
        if (deleter !== sender && deleter !== 'Unknown') {
            announcement += `🗑️ *Deleted by:* @${deleterName}\n`;
        }
        
        announcement += `👤 *From:* @${senderName}\n\n`;
        announcement += `💬 *Message:* ${content.substring(0, 200)}`;
        
        if (content.length > 200) {
            announcement += '...';
        }
        
        return announcement;
    }

    // 👀 AUTO-VIEW STATUS — view EVERY status the moment it arrives.
    // No rate-limit, no batch cap. We dedupe per-message so we never read the
    // same status twice, and we mark each status as read individually so
    // contacts see the bot has viewed it instantly.
    setupAutoViewStatus() {
        if (!this.viewedStatusIds) {
            // Bounded LRU-ish set so we don't grow forever.
            this.viewedStatusIds = new Set();
        }

        const viewOne = async (msg) => {
            try {
                if (!msg || !msg.key || msg.key.remoteJid !== 'status@broadcast') return;
                if (msg.key.fromMe) return;
                if (this.viewedStatusIds.has(msg.key.id)) return;
                this.viewedStatusIds.add(msg.key.id);

                // Trim memory: keep at most ~5000 ids
                if (this.viewedStatusIds.size > 5000) {
                    const first = this.viewedStatusIds.values().next().value;
                    this.viewedStatusIds.delete(first);
                }

                // Primary: readMessages (the official "blue tick" path)
                await this.sock.readMessages([msg.key]);
                this.stats.autoviewTriggers++;
                console.log(chalk.blue(`👀 Auto-viewed status from: ${msg.pushName || msg.key.participant || 'Unknown'}`));
            } catch (error) {
                if (error?.message?.includes('rate-overlimit')) return; // expected at high volume
                // Fallback: relay a read receipt directly (some statuses need this)
                try {
                    if (this.sock.sendReceipt) {
                        await this.sock.sendReceipt(msg.key.remoteJid, msg.key.participant, [msg.key.id], 'read');
                    } else if (this.sock.sendReadReceipt) {
                        await this.sock.sendReadReceipt(msg.key.remoteJid, msg.key.participant, [msg.key.id]);
                    }
                } catch (_) {
                    // Silent; we'll catch it on the next status from the same poster
                }
            }
        };

        // Listener 1: brand-new statuses arrive via messages.upsert
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autoview || !m.messages?.length) return;
            // Process every status in the batch concurrently
            await Promise.all(
                m.messages
                    .filter(msg => msg.key?.remoteJid === 'status@broadcast' && !msg.key.fromMe)
                    .map(viewOne)
            );
        });

        // Listener 2: history-sync / app-state pushes existing statuses too
        this.sock.ev.on('messaging-history.set', async ({ messages }) => {
            if (!this.featureStates.autoview || !messages?.length) return;
            await Promise.all(
                messages
                    .filter(msg => msg.key?.remoteJid === 'status@broadcast' && !msg.key.fromMe)
                    .map(viewOne)
            );
        });
    }

    // ⌨️ AUTO-TYPING (Debounced for performance)
    setupAutoTyping() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autotyping || m.type !== 'notify' || !m.messages.length) return;

            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('autotyping') || 0;
            if (now - lastTrigger < 1500) return;
            this.rateLimits.set('autotyping', now);
            
            this.stats.autotypingTriggers++;
            
            // 🚀 DEBOUNCED TYPING
            const typingChats = new Set();
            
            for (const msg of m.messages.slice(0, 5)) {
                if (!msg.key.fromMe && msg.message && msg.key.remoteJid && !msg.key.remoteJid.endsWith('@broadcast')) {
                    typingChats.add(msg.key.remoteJid);
                }
            }

            for (const jid of Array.from(typingChats).slice(0, 3)) {
                if (this.typingSessions.has(jid)) continue;
                
                try {
                    await this.sock.sendPresenceUpdate('composing', jid);
                    
                    const timeout = setTimeout(async () => {
                        await this.safePresenceUpdate('paused', jid);
                        this.typingSessions.delete(jid);
                    }, 8000);

                    this.typingSessions.set(jid, timeout);
                } catch (error) {
                    // Silent fail
                }
            }
        });
    }

    // ⏺️ AUTO-RECORDING (Debounced for performance)
    setupAutoRecording() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autorecording || m.type !== 'notify' || !m.messages.length) return;

            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('autorecording') || 0;
            if (now - lastTrigger < 1500) return;
            this.rateLimits.set('autorecording', now);
            
            this.stats.autorecordingTriggers++;
            
            // 🚀 DEBOUNCED RECORDING
            const recordingChats = new Set();
            
            for (const msg of m.messages.slice(0, 5)) {
                if (!msg.key.fromMe && msg.message && msg.key.remoteJid && !msg.key.remoteJid.endsWith('@broadcast')) {
                    recordingChats.add(msg.key.remoteJid);
                }
            }

            for (const jid of Array.from(recordingChats).slice(0, 2)) {
                if (this.recordingSessions.has(jid)) continue;
                
                try {
                    await this.sock.sendPresenceUpdate('recording', jid);
                    
                    const timeout = setTimeout(async () => {
                        await this.safePresenceUpdate('paused', jid);
                        this.recordingSessions.delete(jid);
                    }, 8000);

                    this.recordingSessions.set(jid, timeout);
                } catch (error) {
                    // Silent fail
                }
            }
        });
    }

    // ❤️ AUTO-LIKE STATUS
    setupAutoLikeStatus() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autolike || m.type !== 'notify' || !m.messages.length) return;
        
            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('autolike') || 0;
            if (now - lastTrigger < 3000) return;
            this.rateLimits.set('autolike', now);
            
            const statusMessages = m.messages.filter(msg => 
                msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe
            ).slice(0, 2);

            for (const msg of statusMessages) {
                try {
                    await this.sock.sendMessage(msg.key.remoteJid, {
                        react: {
                            text: '❤️',
                            key: msg.key
                        }
                    });
                    console.log(chalk.blue(`❤️ Auto-liked status from: ${msg.pushName || 'Unknown'}`));
                } catch (error) {
                    if (!error.message.includes('rate-overlimit')) {
                        console.log(chalk.yellow(`⚠️ Auto-like error: ${error.message}`));
                    }
                }
            }
        });
    }

    // 🎯 ENHANCED STATUS REACT SYSTEM
    setupStatusReact() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autoreact || m.type !== 'notify' || !m.messages.length) return;

            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('autoreact') || 0;
            if (now - lastTrigger < 5000) return;
            this.rateLimits.set('autoreact', now);
            
            this.stats.autoreactTriggers++;

            const statusMessages = m.messages.filter(msg => 
                msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe
            ).slice(0, 2);

            for (const msg of statusMessages) {
                try {
                    // Add small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Use random reaction
                    const reactions = ['❤️', '🔥', '👏', '🎉', '👍'];
                    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];

                    await this.sock.sendMessage(msg.key.remoteJid, {
                        react: {
                            text: randomReaction,
                            key: msg.key
                        }
                    });

                    console.log(chalk.green(`🎯 Reacted ${randomReaction} to status from: ${msg.pushName || 'Unknown'}`));

                } catch (error) {
                    if (error.message.includes('rate-overlimit')) {
                        console.log(chalk.yellow('⚠️ Rate limit hit for status reactions'));
                    } else {
                        console.log(chalk.red(`❌ Status react error: ${error.message}`));
                    }
                }
            }
        });
    }

    // 🛡️ SAFE MESSAGE SENDING
    async safeSendMessage(jid, content, options = {}) {
        try {
            await this.sock.sendMessage(jid, content, options);
            return true;
        } catch (error) {
            this.stats.errors++;
            console.log(chalk.red(`❌ Send message error: ${error.message}`));
            return false;
        }
    }

    // 🛡️ SAFE PRESENCE UPDATE
    async safePresenceUpdate(type, jid) {
        try {
            await this.sock.sendPresenceUpdate(type, jid);
            return true;
        } catch (error) {
            this.stats.errors++;
            return false;
        }
    }

    // 🎯 FEATURE CONTROL SYSTEM
    toggleFeature(feature, enabled) {
        if (this.featureStates.hasOwnProperty(feature)) {
            this.featureStates[feature] = enabled;
            console.log(chalk.yellow(`🔧 ${feature} ${enabled ? 'ENABLED' : 'DISABLED'}`));
            return true;
        }
        return false;
    }

    toggleAllFeatures(enabled) {
        Object.keys(this.featureStates).forEach(feature => {
            this.featureStates[feature] = enabled;
        });
        console.log(chalk.yellow(`🔧 ALL FEATURES ${enabled ? 'ENABLED' : 'DISABLED'}`));
    }

    getFeatureState(feature) {
        return this.featureStates[feature];
    }

    getAllFeatureStates() {
        return { ...this.featureStates };
    }

    // 💾 STORE RECENT MESSAGE - CALL THIS FROM MESSAGE PROCESSOR!
    storeRecentMessage(msg) {
        if (msg.key?.id) {
            this.deletedMessages.set(msg.key.id, msg);
            this.stats.messagesStored++;
            console.log(chalk.blue(`💾 Stored message: ${msg.key.id.substring(0, 8)}... (Total: ${this.stats.messagesStored})`));
        }
    }

    // 📄 EXTRACT MESSAGE CONTENT
    extractMessageContent(msg) {
        try {
            const message = msg.message || msg;
            if (message.conversation) return message.conversation;
            if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
            if (message.imageMessage?.caption) return message.imageMessage.caption || '[Image]';
            if (message.videoMessage?.caption) return message.videoMessage.caption || '[Video]';
            if (message.audioMessage) return '[Audio]';
            if (message.documentMessage) return '[Document]';
            if (message.stickerMessage) return '[Sticker]';
            if (message.contactMessage) return '[Contact]';
            if (message.locationMessage) return '[Location]';
            return `[${Object.keys(message)[0]?.replace('Message', '')}]`;
        } catch {
            return '[Content]';
        }
    }

    // 📊 GET STATISTICS
    getStats() {
        return {
            ...this.stats,
            featureStates: this.getAllFeatureStates(),
            cacheSizes: {
                deletedMessages: this.deletedMessages.keys().length,
                typingSessions: this.typingSessions.size,
                recordingSessions: this.recordingSessions.size
            },
            activeUsers: this.typingSessions.size + this.recordingSessions.size
        };
    }

    // 🧹 CLEANUP
    cleanup() {
        // Clear all timeouts
        this.typingSessions.forEach(timeout => clearTimeout(timeout));
        this.recordingSessions.forEach(timeout => clearTimeout(timeout));
        
        // Clear all collections
        this.typingSessions.clear();
        this.recordingSessions.clear();
        this.rateLimits.clear();
        this.deletedMessages.flushAll();
        
        // Reset stats
        this.stats.antideleteTriggers = 0;
        this.stats.autoviewTriggers = 0;
        this.stats.autotypingTriggers = 0;
        this.stats.autorecordingTriggers = 0;
        this.stats.autoreactTriggers = 0;
        this.stats.messagesStored = 0;
        this.stats.errors = 0;
        this.stats.lastReset = Date.now();
        
        console.log(chalk.green('🧹 EventHandlers completely cleaned up'));
    }
}

module.exports = OptimizedEventHandlers;