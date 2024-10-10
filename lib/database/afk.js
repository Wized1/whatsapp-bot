const config = require('../../config');

// Define AFK table structure
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

// Set of users who have already received an AFK response
const respondedUsers = new Set();

// Set user as AFK
async function setAFK(userId, reason = null) {
  await AFK.upsert({
    userId,
    isAfk: true,
    reason,
    lastSeen: Math.floor(Date.now() / 1000),
  });
  respondedUsers.clear();
}

// Clear user's AFK status
async function clearAFK(userId) {
  await AFK.update({ isAfk: false, reason: null, lastSeen: 0 }, { where: { userId } });
  respondedUsers.clear();
}

// Get AFK message for a user
async function getAFKMessage(userId) {
  const afkData = await AFK.findByPk(userId);
  if (!afkData || !afkData.isAfk) return null;

  const timePassed = afkData.lastSeen ? secondsToHms(Math.floor(Date.now() / 1000) - afkData.lastSeen) : '';
  return `I'm currently away from keyboard.${afkData.reason ? `\n*Reason:* \`\`\`${afkData.reason}\`\`\`` : ''}${timePassed ? `\n*Last Seen:* \`\`\`${timePassed} ago\`\`\`` : ''}`;
}

// Check if we should respond to a user
function shouldRespond(jid) {
  if (!respondedUsers.has(jid)) {
    respondedUsers.add(jid);
    return true;
  }
  return false;
}

function secondsToHms(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const hDisplay = h > 0 ? `${h} ${h === 1 ? 'hour' : 'hours'}` : '';
  const mDisplay = m > 0 ? `${m} ${m === 1 ? 'minute' : 'minutes'}` : '';
  const sDisplay = s > 0 ? `${s} ${s === 1 ? 'second' : 'seconds'}` : '';

  return [hDisplay, mDisplay, sDisplay].filter(Boolean).join(', ');
}

module.exports = {
  setAFK,
  clearAFK,
  getAFKMessage,
  shouldRespond,
  secondsToHms,
};
