const Base = require('./_base');
const fileType = require('file-type');
const config = require('../config');
const { decodeJid, createInteractiveMessage, parsedJid, writeExifWebp, isUrl } = require('../utils');
const { generateWAMessage, getContentType } = require('baileys');

class Message extends Base {
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);
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
      prefix: config.PREFIX.replace(/[\[\]]/g, ''),
      id: key.id,
      jid: key.remoteJid,
      chat: key.remoteJid,
      senderID,
      message: {
        key,
        message,
      },
      pushName,
      sender: pushName,
      participant: data.sender ? parsedJid(data.sender.toString())[0] : undefined,
      sudo: config.SUDO.split(',').includes(this.participant?.split('@')[0]) || false,
      text: data.body,
      fromMe: key.fromMe,
      timestamp: messageTimestamp.low || messageTimestamp,
      mention: contextInfo?.mentionedJid || false,
      isOwner: key.fromMe || this.sudo,
      messageType: Object.keys(message)[0],
      isBot: this.#checkIfBot(key.id),
  });

  if (quoted && !message.buttonsResponseMessage) {
   this.reply_message = this.createReplyMessage(contextInfo, quoted);
  } else {
   this.reply_message = false;
  }

  if (message.stickerMessage) this.sticker = true;
  if (message.videoMessage) this.video = message.videoMessage;
  if (message.imageMessage) this.image = message.imageMessage;

  return super._patch(data);
 }

 createReplyMessage(contextInfo, quoted) {
  const replyMsg = new Message(this.client, contextInfo);
  Object.assign(replyMsg, {
   type: quoted.type || 'extendedTextMessage',
   mtype: quoted.mtype,
   key: quoted.key,
   mention: quoted.message.extendedTextMessage?.contextInfo?.mentionedJid || false,
   sender: contextInfo?.participant || quoted.key.remoteJid,
   senderNumber: (contextInfo?.participant || quoted.key.remoteJid)?.split('@')[0] || false,
  });
  return replyMsg;
 }

 #checkIfBot(id) {
  if (!id) return false;
  return id.startsWith('BAE5') || id.length === 16 || id.length === 15;
 }

 async sendMessage(jid, content, opt = { quoted: this.data }, type = 'text') {
  const sendMedia = (type, content, opt = { quoted: this.data }) => {
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

 async reply(text, options = {}) {
  let messageContent = { text };
  if (options.mentions) messageContent.mentions = options.mentions;
  const message = await this.client.sendMessage(this.jid, messageContent, { quoted: this.data, ...options });
  return new Message(this.client, message);
 }

 async edit(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text, edit: this.key, ...opt });
 }

 async react(emoji) {
  return this.client.sendMessage(this.jid, { react: { text: emoji, key: this.key } });
 }

 async send(content, options = { quoted: this.data }) {
  const jid = this.jid || options.jid;
  if (!jid) throw new Error('JID is required to send a message.');

  const detectType = async (content) => {
   if (typeof content === 'string') {
    return isUrl(content) ? (await fetch(content, { method: 'HEAD' })).headers.get('content-type')?.split('/')[0] : 'text';
   }
   if (Buffer.isBuffer(content)) return (await fileType.fromBuffer(content))?.mime?.split('/')[0] || 'text';
   return 'text';
  };

  const type = options.type || (await detectType(content));
  const mergedOptions = { packname: 'ғxᴏᴘ-ᴍᴅ', author: 'ᴀsᴛʀᴏ', quoted: this.data, ...options };

  const message = await this.sendMessage(jid, content, mergedOptions, type);
  message.reply = async (text, replyOptions = {}) => {
   let messageContent = { text };
   if (replyOptions.mentions) {
    messageContent.mentions = replyOptions.mentions;
   }
   const replyMessage = await this.client.sendMessage(jid, messageContent, { quoted: message.data, ...replyOptions });
   return new Message(this.client, replyMessage);
  };

  return message;
 }

 async forward(jid, content, options = {}) {
  if (options.readViewOnce) {
   content = content?.ephemeralMessage?.message || content;
   const viewOnceKey = Object.keys(content)[0];
   delete content?.ignore;
   delete content?.quotedMessage;
   return this.client.sendMessage(jid || this.jid, { viewOnceMessage: { message: { ...content[viewOnceKey] } } }, options);
  }
  return this.client.sendMessage(jid || this.jid, { forward: content });
 }

 async downloadMediaMessage(msg) {
  const msgType = getContentType(msg);
  const mediaMsg = msg[msgType];
  if (!mediaMsg) throw new Error('No media found in message.');

  const buffer = await this.client.downloadMediaMessage(msg);
  return buffer;
 }
}

module.exports = Message;
