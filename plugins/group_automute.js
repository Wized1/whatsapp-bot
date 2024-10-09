const config = require('../config');
const { bot } = require('../utils');
const moment = require('moment-timezone');

class MuteManager {
  constructor() {
    this.groupMuteStatus = {};
  }

  muteGroup(groupId) {
    this.groupMuteStatus[groupId] = {
      muted: true,
      timestamp: Date.now(),
    };
  }

  unmuteGroup(groupId) {
    delete this.groupMuteStatus[groupId];
  }

  isGroupMuted(groupId) {
    return this.groupMuteStatus[groupId]?.muted || false;
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
    if (!(await isAdmin(message.user, message, client))) return message.reply("I'm not an admin.");

    const inputTime = match[1];
    const now = moment().tz(config.TIME_ZONE);
    const muteTime = moment.tz(inputTime, 'hh:mm A', config.TIME_ZONE);

    if (!muteTime.isValid()) {
      return message.reply('_Please provide a valid time in the format HH:mm AM/PM._');
    }
    if (muteTime.isBefore(now)) {
      muteTime.add(1, 'days');
    }
    const delay = muteTime.diff(now);
    await client.groupSettingUpdate(message.jid, 'announcement');
    muteManager.muteGroup(message.jid);
    message.reply(`_Group will be muted at ${muteTime.format('hh:mm A')} in your timezone._`);
    setTimeout(async () => {
      muteManager.unmuteGroup(message.jid);
      await client.groupSettingUpdate(message.jid, 'public');
      client.sendMessage(message.jid, '_Group has been unmuted._', { quoted: message });
    }, delay);
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
    if (!(await isAdmin(message.user, message, client))) return message.reply("I'm not an admin.");
    muteManager.unmuteGroup(message.jid);
    await client.groupSettingUpdate(message.jid, 'public');
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
      message.reply('_Group is currently muted._');
    } else {
      message.reply('_Group is currently unmuted._');
    }
  }
);
