/* 
📝 | Created By PRINCETECH
🖥️ | Base Ori By PRINCETECH
📌 | Credits PRINCETECH
📱 | Chat wa:254703712475
👑 | Github: PRINCE-TECH
✉️ | Email: princetech@gmail.com
*/

// Bot Configuration
global.owner = "254703712475";
global.botname = "Prince-XMD Bot";
global.website = "https://github.com/PRINCE-TECH";

// Menu Configuration
global.MENU_IMAGE_URL = "https://files.catbox.moe/7n6017.png";
global.BOT_NAME = "PRINCE-MD WEB BOT";
global.MODE = "public"; // FIXED: Default mode - will be used by command system
global.PREFIX = ".";
global.version = "3.0.0";
global.DESCRIPTION = "🚀 Powered by Prince-MD Web Bot | Multi-session WhatsApp Bot";

// Channel Configuration
global.CHANNEL_JID = "https://whatsapp.com/channel/0029VbDFNU0KbYMUKyLrMW2Q";
global.CHANNEL_NAME = "PRINCE-MD BOT";
global.CHANNEL_LINK = "https://whatsapp.com/channel/0029VbDFNU0KbYMUKyLrMW2Q";

// Presence Configuration — what the bot shows in chats
//   "online"    → always available (default)
//   "typing"    → shows "typing..." while replying
//   "recording" → shows "recording audio..." while replying
//   "none"      → no presence updates
global.PRESENCE_MODE = (process.env.PRESENCE_MODE || "online").toLowerCase();

// Database Configuration
global.tempatDB = "database.json";

// Auto-follow Channels (Newsletters)
// Accepts either a JID (e.g. "<id>@newsletter"), a raw invite code,
// or a full https://whatsapp.com/channel/<code> URL.
global.AUTO_FOLLOW_CHANNELS = [
    "https://whatsapp.com/channel/0029VbDFNU0KbYMUKyLrMW2Q",
];

// Auto-join Groups
// Accepts either a raw invite code or a full https://chat.whatsapp.com/<code> URL.
global.AUTO_JOIN_GROUPS = [
    "https://chat.whatsapp.com/Gulz1YEd1NiEXm5LqkEwX7",
];

// Web Server Configuration
global.WEB_PORT = process.env.PORT || 3000;
global.WEB_SECRET = "prince-bot-secret-2024";

// Session Configuration
global.SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// FIXED: Export for external use with enhanced mode support
module.exports = {
    owner: global.owner,
    botname: global.botname,
    website: global.website,
    tempatDB: global.tempatDB,
    AUTO_FOLLOW_CHANNELS: global.AUTO_FOLLOW_CHANNELS,
    AUTO_JOIN_GROUPS: global.AUTO_JOIN_GROUPS,
    WEB_PORT: global.WEB_PORT,
    WEB_SECRET: global.WEB_SECRET,
    SESSION_TIMEOUT: global.SESSION_TIMEOUT,
    MENU_IMAGE_URL: global.MENU_IMAGE_URL,
    BOT_NAME: global.BOT_NAME,
    MODE: global.MODE,
    PREFIX: global.PREFIX,
    version: global.version,
    DESCRIPTION: global.DESCRIPTION,
    CHANNEL_JID: global.CHANNEL_JID,
    CHANNEL_NAME: global.CHANNEL_NAME,
    CHANNEL_LINK: global.CHANNEL_LINK,
    PRESENCE_MODE: global.PRESENCE_MODE,

    // FIXED: Enhanced functions for mode management
    getMode: () => global.MODE,
    setMode: (newMode) => {
        if (['public', 'self'].includes(newMode)) {
            global.MODE = newMode;
            return true;
        }
        return false;
    },

    // Presence mode (online | typing | recording | none)
    getPresenceMode: () => global.PRESENCE_MODE || 'online',
    setPresenceMode: (mode) => {
        const allowed = ['online', 'typing', 'recording', 'none'];
        const v = String(mode || '').toLowerCase();
        if (!allowed.includes(v)) return false;
        global.PRESENCE_MODE = v;
        return true;
    },
    
    // FIXED: Owner validation helper
    isOwner: (jid) => {
        const ownerJid = typeof global.owner === 'string' 
            ? [global.owner] 
            : global.owner;
        
        const ownerJids = ownerJid.map(owner => {
            const cleanNumber = owner.replace(/[^0-9]/g, '');
            return cleanNumber + '@s.whatsapp.net';
        });
        
        return ownerJids.includes(jid);
    }
};
