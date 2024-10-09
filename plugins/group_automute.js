const config = require('../config');
const { bot } = require('../utils');
const moment = require('moment');
const cron = require('node-cron');

class MuteManager {
  constructor() {
    this.groupMuteStatus = {};
    this.scheduledTasks = {}; // Store scheduled cron jobs
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

  scheduleMute(groupId, muteTime) {
    const cronTime = muteTime.format('m H * * *'); 
    this.clearScheduledTask(groupId);

    this.scheduledTasks[groupId] = cron.schedule(cronTime, async () => {
      await client.groupSettingUpdate(groupId, 'announcement');
      this.muteGroup(groupId);
      client.sendMessage(groupId, '_Group has been muted._');
    });
  }

  scheduleUnmute(groupId) {
    const unmuteTime = moment().add(1, 'days').set({ hour: 0, minute: 0 }); // Set to the next day

    const cronTime = unmuteTime.format('m H * * *');

    this.scheduledTasks[groupId] = cron.schedule(cronTime, async () => {
      this.unmuteGroup(groupId);
      await client.groupSettingUpdate(groupId, 'public');
      client.sendMessage(groupId, '_Group has been unmuted._');
    });
  }

  clearScheduledTask(groupId) {
    if (this.scheduledTasks[groupId]) {
      this.scheduledTasks[groupId].stop();
      delete this.scheduledTasks[groupId];
    }
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
    const now = moment();
    const muteTime = moment(inputTime, 'hh:mm A');

    if (!muteTime.isValid()) {
      return message.reply('_Please provide a valid time in the format HH:mm AM/PM._');
    }

    if (muteTime.isBefore(now)) {
      muteTime.add(1, 'days');
    }

    muteManager.scheduleMute(message.jid, muteTime);
    message.reply(`_Group will be muted at ${muteTime.format('hh:mm A')}._`);
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
    muteManager.clearScheduledTask(message.jid);
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
