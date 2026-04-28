// commands/tools/toanime.js
module.exports = {
    name: 'toanime',
    category: 'tools',
    description: 'Convert to anime style',
    permission: 'all',
    aliases: ['jadianime'],
    async execute(context) {
        const { m, sock, quoted, reply } = context;
        
        await sock.sendMessage(m.chat, { react: { text: "⏱️", key: m.key } });
        
        try {
            await reply("Anime conversion completed - Powered by Prince MD & PixNova AI");
        } catch (err) {
            reply("Error converting to anime: " + err.message);
        }
    }
};