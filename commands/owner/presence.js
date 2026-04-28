// commands/owner/presence.js — Configure how the bot appears in chats
module.exports = {
    name: 'presence',
    category: 'owner',
    description: 'Set bot presence (online | typing | recording | none)',
    permission: 'owner',
    aliases: ['setpresence', 'status-mode'],
    async execute(context) {
        const { args, sock, reply, m } = context;
        const settings = require('../../settings.js');

        const action = (args[0] || '').toLowerCase();
        const allowed = ['online', 'typing', 'recording', 'none'];

        if (!action || !allowed.includes(action)) {
            const current = settings.getPresenceMode ? settings.getPresenceMode() : (global.PRESENCE_MODE || 'online');
            return reply(
`🟢 *PRESENCE MODE*

Current: *${current}*

Available options:
• \`.presence online\`    → always available
• \`.presence typing\`    → always shows "typing…"
• \`.presence recording\` → always shows "recording audio…"
• \`.presence none\`      → no presence updates

Tip: choose *typing* or *recording* for that "always-active" feel in your chats.`);
        }

        const ok = settings.setPresenceMode ? settings.setPresenceMode(action) : false;
        if (!ok) return reply('❌ Failed to update presence mode.');

        // Apply immediately to the live socket
        try {
            const map = { online: 'available', typing: 'composing', recording: 'recording', none: null };
            const presence = map[action];
            if (presence) {
                await sock.sendPresenceUpdate(presence).catch(() => {});
                if (m && m.chat) await sock.sendPresenceUpdate(presence, m.chat).catch(() => {});
            }
        } catch (_) {}

        return reply(`✅ Presence mode set to *${action}*.\n\nThis will persist until changed (or until next restart unless PRESENCE_MODE is set in environment variables).`);
    }
};
