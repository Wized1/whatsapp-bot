const Base = require('./base');
const config = require('../config');
const ReplyMessage = require('./message_reply');
const GroupManager = require('./group_manager');
const UserProfileManager = require('./chats_manager');
const { decodeJid, createInteractiveMessage, parsedJid, writeExifWebp, isUrl } = require('../utils');
const { generateWAMessageFromContent, generateWAMessage, generateForwardMessageContent, getContentType } = require('baileys');
const fileType = require('file-type');

class Message extends Base {
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);

  this.groupManager = new GroupManager(this.client, data);
  this.chatManger = new UserProfileManager(this.client, data);

  return new Proxy(this, {
   get(target, prop) {
    if (typeof target.groupManager[prop] === 'function') {
     return (...args) => target.groupManager[prop](...args);
    }
    return target[prop];
   },
   get(target, prop) {
    if (typeof target.chatManger[prop] === 'function') {
     return (...args) => target.chatManger[prop](...args);
    }
    return target[prop];
   },
  });
 }

 _patch(data) {
  const { key, isGroup, message, pushName, messageTimestamp, quoted } = data;
  const contextInfo = message?.extendedTextMessage?.contextInfo;
  const senderID = contextInfo?.participant || key.remoteJid;

  Object.assign(this, {
   data,
   user: decodeJid(this.client.user.id),
   key,
   isGroup,
   prefix: config.HANDLERS.replace(/[\[\]]/g, ''),
   id: key.id,
   jid: key.remoteJid,
   chat: key.remoteJid,
   senderID,
   message: { key, message },
   pushName,
   sender: pushName,
   participant: parsedJid(data.sender)[0],
   sudo: config.SUDO.split(',').includes(this.participant?.split('@')[0]) || false,
   text: data.body,
   fromMe: key.fromMe,
   timestamp: messageTimestamp.low || messageTimestamp,
   mention: contextInfo?.mentionedJid || false,
   isOwner: key.fromMe || this.sudo,
   messageType: Object.keys(message)[0],
   isViewOnce: Boolean(message.viewOnceMessage),
  });

  if (quoted && !message.buttonsResponseMessage) {
   this.reply_message = new ReplyMessage(this.client, contextInfo, quoted);
   Object.assign(this.reply_message, {
    type: quoted.type || 'extendedTextMessage',
    mtype: quoted.mtype,
    key: quoted.key,
    mention: quoted.message.extendedTextMessage?.contextInfo?.mentionedJid || false,
    sender: contextInfo?.participant || quoted.key.remoteJid,
    senderNumber: (contextInfo?.participant || quoted.key.remoteJid)?.split('@')[0] || false,
   });
  } else {
   this.reply_message = false;
  }

  if (message.stickerMessage) this.sticker = true;
  if (message.videoMessage) this.video = message.videoMessage;
  if (message.imageMessage) this.image = message.imageMessage;

  return super._patch(data);
 }

 async sendMessage(jid, content, opt = { quoted: this.data }, type = 'text') {
  const sendMedia = (type, content, opt = { quoted: this.data }) => {
   const isBuffer = Buffer.isBuffer(content);
   const isUrl = typeof content === 'string' && content.startsWith('http');
   return this.client.sendMessage(opt.jid || this.jid, { [type]: isBuffer ? content : isUrl ? { url: content } : content, ...opt });
  };

  const sendFunc = {
   text: () => this.client.sendMessage(jid || this.jid, { text: content, ...opt }),
   image: () => sendMedia('image', content, opt),
   video: () => sendMedia('video', content, opt),
   audio: () => sendMedia('audio', content, opt),
   template: async () => {
    const msg = await generateWAMessage(jid || this.jid, content, opt);
    return this.client.relayMessage(jid || this.jid, { viewOnceMessage: { message: { ...msg.message } } }, { messageId: msg.key.id });
   },
   interactive: async () => {
    const msg = createInteractiveMessage(content);
    return this.client.relayMessage(jid || this.jid, msg.message, { messageId: msg.key.id });
   },
   sticker: async () => {
    const { data, mime } = await this.client.getFile(content);
    if (mime === 'image/webp') {
     const buff = await writeExifWebp(data, opt);
     return this.client.sendMessage(jid || this.jid, { sticker: { url: buff }, ...opt }, opt);
    }
    return this.client.sendImageAsSticker(this.jid, content, opt);
   },
   document: () => sendMedia('document', content, { ...opt, mimetype: opt.mimetype || 'application/octet-stream' }),
   pdf: () => sendMedia('document', content, { ...opt, mimetype: 'application/pdf' }),
  };

  return (
   sendFunc[type.toLowerCase()] ||
   (() => {
    throw new Error('Unsupported message type');
   })
  )();
 }

 async reply(text, options = {}) {
  let messageContent = { text };
  if (options.mentions) {
   messageContent.mentions = options.mentions;
  }
  const message = await this.client.sendMessage(this.jid, messageContent, { quoted: this.data, ...options });
  return new Message(this.client, message);
 }

 async edit(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text, edit: this.key }, opt);
 }

 async react(emoji) {
  return this.client.sendMessage(this.jid, { react: { text: emoji, key: this.key } });
 }

 async send(content, options = { quoted: this.data }) {
  const jid = this.jid || options.jid;
  if (!jid) throw new Error('JID is required to send a message.');

  const detectType = async (content) => {
   if (typeof content === 'string') return isUrl(content) ? (await fetch(content, { method: 'HEAD' })).headers.get('content-type')?.split('/')[0] : 'text';
   if (Buffer.isBuffer(content)) return (await fileType.fromBuffer(content))?.mime?.split('/')[0] || 'text';
   return 'text';
  };
  const type = options.type || (await detectType(content));
  const mergedOptions = { packname: 'ғxᴏᴘ-ᴍᴅ', author: 'ᴀsᴛʀᴏ', quoted: this.data, ...options };

  return this.sendMessage(jid, content, mergedOptions, type);
 }
 async forward(jid, content, options = {}) {
  if (options.readViewOnce) {
   content = content?.ephemeralMessage?.message || content;
   const viewOnceKey = Object.keys(content)[0];
   delete content?.ignore;
   delete content?.viewOnceMessage?.message?.[viewOnceKey]?.viewOnce;
   content = { ...content?.viewOnceMessage?.message };
  }

  if (options.mentions) {
   content[getContentType(content)].contextInfo.mentionedJid = options.mentions;
  }

  const forwardContent = generateForwardMessageContent(content, false);
  const contentType = getContentType(forwardContent);

  const forwardOptions = {
   ptt: options.ptt,
   waveform: options.audiowave,
   seconds: options.seconds,
   fileLength: options.fileLength,
   caption: options.caption,
   contextInfo: options.contextInfo,
  };

  if (options.mentions) {
   forwardOptions.contextInfo.mentionedJid = options.mentions;
  }

  if (contentType !== 'conversation') {
   forwardOptions.contextInfo = content?.message[contentType]?.contextInfo || {};
  }

  forwardContent[contentType].contextInfo = {
   ...forwardOptions.contextInfo,
   ...forwardContent[contentType]?.contextInfo,
  };

  const waMessage = generateWAMessageFromContent(jid, forwardContent, {
   ...forwardContent[contentType],
   ...forwardOptions,
  });
  return await this.client.relayMessage(jid, waMessage.message, {
   messageId: waMessage.key.id,
  });
 }

 async copyNForward(jid, message, options = {}) {
  const msg = generateWAMessageFromContent(jid, message, { ...options, userJid: this.client.user.id });
  msg.message.contextInfo = options.contextInfo || msg.message.contextInfo;
  await this.client.relayMessage(jid, msg.message, { messageId: msg.key.id, ...options });
  return msg;
 }
}

module.exports = Message;
