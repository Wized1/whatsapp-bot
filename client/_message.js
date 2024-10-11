const Base = require('./_base');
const config = require('../config');
const ReplyMessage = require('./_reply');
const GroupManager = require('./misc/group');
const UserProfileManager = require('./chats');
const { decodeJid, createInteractiveMessage, parsedJid, writeExifWebp, isUrl } = require('../utils');
const { generateWAMessageFromContent, generateWAMessage, generateForwardMessageContent, getContentType } = require('baileys');
const fileType = require('file-type');
const fs = require('fs').promises;

/**
 * @class Message
 * @extends Base
 * @description Handles message operations in the chat application
 */
class Message extends Base {
 /**
  * @param {Object} client - The client object
  * @param {Object} data - The message data
  */
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);
  this.groupManager = new GroupManager(this.client, data);
  this.chatManager = new UserProfileManager(this.client, data);
  return new Proxy(this, {
   get: (target, prop) => {
    if (typeof target.groupManager[prop] === 'function') return (...args) => target.groupManager[prop](...args);
    if (typeof target.chatManager[prop] === 'function') return (...args) => target.chatManager[prop](...args);
    return target[prop];
   },
  });
 }

 /**
  * @private
  * @param {Object} data - The data to patch
  */
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

 /**
  * @param {string} jid - The JID to send the message to
  * @param {*} content - The content of the message
  * @param {Object} opt - Options for sending the message
  * @param {string} type - The type of message
  * @returns {Promise<Message>}
  */
 async sendMessage(jid, content, opt = { quoted: this.data }, type = 'text') {
  const sendMedia = (type, content, opt) => {
   const isBuffer = Buffer.isBuffer(content);
   const isUrl = typeof content === 'string' && content.startsWith('http');
   return this.client.sendMessage(opt.jid || this.jid, {
    [type]: isBuffer ? content : isUrl ? { url: content } : content,
    ...opt,
   });
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
   location: () => this.client.sendMessage(jid || this.jid, { location: content, ...opt }),
   contact: () => this.client.sendMessage(jid || this.jid, { contacts: { displayName: content.name, contacts: [{ vcard: content.vcard }] }, ...opt }),
  };

  const message = await (
   sendFunc[type.toLowerCase()] ||
   (() => {
    throw new Error('Unsupported message type');
   })
  )();
  return new Message(this.client, message);
 }

 /**
  * @param {string} text - The text to reply with
  * @param {Object} options - Options for the reply
  * @returns {Promise<Message>}
  */
 async reply(text, options = {}) {
  const message = await this.client.sendMessage(this.jid, { text, mentions: options.mentions }, { quoted: this.data, ...options });
  return new Message(this.client, message);
 }

 /**
  * @param {string} text - The new text for the message
  * @param {Object} opt - Options for editing the message
  * @returns {Promise<Object>}
  */
 async edit(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text, edit: this.key }, opt);
 }

 /**
  * @param {string} emoji - The emoji to react with
  * @returns {Promise<Object>}
  */
 async react(emoji) {
  return this.client.sendMessage(this.jid, { react: { text: emoji, key: this.key } });
 }

 /**
  * @param {*} content - The content to send
  * @param {Object} options - Options for sending the content
  * @returns {Promise<Message>}
  */
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

  const message = await this.sendMessage(jid, content, mergedOptions, type);
  message.reply = async (text, replyOptions = {}) => {
   const replyMessage = await this.client.sendMessage(jid, { text, mentions: replyOptions.mentions }, { quoted: message.data, ...replyOptions });
   return new Message(this.client, replyMessage);
  };

  return message;
 }

 /**
  * @param {string} jid - The JID to forward the message to
  * @param {Object} content - The content to forward
  * @param {Object} options - Options for forwarding the message
  * @returns {Promise<Object>}
  */
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

 /**
  * @param {string} jid - The JID to forward the message to
  * @param {Object} message - The message to forward
  * @param {Object} options - Options for forwarding the message
  * @returns {Promise<Object>}
  */
 async copyNForward(jid, message, options = {}) {
  const msg = generateWAMessageFromContent(jid, message, {
   ...options,
   userJid: this.client.user.id,
  });
  msg.message.contextInfo = options.contextInfo || {};
  await this.client.relayMessage(jid, msg.message, {
   messageId: msg.key.id,
   ...options,
  });
  return msg;
 }

 /**
  * @param {Object} message - The message containing the media
  * @returns {Promise<Buffer>}
  */
 async downloadMedia(message = this.message) {
  const type = Object.keys(message)[0];
  const mimeMap = {
   imageMessage: 'image',
   videoMessage: 'video',
   stickerMessage: 'sticker',
   documentMessage: 'document',
   audioMessage: 'audio',
  };

  const stream = await this.client.downloadContentFromMessage(message[type], mimeMap[type]);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
   buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
 }

 /**
  * @param {Buffer} buffer - The media buffer to upload
  * @returns {Promise<Object>}
  */
 async uploadMedia(buffer) {
  const { mime } = await fileType.fromBuffer(buffer);
  const filename = `upload_${Date.now()}.${mime.split('/')[1]}`;
  await fs.writeFile(filename, buffer);
  const media = await this.client.sendMedia(this.jid, { url: filename }, { filename });
  await fs.unlink(filename);
  return media;
 }

 /**
  * @param {string} question - The poll question
  * @param {string[]} options - The poll options
  * @param {boolean} isPublic - Whether the poll is public
  * @returns {Promise<Object>}
  */
 async pollMessage(question, options, isPublic = true) {
  return this.client.sendMessage(this.jid, {
   poll: {
    name: question,
    values: options,
    selectableCount: 1,
   },
   messageContextInfo: {
    messageSecret: isPublic ? undefined : this.client.generateMessageID(),
   },
  });
 }

 /**
  * @param {Object} key - The key of the message to delete
  * @returns {Promise<Object>}
  */
 async deleteMessage(key = this.key) {
  return this.client.sendMessage(this.jid, { delete: key });
 }
}

module.exports = Message;
