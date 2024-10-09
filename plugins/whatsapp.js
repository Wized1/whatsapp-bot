const { bot, parsedJid, localBuffer } = require('../utils');
const { getName, loadMessage, serialize } = require('../lib');
const { DELETED_LOG_CHAT, DELETED_LOG } = require('../config');

bot(
  {
    pattern: 'vv',
    fromMe: false,
    info: 'Downloads ViewOnce Messages',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    if (!m.quoted) return await message.reply('_Reply ViewOnce Message_');
    let buff = await m.quoted.copyNSave();
    const media = await localBuffer(buff);
    await message.reply('_Message Saved_');
    return await message.send(media, {
      jid: message.user,
      quoted: m.quoted,
    });
  }
);

bot(
  {
    pattern: 'setpp',
    fromMe: true,
    desc: 'Set profile picture',
    type: 'whatsapp',
  },
  async (message, match, m) => {
    if (!message.reply_message.image) return await message.reply('_Reply to a photo_');
    let buff = await m.quoted.download();
    await message.setPP(message.user, buff);
    return await message.reply('_Profile Picture Updated_');
  }
);

bot(
  {
    pattern: 'setname',
    fromMe: true,
    desc: 'Set User name',
    type: 'whatsapp',
  },
  async (message, match) => {
    if (!match) return await message.reply('_Enter name_');
    await message.updateName(match);
    return await message.reply(`_Your New name is : ${match}_`);
  }
);

bot(
  {
    pattern: 'block',
    fromMe: true,
    desc: 'Block a person',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    if (message.isGroup) {
      let jid = message.mention[0] || message.reply_message.jid;
      if (!jid) return await message.reply('_Reply to a person or mention_');
      await message.block(jid);
      return await message.sendMessage(`_@${jid.split('@')[0]} Blocked_`, {
        mentions: [jid],
      });
    } else {
      await client.sendMessage(message.jid, {
        text: '_Blocked_',
      });
      return await message.block(message.jid);
    }
  }
);

bot(
  {
    pattern: 'unblock',
    fromMe: true,
    desc: 'Unblock a person',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    if (message.isGroup) {
      let jid = message.mention[0] || message.reply_message.jid;
      if (!jid) return await message.reply('_Reply to a person or mention_');
      await message.block(jid);
      return await message.sendMessage(message.jid, `_@${jid.split('@')[0]} unblocked_`, {
        mentions: [jid],
      });
    } else {
      await message.unblock(message.jid);
      return await message.reply('_User unblocked_');
    }
  }
);

bot(
  {
    pattern: 'jid',
    fromMe: true,
    desc: 'Give jid of chat/user',
    type: 'whatsapp',
  },
  async (message, match) => {
    return await message.sendMessage(message.jid, message.mention[0] || message.reply_message.jid || message.jid);
  }
);

bot(
  {
    pattern: 'dlt ?(.*)',
    fromMe: true,
    desc: 'Deletes a message',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    if (!message.reply_message) return await message.reply('_Reply Message_');
    await client.sendMessage(message.jid, {
      delete: message.reply_message.key,
    });
  }
);

bot(
  {
    pattern: 'quoted',
    fromMe: false,
    desc: 'quoted message',
    type: 'whatsapp',
  },
  async (message, match) => {
    if (!message.reply_message) return await message.reply('*Reply to a message*');
    let key = message.reply_message.key;
    let msg = await loadMessage(key.id);
    if (!msg) return await message.reply('_Message not found maybe bot might not be running at that time_');
    msg = await serialize(JSON.parse(JSON.stringify(msg.message)), message.client);
    if (!msg.quoted) return await message.reply('No quoted message found');
    await message.copyNForward(message.jid, msg.quoted.message);
  }
);

bot(
  {
    pattern: 'save ?(.*)',
    fromMe: true,
    desc: 'Saves WhatsApp Status',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    if (!message.reply_message?.image && !message.reply_message.video && !message.reply_message.audio) return await message.reply('_Reply to a status message with media_');
    const relayOptions = {
      messageId: m.quoted.key.id,
      quoted: {
        key: m.quoted.key,
        message: m.quoted.message,
        participant: m.quoted.participant,
      },
    };
    return await client.relayMessage(message.user, m.quoted.message, relayOptions);
  }
);

bot(
  {
    pattern: 'forward ?(.*)',
    fromMe: false,
    desc: 'Forwards the replied message (any type) with quote',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    if (!m.quoted) return await message.reply('Reply to a message to forward');
    const jids = parsedJid(match);
    for (const jid of jids) {
      await client.relayMessage(jid, m.quoted.message, {
        messageId: m.quoted.key.id,
        quoted:
          {
            key: m.quoted.key,
            message: m.quoted.message,
            participant: m.quoted.participant,
          } || message.data,
      });
    }
    return message.reply('*_Message Forwarded_*');
  }
);

