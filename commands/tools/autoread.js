// commands/tools/autoread.js
module.exports = {
    name: 'autoread',
    category: 'tools',
    description: 'Auto-read mode',
    permission: 'owner',
    aliases: ['readmode'],
    async execute(context) {
        const { m, sock, args, reply } = context;
        
        if (args[0] === "on") {
            reply(`Auto-read mode activated - Prince MD`);
        } else if (args[0] === "off") {
            reply(`Auto-read mode deactivated - Prince MD`);
        } else {
            reply(`Usage: autoread on/off`);
        }
    }
};