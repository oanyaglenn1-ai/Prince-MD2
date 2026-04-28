// commands/tools/menu.js — PRINCE-MD WEB BOT
module.exports = {
    name: 'menu',
    category: 'tools',
    description: 'Show bot command menu',
    permission: 'all',
    aliases: ['help', 'start'],
    async execute(context) {
        const { m, sock, reply, pushname } = context;

        const LOGO_URL = (global.MENU_IMAGE_URL) || 'https://files.catbox.moe/7n6017.png';
        const CHANNEL_LINK = (global.CHANNEL_LINK) || 'https://whatsapp.com/channel/0029Vb7do3y4Y9ltXOhAoR2s';
        const BOT_NAME = (global.BOT_NAME) || 'PRINCE-MD WEB BOT';
        const PREFIX = (global.PREFIX) || '.';

        try {
            // Safely get command system stats
            let loadedCommands = 'Loading...';
            try {
                const commandSystem = require('../index.js');
                const stats = commandSystem.getStats ? commandSystem.getStats() : { loaded: 'Unknown' };
                loadedCommands = stats.loaded || 'Unknown';
            } catch (error) {
                loadedCommands = 'Error loading';
            }

            const caption =
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
│           ᴘʀɪɴᴄᴇ-ᴍᴅ ᴡᴇʙ ʙᴏᴛ            │
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭▢ ⌜ ᴏᴡɴᴇʀᴍᴇɴᴜ ⌟
> │⭔${PREFIX}*\`ʙʟᴏᴄᴋ\`*
> │⭔${PREFIX}*\`ᴜɴʙʟᴏᴄᴋ\`*
> │⭔${PREFIX}*\`ᴅᴇᴠ\`*
> │⭔${PREFIX}*\`sᴇʟғ\`*
> │⭔${PREFIX}*\`ᴘᴜʙʟɪᴄ\`*
> │⭔${PREFIX}*\`ʙᴄ\`*
> │⭔${PREFIX}*\`ʀᴇᴘᴏʀᴛ\`*
> │⭔${PREFIX}*\`sᴇᴛʙɪᴏ\`*
> │⭔${PREFIX}*\`sᴇᴛᴛɪɴɢs\`*
> │⭔${PREFIX}*\`ᴘʀᴇsᴇɴᴄᴇ\`*
> │⭔${PREFIX}*\`ғᴇᴀᴛᴜʀᴇs\`*
> │⭔${PREFIX}*\`ᴀɴᴛɪʟᴇғᴛ\`*
> │⭔${PREFIX}*\`ᴀᴜᴛᴏsᴛᴀᴛᴜs\`*
> │⭔${PREFIX}*\`ʜᴇʏ\`*
╰▢

╭▢ ⌜ ɢʀᴏᴜᴘᴍᴀɴᴀɢᴇᴍᴇɴᴛ ⌟
> │⭔${PREFIX}*\`ᴀᴅᴅ\`*
> │⭔${PREFIX}*\`ᴘʀᴏᴍᴏᴛᴇ\`*
> │⭔${PREFIX}*\`ᴅᴇᴍᴏᴛᴇ\`*
> │⭔${PREFIX}*\`ᴋɪᴄᴋ\`*
> │⭔${PREFIX}*\`ᴏᴘᴇɴ\`*
> │⭔${PREFIX}*\`ᴄʟᴏsᴇ\`*
> │⭔${PREFIX}*\`ʟɪɴᴋ\`*
> │⭔${PREFIX}*\`ᴛᴀɢᴀʟʟ\`*
> │⭔${PREFIX}*\`ᴛᴀɢᴀᴅᴍɪɴ\`*
> │⭔${PREFIX}*\`ᴛᴏᴛᴀʟᴍᴇᴍʙᴇʀs\`*
> │⭔${PREFIX}*\`ʜɪᴅᴇᴛᴀɢ\`*
> │⭔${PREFIX}*\`ᴠᴄғ\`*
> │⭔${PREFIX}*\`ᴀᴘᴘʀᴏᴠᴇᴀʟʟ\`*
> │⭔${PREFIX}*\`ʀᴇᴊᴇᴄᴛᴀʟʟ\`*
╰▢

╭▢ ⌜ ᴀɪ&ᴄʜᴀᴛʙᴏᴛs ⌟
> │⭔${PREFIX}*\`ɢᴘᴛ\`*
> │⭔${PREFIX}*\`ᴄʜᴀᴛɢᴘᴛ\`*
> │⭔${PREFIX}*\`ᴅᴇᴇᴘsᴇᴇᴋ\`*
> │⭔${PREFIX}*\`ɪᴍᴀɢɪɴᴇ\`*
> │⭔${PREFIX}*\`ʟʟᴀᴍᴀ\`*
> │⭔${PREFIX}*\`ᴊᴏᴋᴇs\`*
> │⭔${PREFIX}*\`ᴀᴅᴠɪᴄᴇ\`*
> │⭔${PREFIX}*\`ᴛʀɪᴠɪᴀ\`*
╰▢

╭▢ ⌜ ᴜᴛɪʟɪᴛɪᴇs ⌟
> │⭔${PREFIX}*\`ᴍᴇɴᴜ\`*
> │⭔${PREFIX}*\`ᴘɪɴɢ\`*
> │⭔${PREFIX}*\`ᴜᴘᴛɪᴍᴇ\`*
> │⭔${PREFIX}*\`ʟɪsᴛɢᴄ\`*
> │⭔${PREFIX}*\`ʟɪsᴛᴘᴄ\`*
> │⭔${PREFIX}*\`ʀᴇᴀᴄᴛ\`*
> │⭔${PREFIX}*\`ʟᴇᴀᴠᴇɢᴄ\`*
> │⭔${PREFIX}*\`ᴅᴇʟᴇᴛᴇ\`*
> │⭔${PREFIX}*\`ʙᴀɴᴋᴄᴇᴋ\`*
> │⭔${PREFIX}*\`ʙᴀɴsᴏs\`*
> │⭔${PREFIX}*\`ᴍᴇ\`*
> │⭔${PREFIX}*\`ʀᴏᴋᴇᴛ\`*
> │⭔${PREFIX}*\`ʀᴇᴘᴀɪʀ\`*
> │⭔${PREFIX}*\`ᴘᴇᴛsᴛᴏʀᴇ\`*
> │⭔${PREFIX}*\`ᴀʟᴀʀᴍ\`*
> │⭔${PREFIX}*\`ᴀᴜᴛᴏʀᴇᴀᴅ\`*
> │⭔${PREFIX}*\`ᴍʏɪᴘ\`*
> │⭔${PREFIX}*\`ᴍᴀᴛʜǫᴜɪᴢ\`*
╰▢

╭▢ ⌜ ᴍᴇᴅɪᴀ&ᴅᴏᴡɴʟᴏᴀᴅ ⌟
> │⭔${PREFIX}*\`sᴏɴɢ\`*
> │⭔${PREFIX}*\`ᴘʟᴀʏ\`*
> │⭔${PREFIX}*\`ssᴡᴇʙ\`*
> │⭔${PREFIX}*\`ɪᴅᴄʜ\`*
> │⭔${PREFIX}*\`ᴀᴘᴋ\`*
> │⭔${PREFIX}*\`ᴡᴇᴀᴛʜᴇʀ\`*
> │⭔${PREFIX}*\`ʟʏʀɪᴄs\`*
> │⭔${PREFIX}*\`ᴛᴏᴜʀʟ\`*
> │⭔${PREFIX}*\`ᴛᴏᴍᴘ3\`*
> │⭔${PREFIX}*\`ᴛᴏᴠɴ\`*
> │⭔${PREFIX}*\`ᴛᴏᴏɴᴄᴇ\`*
> │⭔${PREFIX}*\`ᴛᴏᴀɴɪᴍᴇ\`*
╰▢

╭▢ ⌜ ᴡᴀʟʟᴘᴀᴘᴇʀs ⌟
> │⭔${PREFIX}*\`ʙᴇsᴛ-ᴡᴀʟʟᴘ\`*
> │⭔${PREFIX}*\`ʀᴀɴᴅᴏᴍ\`*
╰▢

╭▢ ⌜ ᴀɴᴛɪ-ғᴇᴀᴛᴜʀᴇs ⌟
> │⭔${PREFIX}*\`ᴀɴᴛɪʟɪɴᴋ\`*
> │⭔${PREFIX}*\`ᴀɴᴛɪʙᴀᴅᴡᴏʀᴅ\`*
> │⭔${PREFIX}*\`ᴀɴᴛɪʙᴏᴛ\`*
> │⭔${PREFIX}*\`ᴀɴᴛɪᴛᴀɢᴀᴅᴍɪɴ\`*
> │⭔${PREFIX}*\`ᴀɴᴛɪʟɪɴᴋɢᴄ\`*
> │⭔${PREFIX}*\`ᴀɴᴛɪᴅᴇᴍᴏᴛᴇ\`*
> │⭔${PREFIX}*\`ᴀɴᴛɪᴘʀᴏᴍᴏᴛᴇ\`*
> │⭔${PREFIX}*\`ᴀɴᴛɪғᴏʀᴇɪɢɴ\`*
> │⭔${PREFIX}*\`ᴀɴᴛɪᴠɪʀᴜs\`*
╰▢

╭▢ ⌜ ᴀʟʟᴏᴡᴍᴀɴᴀɢᴇᴍᴇɴᴛ ⌟
> │⭔${PREFIX}*\`ᴀʟʟᴏᴡ\`*
> │⭔${PREFIX}*\`ᴅᴇʟᴀʟʟᴏᴡᴇᴅ\`*
> │⭔${PREFIX}*\`ʟɪsᴛᴀʟʟᴏᴡᴇᴅ\`*
╰▢

╭▢ ⌜ ᴄᴏᴜɴᴛʀʏғɪʟᴛᴇʀs ⌟
> │⭔${PREFIX}*\`ᴀᴅᴅᴄᴏᴅᴇ\`*
> │⭔${PREFIX}*\`ᴅᴇʟᴄᴏᴅᴇ\`*
> │⭔${PREFIX}*\`ʟɪsᴛᴄᴏᴅᴇ\`*
╰▢

📡 *ᴊᴏɪɴ ᴏᴜʀ ᴡʜᴀᴛsᴀᴘᴘ ᴄʜᴀɴɴᴇʟ:*
${CHANNEL_LINK}

*📊 sʏsᴛᴇᴍ sᴛᴀᴛs: ${loadedCommands} ᴄᴏᴍᴍᴀɴᴅs ʟᴏᴀᴅᴇᴅ*
*👋 ʜᴇʟʟᴏ ${pushname || 'ᴜsᴇʀ'}!*
*✅ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴘʀɪɴᴄᴇ-ᴍᴅ ᴡᴇʙ ʙᴏᴛ*`;

            await sock.sendMessage(m.chat, {
                image: { url: LOGO_URL },
                caption,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    externalAdReply: {
                        title: BOT_NAME,
                        body: 'Tap to follow our channel',
                        thumbnailUrl: LOGO_URL,
                        sourceUrl: CHANNEL_LINK,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

        } catch (error) {
            console.error('Menu image error:', error);
            // Fallback to text-only menu
            await reply(`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
│           ᴘʀɪɴᴄᴇ-ᴍᴅ ᴡᴇʙ ʙᴏᴛ            │
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

*👋 ʜᴇʟʟᴏ ${pushname || 'ᴜsᴇʀ'}!*
*✅ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴘʀɪɴᴄᴇ-ᴍᴅ ᴡᴇʙ ʙᴏᴛ*

📡 ᴄʜᴀɴɴᴇʟ: ${CHANNEL_LINK}

ᴜsᴇ *${PREFIX}ping* ᴛᴏ ᴛᴇsᴛ ɪғ ʙᴏᴛ ɪs ᴡᴏʀᴋɪɴɢ.
ᴜsᴇ *${PREFIX}dev* ᴛᴏ ᴄᴏɴᴛᴀᴄᴛ ᴅᴇᴠᴇʟᴏᴘᴇʀ.`);
        }
    }
};