bot(
  {
    pattern: 'fullforward ?(.*)',
    fromMe: false,
    desc: 'Forwards the replied message (any type)',
    type: 'whatsapp',
  },
  async (message, match, m) => {
    if (!m.quoted) return await message.reply('Reply to a message to forward');
    let jids = parsedJid(match);
    for (const jid of jids) await message.forward(jid, m.quoted);
    return await message.reply('_Forwarded to ' + match + '_');
  }
);

bot(
  {
    pattern: 'edit ?(.*)',
    fromMe: true,
    desc: 'Edit message sent by the bot',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    if (!message.reply_message) return await message.reply('_Reply Message From You_');
    return await message.reply_message.edit(match, {
      key: message.reply_message.key,
    });
  }
);

bot(
  {
    on: 'delete',
    fromMe: false,
    desc: 'Logs the recent deleted message',
    dontAddCommandList: true,
  },
  async (message, match) => {
    if (!DELETED_LOG) return;
    if (!DELETED_LOG_CHAT) return await message.sendMessage(message.user, 'Please set DELETED_LOG_CHAT in ENV to use log delete message');
    let msg = await loadMessage(message.messageId);
    if (!msg) return;
    msg = await serialize(JSON.parse(JSON.stringify(msg.message)), message.client);
    if (!msg) return await message.reply('No deleted message found');
    let deleted = await message.forward(message.user, DELETED_LOG_CHAT, msg.message);
    var name;
    if (!msg.from.endsWith('@g.us')) {
      let getname = await getName(msg.from);
      name = `_Name : ${getname}_`;
    } else {
      let gname = (await message.client.groupMetadata(msg.from)).subject;
      let getname = await getName(msg.sender);
      name = `_Group : ${gname}_\n_Name : ${getname}_`;
    }
    return await message.sendMessage(DELETED_LOG_CHAT, `_Message Deleted_\n_From : ${msg.from}_\n${name}\n_SenderJid : ${msg.sender}_`, {
      quoted: deleted,
    });
  }
);

bot(
  {
    pattern: 'clear ?(.*)',
    fromMe: true,
    desc: 'delete whatsapp chat',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    await client.chatModify(
      {
        delete: true,
        lastMessages: [
          {
            key: message.data.key,
            messageTimestamp: message.timestamp,
          },
        ],
      },
      message.jid
    );
    await message.reply('_Cleared.._');
  }
);

bot(
  {
    pattern: 'archive ?(.*)',
    fromMe: true,
    desc: 'archive whatsapp chat',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    const lstMsg = {
      message: message.message,
      key: message.key,
      messageTimestamp: message.timestamp,
    };
    await client.chatModify(
      {
        archive: true,
        lastMessages: [lstMsg],
      },
      message.jid
    );
    await message.reply('_Archived.._');
  }
);

bot(
  {
    pattern: 'unarchive ?(.*)',
    fromMe: true,
    desc: 'unarchive whatsapp chat',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    const lstMsg = {
      message: message.message,
      key: message.key,
      messageTimestamp: message.timestamp,
    };
    await client.chatModify(
      {
        archive: false,
        lastMessages: [lstMsg],
      },
      message.jid
    );
    await message.reply('_Unarchived.._');
  }
);

bot(
  {
    pattern: 'pin',
    fromMe: true,
    desc: 'pin a chat',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    await client.chatModify(
      {
        pin: true,
      },
      message.jid
    );
    await message.reply('_Pined.._');
  }
);

bot(
  {
    pattern: 'unpin ?(.*)',
    fromMe: true,
    desc: 'unpin a msg',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    await client.chatModify(
      {
        pin: false,
      },
      message.jid
    );
    await message.reply('_Unpined.._');
  }
);

bot(
  {
    pattern: 'scall ?(.*)',
    fromMe: true,
    desc: 'Send a scheduled call message',
    type: 'whatsapp',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    if (!match) return await message.reply('*Need timeOut, title, and type!*\n_Example: .scall 1,Hello world,voice_');
    const [timeoutStr, title, callType] = match.split(',');
    if (!timeoutStr || !title || !callType) return await message.reply('*Need timeOut, title, and type!*\n_Example: .scall 1,Hello world,voice_');
    const timeout = parseInt(timeoutStr, 10);
    const scheduledTimestampMs = (Date.now() + timeout * 60000).toString();

    const scheduledCallMessage = {
      scheduledCallCreationMessage: {
        callType: callType.trim() === 'video' ? 2 : 1,
        title: title.trim(),
        scheduledTimestampMs,
      },
    };

    await client.relayMessage(message.jid, scheduledCallMessage, {});
  }
);
