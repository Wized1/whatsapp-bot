const config = require('../../config');
const AFK = config.DATABASE.define('AFK', {
  userId: {
    type: config.DATABASE.STRING,
    primaryKey: true,
  },
  isAfk: {
    type: config.DATABASE.BOOLEAN,
    defaultValue: false,
  },
  reason: {
    type: config.DATABASE.STRING,
    allowNull: true,
  },
  lastSeen: {
    type: config.DATABASE.INTEGER,
    defaultValue: 0,
  },
});

class AFKManager {
  constructor() {
    this.respondedUsers = new Set();
  }

  async setAFK(userId, reason = null) {
    await AFK.upsert({
      userId,
      isAfk: true,
      reason,
      lastSeen: Math.floor(Date.now() / 1000),
    });
    this.respondedUsers.clear();
  }

  async clearAFK(userId) {
    await AFK.update({ isAfk: false, reason: null, lastSeen: 0 }, { where: { userId } });
    this.respondedUsers.clear();
  }

  async getAFKMessage(userId) {
    const afkData = await AFK.findByPk(userId);
    if (!afkData || !afkData.isAfk) return null;

    const timePassed = afkData.lastSeen ? this.secondsToHms(Math.floor(Date.now() / 1000) - afkData.lastSeen) : '';
    return `I'm currently away from keyboard.${afkData.reason ? `\n*Reason:* \`\`\`${afkData.reason}\`\`\`` : ''}${timePassed ? `\n*Last Seen:* \`\`\`${timePassed} ago\`\`\`` : ''}`;
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

module.exports = { AFKManager, AFK };
