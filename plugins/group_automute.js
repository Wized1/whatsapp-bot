const { bot } = require('../utils');
const moment = require('moment');
const cron = require('node-cron');

class MuteManager {
  constructor() {
    this.mutedGroups = new Set();
    this.scheduledTasks = {};
  }

  muteGroup(groupId) {
    this.mutedGroups.add(groupId);
  }

  unmuteGroup(groupId) {
    this.mutedGroups.delete(groupId);
  }

  isGroupMuted(groupId) {
    return this.mutedGroups.has(groupId);
  }

  scheduleTask(groupId, time, task) {
    this.clearScheduledTask(groupId);
    const cronTime = time.format('m H * * *');
    this.scheduledTasks[groupId] = cron.schedule(cronTime, task);
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

const parseTime = (inputTime) => {
  const now = moment();
  const time = moment(inputTime, 'hh:mm A', true);
  if (!time.isValid()) return null;

  time.year(now.year()).month(now.month()).date(now.date());
  if (time.isBefore(now)) time.add(1, 'days');

  return time;
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
    if (!inputTime) return message.reply('_Please provide a time in the format HH:mm AM/PM._');

    const muteTime = parseTime(inputTime);
    if (!muteTime) return message.reply('_Please provide a valid time in the format HH:mm AM/PM._');

    muteManager.scheduleTask(message.jid, muteTime, async () => {
      await client.groupSettingUpdate(message.jid, 'announcement');
      muteManager.muteGroup(message.jid);
      client.sendMessage(message.jid, '_Group has been muted._');
    });

    message.reply(`_Group will be muted at ${muteTime.format('hh:mm A')}._`);
  }
);

bot(
  {
    pattern: 'autounmute',
    fromMe: false,
    desc: 'Unmute group and clear scheduled mute',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return message.reply('_For Groups Only!_');
    if (!(await isAdmin(message.user, message, client))) return message.reply("I'm not an admin.");

    muteManager.unmuteGroup(message.jid);
    muteManager.clearScheduledTask(message.jid);
    await client.groupSettingUpdate(message.jid, 'not_announcement');
    message.reply('_Group has been unmuted and scheduled mute cleared._');
  }
);

bot(
  {
    pattern: 'mutestatus',
    fromMe: false,
    desc: 'Get AutoMute status for group',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return message.reply('_For Groups Only!_');

    const isMuted = muteManager.isGroupMuted(message.jid);
    const status = isMuted ? 'muted' : 'unmuted';
    message.reply(`_Group is currently ${status}._`);
  }
);
