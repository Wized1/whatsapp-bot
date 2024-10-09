const { bot } = require('../utils');
const { getAutoReactSettings, setAutoReactSettings } = require('../lib');

bot(
  {
    pattern: 'autoreact ?(.*)',
    fromMe: true,
    desc: 'Set auto-react on/off and choose emojis',
    type: 'misc',
  },
  async (message, match, m, client) => {
    const args = match.trim().split(/\s+/);
    const command = args[0]?.toLowerCase();

    if (!command) {
      const settings = await getAutoReactSettings(message.jid);
      return message.reply(`Auto-react is currently ${settings.isEnabled ? 'ON' : 'OFF'}. Current emojis: ${settings.emojis.join(', ')}`);
    }
    if (command === 'on' || command === 'off') {
      const isEnabled = command === 'on';
      const emojis = args
        .slice(1)
        .join('')
        .split(/[,\s]+/)
        .filter((emoji) => emoji.trim());
      const settings = await setAutoReactSettings(message.jid, isEnabled, emojis.length > 0 ? emojis : null);
      return message.reply(`Auto-react turned ${isEnabled ? 'ON' : 'OFF'}. Current emojis: ${settings.emojis.join(', ')}`);
    }
    return message.reply('Usage: .autoreact on/off [emoji1,emoji2,...]');
  }
);

bot(
  {
    on: 'text',
    fromMe: false,
  },
  async (message, match, m, client) => {
    const settings = await getAutoReactSettings(message.jid);
    if (settings.isEnabled && settings.emojis.length > 0) {
      const randomEmoji = settings.emojis[Math.floor(Math.random() * settings.emojis.length)];
      await message.react(randomEmoji);
    }
  }
);
