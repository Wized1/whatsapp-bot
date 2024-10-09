const { bot } = require('../utils');

class AFKManager {
  constructor() {
    this.isAfk = false;
    this.reason = null;
    this.lastSeen = 0;
    this.respondedUsers = new Set();
  }

  setAFK(reason = null) {
    this.isAfk = true;
    this.reason = reason;
    this.lastSeen = Math.floor(Date.now() / 1000);
    this.respondedUsers.clear();
  }

  clearAFK() {
    this.isAfk = false;
    this.reason = null;
    this.lastSeen = 0;
    this.respondedUsers.clear();
  }

  getAFKMessage() {
    const timePassed = this.lastSeen ? this.secondsToHms(Math.floor(Date.now() / 1000) - this.lastSeen) : '';
    return `I'm currently away from keyboard.${this.reason ? `\n*Reason:* \`\`\`${this.reason}\`\`\`` : ''}${timePassed ? `\n*Last Seen:* \`\`\`${timePassed} ago\`\`\`` : ''}`;
  }

  shouldRespond(jid) {
    if (!this.respondedUsers.has(jid)) {
      this.respondedUsers.add(jid);
      return true;
    }
    return false;
  }

  secondsToHms(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const hDisplay = h > 0 ? `${h} ${h === 1 ? 'hour' : 'hours'}` : '';
    const mDisplay = m > 0 ? `${m} ${m === 1 ? 'minute' : 'minutes'}` : '';
    const sDisplay = s > 0 ? `${s} ${s === 1 ? 'second' : 'seconds'}` : '';

    return [hDisplay, mDisplay, sDisplay].filter(Boolean).join(', ');
  }
}

const afkManager = new AFKManager();

bot(
  {
    on: 'text',
    fromMe: false,
    dontAddCommandList: true,
  },
  async (message, match) => {
    if (!afkManager.isAfk) return;

    const isGroup = message.jid.includes('@g.us');
    const isMentioned = message.mention && message.mention.includes(message.client.user.id.split('@')[0]);
    const isReply = message.reply_message && message.reply_message.participant === message.client.user.id;

    if (!isGroup || isMentioned || isReply) {
      const respondToJid = isGroup ? message.participant : message.jid;
      if (afkManager.shouldRespond(respondToJid)) {
        console.log(`Sending AFK message to ${respondToJid}`);
        await message.reply(afkManager.getAFKMessage());
      }
    }
  }
);

bot(
  {
    on: 'text',
    fromMe: true,
    dontAddCommandList: true,
  },
  async (message, match) => {
    if (afkManager.isAfk && !message.id.startsWith('3EB0') && message.fromMe) {
      afkManager.clearAFK();
      await message.send("```Afk Off, I'm Online Now```");
    }
  }
);

bot(
  {
    pattern: 'afk ?(.*)',
    fromMe: true,
    desc: 'Sets your status as away from keyboard (AFK).',
    type: 'user',
  },
  async (message, match) => {
    if (!afkManager.isAfk) {
      afkManager.setAFK(match || null);
      await message.send(`\`\`\`Afk Activated!\`\`\``);
    }
  }
);
