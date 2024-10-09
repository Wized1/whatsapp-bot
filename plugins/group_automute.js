const { bot } = require('../utils');

class MuteManager {
  constructor() {
    this.groupMuteStatus = {}; // In-memory store for mute status by group ID
  }

  muteGroup(groupId, duration) {
    this.groupMuteStatus[groupId] = {
      muted: true,
      duration: duration * 60 * 1000, // Convert minutes to milliseconds
      timestamp: Date.now(),
    };
    return this.groupMuteStatus[groupId];
  }

  unmuteGroup(groupId) {
    delete this.groupMuteStatus[groupId];
  }

  isGroupMuted(groupId) {
    return this.groupMuteStatus[groupId]?.muted || false;
  }

  getRemainingTime(groupId) {
    const muteInfo = this.groupMuteStatus[groupId];
    if (!muteInfo) return null;
    const remainingTime = muteInfo.duration - (Date.now() - muteInfo.timestamp);
    return remainingTime > 0 ? remainingTime : null;
  }
}

const muteManager = new MuteManager();

const isAdmin = async (jid, message, client) => {
  const metadata = await client.groupMetadata(message.jid).catch(() => null);
  return metadata?.participants.some((p) => p.id === jid && p.admin) || false;
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

    const isAdminUser = await isAdmin(message.from, message, client);
    if (!isAdminUser) return message.reply('_Only admins can mute the group._');

    const muteDuration = match[1] ? parseInt(match[1], 10) : null; // Get the duration from the command
    if (!muteDuration || isNaN(muteDuration) || muteDuration <= 0) {
      return message.reply('_Please provide a valid mute duration in minutes._');
    }

    // Mute the group by updating group settings
    await client.groupSettingUpdate(message.jid, 'announcement'); // Set group to announcement mode
    const muteInfo = muteManager.muteGroup(message.jid, muteDuration);
    message.reply(`_Group will be muted for ${muteDuration} minutes._`);

    // Automatically unmute after the specified duration
    setTimeout(async () => {
      muteManager.unmuteGroup(message.jid);
      await client.groupSettingUpdate(message.jid, 'public'); // Set group back to public mode
      client.sendMessage(message.jid, '_Group has been unmuted._', { quoted: message });
    }, muteInfo.duration);
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

    const isAdminUser = await isAdmin(message.from, message, client);
    if (!isAdminUser) return message.reply('_Only admins can unmute the group._');

    muteManager.unmuteGroup(message.jid); // Remove mute status
    await client.groupSettingUpdate(message.jid, 'public'); // Set group back to public mode
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

    const isMuted = muteManager.isGroupMuted(message.jid);
    if (isMuted) {
      const remainingTime = muteManager.getRemainingTime(message.jid);
      if (remainingTime) {
        message.reply(`_Group is currently muted. Remaining time: ${Math.ceil(remainingTime / 60000)} minutes._`);
      } else {
        message.reply('_Group is currently unmuted._');
      }
    } else {
      message.reply('_Group is currently unmuted._');
    }
  }
);
