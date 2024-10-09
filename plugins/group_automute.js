const { bot } = require('../utils');

const groupMuteStatus = {}; // In-memory store for mute status by group ID

const isAdmin = async (jid, message, client) => {
  const metadata = await client.groupMetadata(message.jid).catch(() => null);
  return metadata?.participants.find((p) => p.id === jid)?.admin || false;
};

bot(
  {
    pattern: 'automute ?(.*)',
    fromMe: false,
    desc: 'Set AutoMute for group',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return message.reply('_For Groups Only!_');

    const isAdminUser = await isAdmin(message.fromMe, message, client);
    if (!isAdminUser) return message.reply('_Only admins can mute the group._');

    const muteDuration = match[1] ? parseInt(match[1], 10) : null; // Get the duration from the command
    if (!muteDuration || isNaN(muteDuration) || muteDuration <= 0) {
      return message.reply('_Please provide a valid mute duration in minutes._');
    }

    groupMuteStatus[message.jid] = { muted: true, duration: muteDuration * 60 * 1000 }; // Store mute state in milliseconds
    message.reply(`_Group will be muted for ${muteDuration} minutes._`);

    // Automatically unmute after the specified duration
    setTimeout(() => {
      delete groupMuteStatus[message.jid];
      client.sendMessage(message.jid, '_Group has been unmuted._', { quoted: message });
    }, groupMuteStatus[message.jid].duration);
  }
);

bot(
  {
    pattern: 'autounmute ?(.*)',
    fromMe: false,
    desc: 'Set AutoUnmute for group',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return message.reply('_For Groups Only!_');

    const isAdminUser = await isAdmin(message.fromMe, message, client);
    if (!isAdminUser) return message.reply('_Only admins can unmute the group._');

    delete groupMuteStatus[message.jid]; // Remove mute status
    message.reply('_Group has been unmuted._');
  }
);

bot(
  {
    pattern: 'getmute ?(.*)',
    fromMe: false,
    desc: 'Get AutoMute status for group',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return message.reply('_For Groups Only!_');

    const isMuted = groupMuteStatus[message.jid]?.muted || false;
    if (isMuted) {
      const remainingTime = groupMuteStatus[message.jid].duration;
      message.reply(`_Group is currently muted. Remaining time: ${Math.ceil(remainingTime / 60000)} minutes._`);
    } else {
      message.reply('_Group is currently unmuted._');
    }
  }
);
