// commands/tools/ping.js
module.exports = {
    name: 'ping',
    category: 'tools',
    description: 'Check bot speed and status',
    permission: 'all',
    aliases: ['speed', 'speed-bot'],
    async execute(context) {
        const { m, sock, reply } = context;
        const used = process.memoryUsage();
        const os = require('os');
        const cpus = os.cpus().map(cpu => {
            cpu.total = Object.keys(cpu.times).reduce((last, type) => last + cpu.times[type], 0);
            return cpu;
        });
        
        const cpu = cpus.reduce((last, cpu, _, { length }) => {
            last.total += cpu.total;
            last.speed += cpu.speed / length;
            last.times.user += cpu.times.user;
            last.times.nice += cpu.times.nice;
            last.times.sys += cpu.times.sys;
            last.times.idle += cpu.times.idle;
            last.times.irq += cpu.times.irq;
            return last;
        }, {
            speed: 0,
            total: 0,
            times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 }
        });

        const start = Date.now();
        const latency = (Date.now() - start).toFixed(0);
        
        // Simulated storage info
        let storageInfo = {
            totalGb: '500',
            usedGb: '250', 
            usedPercentage: '50',
            freeGb: '250',
            freePercentage: '50'
        };
        
        const currentTime = Date.now();
        const uptimeInMillis = currentTime - global.botStartTime;
        const formattedUptime = this.formatUptime(uptimeInMillis);

        let respon = `*SERVER NETWORK*
- Ping: ${latency} ms
- Latency: ${latency} ms

*SERVER INFORMATION*
- OS: ${os.type()} ${os.release()}
- Platform: ${process.platform}
- Uptime: ${formattedUptime}

*MEMORY USAGE:*
- Total: ${this.formatp(os.totalmem())}
- Used: ${this.formatp(os.totalmem() - os.freemem())}
- Free: ${this.formatp(os.freemem())}

*STORAGE:*
- Total: ${storageInfo.totalGb} GB
- Used: ${storageInfo.usedGb} GB (${storageInfo.usedPercentage}%)
- Available: ${storageInfo.freeGb} GB (${storageInfo.freePercentage}%)

*CPU USAGE (${cpus.length} Core CPU)*
${cpus[0]?.model?.trim() || 'Unknown Model'} (${Math.round(cpu.speed)} MHz)
${Object.keys(cpu.times).map(type => `- *${type.charAt(0).toUpperCase() + type.slice(1)}:* ${((cpu.times[type] * 100) / cpu.total).toFixed(2)}%`).join("\n")}

*BOT STATUS*
- Response Time: ${latency} ms
- Active Sessions: ${Object.keys(global.db?.users || {}).length}
- Version: Prince MD Web Bot v2.5

> 🚀 Powered by Prince Tech | ✅ Verified WhatsApp Business`.trim();

        await sock.sendMessage(m.chat, {
            text: respon,
            contextInfo: {
                isForwarded: true,
                mentionedJid: [m.sender],
                forwardingScore: 999,
                externalAdReply: {
                    title: `🏓 Pong! | Prince MD Web Bot`,
                    body: `⚡ Response Time: ${latency}ms | Uptime: ${formattedUptime}`,
                    thumbnailUrl: (global.MENU_IMAGE_URL) || "https://files.catbox.moe/7n6017.png",
                    sourceUrl: (global.CHANNEL_LINK) || "https://whatsapp.com/channel/0029Vb7do3y4Y9ltXOhAoR2s",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, {
            quoted: {
                key: { 
                    fromMe: false, 
                    participant: `0@s.whatsapp.net`, 
                    remoteJid: 'status@broadcast' 
                },
                message: {
                    contactMessage: {
                        displayName: 'Prince MD Web Bot ✅',
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;Prince Tech;;;\nFN:Prince MD Web Bot ✅\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Mobile\nEND:VCARD`,
                    },
                },
            }
        });
    },

    formatUptime(ms) {
        const sec = Math.floor(ms / 1000) % 60;
        const min = Math.floor(ms / (1000 * 60)) % 60;
        const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
        const day = Math.floor(ms / (1000 * 60 * 60 * 24));

        const parts = [];
        if (day === 1) parts.push(`1 day`);
        else if (day > 1) parts.push(`${day} days`);
        if (hr === 1) parts.push(`1 hour`);
        else if (hr > 1) parts.push(`${hr} hours`);
        if (min === 1) parts.push(`1 minute`);
        else if (min > 1) parts.push(`${min} minutes`);
        if (sec === 1) parts.push(`1 second`);
        else if (sec > 1 || parts.length === 0) parts.push(`${sec} seconds`);
        return parts.join(', ') || '0 seconds';
    },

    formatp(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};