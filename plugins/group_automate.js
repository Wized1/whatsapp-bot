const { bot } = require('../utils');
const { getAntiLink, setAntiLink, deleteAntiLink, AntiWord, addAntiWord, getAntiWords } = require('../lib');

const isAdmin = async (jid, message, client) => {
  const metadata = await client.groupMetadata(message.jid).catch(() => null);
  return metadata?.participants.find((p) => p.id === jid)?.admin || false;
};

bot(
  {
    pattern: 'antilink ?(.*)',
    fromMe: true,
    desc: 'Set AntiLink on | off | delete | kick',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    if (!(await isAdmin(message.user, message, client))) return message.reply("I'm not an admin.");
    const cmd = match.trim().toLowerCase();
    if (!cmd) {
      const settings = await getAntiLink(message.jid);
      return message.reply(settings ? `AntiLink: ${settings.mode}` : 'AntiLink is off.');
    }
    if (cmd === 'off') {
      await deleteAntiLink(message.jid);
      return message.reply('AntiLink turned off.');
    }
    const mode = ['on', 'delete'].includes(cmd) ? 'delete' : cmd === 'kick' ? 'kick' : null;
    if (!mode) return message.reply('Use: antilink on/off/delete/kick');
    await setAntiLink(message.jid, mode);
    return await message.reply(`AntiLink set to ${mode}.`);
  }
);

bot(
  {
    on: 'text',
    fromMe: false,
    dontAddCommandList: true,
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return;
    const settings = await getAntiLink(message.jid);
    if (!settings) return;
    const isUserAdmin = await isAdmin(message.participant, message, client);
    if (isUserAdmin) return;
    const hasLink = /(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+/gi.test(message.text);
    if (hasLink) {
      await client.sendMessage(message.jid, {
        delete: message.key,
      });
      if (settings.mode === 'kick') {
        await client.groupParticipantsUpdate(message.jid, [message.participant], 'remove');
        message.reply(`@${message.participant.split('@')[0]} removed for sending a link.`, {
          mentions: [message.participant],
        });
      } else {
        message.reply(`@${message.participant.split('@')[0]}, links are not allowed.`, {
          mentions: [message.participant],
        });
      }
    }
  }
);

bot(
  {
    pattern: 'antiword ?(.*)',
    fromMe: true,
    desc: 'Add or remove forbidden words',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    if (!(await isAdmin(message.user, message, client))) return message.reply("I'm not an admin.");
    const args = match
      .trim()
      .toLowerCase()
      .split(/[,\s]+/)
      .filter(Boolean);
    if (args.length === 0) {
      const words = await getAntiWords(message.jid);
      return message.reply(words.length > 0 ? `Forbidden words: ${words.join(', ')}` : 'No forbidden words set.');
    }
    if (args[0] === 'off') {
      await AntiWord.destroy({
        where: {
          groupJid: message.jid,
        },
      });
      return message.reply('*AntiWord feature turned off.*\n_All forbidden words removed._');
    }
    let added = [];
    let existing = [];
    let failed = [];
    for (const word of args) {
      const result = await addAntiWord(message.jid, word);
      if (result === true) added.push(word);
      else if (result === 'exists') existing.push(word);
      else failed.push(word);
    }
    let response = '';
    if (added.length) response += `*Added: ${added.join(', ')}*\n`;
    if (existing.length) response += `*Already exists: ${existing.join(', ')}*\n`;
    if (failed.length) response += `Failed to add: ${failed.join(', ')}`;
    return message.reply(response.trim() || '*No changes made to the forbidden words list.*');
  }
);

bot(
  {
    on: 'text',
    fromMe: false,
    dontAddCommandList: true,
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return;
    if (await isAdmin(message.participant, message, client)) return;
    const antiWords = await getAntiWords(message.jid);
    const messageText = message.text.toLowerCase();
    for (const word of antiWords) {
      if (messageText.includes(word)) {
        await client.sendMessage(message.jid, {
          delete: message.key,
        });
        return message.reply(`_@${message.participant.split('@')[0]}, your message was deleted for using a forbidden word._`, {
          mentions: [message.participant],
          text: `_@${message.participant.split('@')[0]}, your message was deleted for using a forbidden word._`,
        });
      }
    }
  }
);
