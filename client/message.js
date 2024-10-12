const { decodeJid, createInteractiveMessage, parsedJid, writeExifWebp } = require('../utils');
const Base = require('./_base');
const config = require('../config');
const fileType = require('file-type');
const { generateWAMessageFromContent, generateForwardMessageContent, generateWAMessage, getContentType, downloadContentFromMessage } = require('baileys');
const { tmpdir } = require('os');
const fs = require('fs');

class Message extends Base {
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);
 }

 _patch(data) {
  data;
  this.user = decodeJid(this.client.user.id);
  this.key = data.key;
  this.isGroup = data.isGroup;
  this.prefix = data.prefix;
  this.id = data.key.id;
  this.jid = data.key.remoteJid;
  this.message = { key: data.key, message: data.message };
  this.pushName = data.pushName;
  this.participant = parsedJid(data.sender)[0];
  try {
   this.sudo = config.SUDO.split(',').includes(this.participant.split('@')[0]);
  } catch {
   this.sudo = false;
  }
  this.text = data.body;
  this.fromMe = data.key.fromMe;
  this.isBaileys = this.id.startsWith('BAE5');
  this.timestamp = data.messageTimestamp.low || data.messageTimestamp;
  const contextInfo = data.message.extendedTextMessage?.contextInfo;
  this.mention = contextInfo?.mentionedJid || false;

  if (data.quoted) {
   if (data.message.buttonsResponseMessage) return;
   this._patchReplyMessage(data.quoted, contextInfo);
  } else {
   this.reply_message = false;
  }

  return super._patch(data);
 }

 _patchReplyMessage(quoted, contextInfo) {
  this.reply_message = {
   key: quoted.key,
   id: quoted.key.id,
   participant: quoted.participant,
   fromMe: parsedJid(this.client.user.jid)[0] === parsedJid(quoted.participant)[0],
   sudo: false,
  };

  try {
   this.reply_message.sudo = config.SUDO.split(',').includes(quoted.participant.split('@')[0]);
  } catch {
   this.reply_message.sudo = false;
  }

  const quotedMessage = quoted.message;
  if (quotedMessage) {
   let type = Object.keys(quotedMessage)[0];
   this.reply_message.type = quoted.type || 'extendedTextMessage';
   this.reply_message.mtype = quoted.mtype;

   if (type === 'extendedTextMessage' || type === 'conversation') {
    this.reply_message.text = quotedMessage[type].text || quotedMessage[type];
    this.reply_message.mimetype = 'text/plain';
   } else if (type === 'stickerMessage') {
    this.reply_message.mimetype = 'image/webp';
    this.reply_message.sticker = quotedMessage[type];
   } else {
    let mimetype = quotedMessage[type]?.mimetype || type;
    if (mimetype?.includes('/')) {
     this.reply_message.mimetype = mimetype;
     let mime = mimetype.split('/')[0];
     this.reply_message[mime] = quotedMessage[type];
    } else {
     this.reply_message.mimetype = mimetype;
     this.reply_message.message = quotedMessage[type];
    }
   }
  }

  this.reply_message.mention = contextInfo?.mentionedJid || false;
 }

 async sendReply(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text }, { ...opt, quoted: this });
 }

 async log() {
  console.log(this.data);
 }

 async sendFile(content, options = {}) {
  const { data } = await this.client.getFile(content);
  const type = (await fileType.fromBuffer(data)) || {};
  return this.client.sendMessage(this.jid, { [type.mime.split('/')[0]]: data }, options);
 }

 async edit(text, opt = {}) {
  await this.client.sendMessage(this.jid, { text, edit: this.key, ...opt });
 }

 async reply(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text, ...opt }, { ...opt, quoted: this });
 }

 async send(content, options = { quoted: this.data }) {
  const jid = this.jid || options.jid;
  const detectType = async (content) => {
   if (typeof content === 'string') return isUrl(content) ? (await fetch(content, { method: 'HEAD' })).headers.get('content-type')?.split('/')[0] : 'text';
   if (Buffer.isBuffer(content)) return (await fileType.fromBuffer(content))?.mime?.split('/')[0] || 'text';
   return 'text';
  };
  const type = options.type || (await detectType(content));
  const mergedOptions = { packname: 'ғxᴏᴘ-ᴍᴅ', author: 'ᴀsᴛʀᴏ', quoted: this.data, ...options };

  const message = await this.sendMessage(jid, content, mergedOptions, type);
  message.reply = async (text, replyOptions = {}) => {
   const replyMessage = await this.client.sendMessage(jid, { text, mentions: replyOptions.mentions }, { quoted: this.data, ...replyOptions });
   return new Message(this.client, replyMessage);
  };
  return message;
 }

 async sendMessage(jid, content, opt = { packname: 'Xasena', author: 'X-electra', fileName: 'X-Asena' }, type = 'text') {
  switch (type.toLowerCase()) {
   case 'text':
    return this.client.sendMessage(jid, { text: content, ...opt });
   case 'image':
   case 'photo':
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { image: content, ...opt });
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      image: { url: content },
      ...opt,
     });
    }
    break;
   case 'video':
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { video: content, ...opt });
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      video: { url: content },
      ...opt,
     });
    }
    break;
   case 'audio':
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { audio: content, ...opt });
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      audio: { url: content },
      ...opt,
     });
    }
    break;
   case 'template':
    const optional = await generateWAMessage(jid, content, opt);
    const message = {
     viewOnceMessage: {
      message: {
       ...optional.message,
      },
     },
    };
    await this.client.relayMessage(jid, message, {
     messageId: optional.key.id,
    });
    break;
   case 'interactive':
    const genMessage = createInteractiveMessage(content);
    await this.client.relayMessage(jid, genMessage.message, {
     messageId: genMessage.key.id,
    });
    break;
   case 'sticker':
    const { data, mime } = await this.client.getFile(content);
    if (mime == 'image/webp') {
     const buff = await writeExifWebp(data, opt);
     await this.client.sendMessage(jid, { sticker: { url: buff }, ...opt }, opt);
    } else {
     const mimePrefix = mime.split('/')[0];
     if (mimePrefix === 'video' || mimePrefix === 'image') {
      await this.client.sendImageAsSticker(this.jid, content, opt);
     }
    }
    break;
   case 'document':
    if (!opt.mimetype) throw new Error('Mimetype is required for document');
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { document: content, ...opt });
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      document: { url: content },
      ...opt,
     });
    }
    break;
  }
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
 async downloadMedia(message = this.message) {
  const type = Object.keys(message)[0];
  const mimeMap = {
   imageMessage: 'image',
   videoMessage: 'video',
   stickerMessage: 'sticker',
   documentMessage: 'document',
   audioMessage: 'audio',
  };

  const stream = await downloadContentFromMessage(message[type], mimeMap[type]);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
   buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
 }

 async uploadMedia(buffer) {
  const { mime } = await fileType.fromBuffer(buffer);
  const filename = `upload_${Date.now()}.${mime.split('/')[1]}`;
  await fs.writeFile(filename, buffer);
  const media = await this.client.sendMedia(this.jid, { url: filename }, { filename });
  await fs.unlink(filename);
  return media;
 }

 async react(emoji) {
  return this.client.sendMessage(this.jid, { react: { text: emoji, key: this.key } });
 }
 async PresenceUpdate(status) {
  await this.client.sendPresenceUpdate(status, this.jid);
 }

 async delete(key = this.key) {
  return this.client.sendMessage(this.jid, { delete: key });
 }

 async updateName(name) {
  await this.client.updateProfileName(name);
 }

 async getPP(jid) {
  return await this.client.profilePictureUrl(jid, 'image');
 }

 async setPP(jid, pp) {
  const profilePicture = Buffer.isBuffer(pp) ? pp : { url: pp };
  await this.client.updateProfilePicture(jid, profilePicture);
 }

 async block(jid) {
  await this.client.updateBlockStatus(jid, 'block');
 }

 async unblock(jid) {
  await this.client.updateBlockStatus(jid, 'unblock');
 }

 async add(jid) {
  return await this.client.groupParticipantsUpdate(this.jid, jid, 'add');
 }

 async kick(jid) {
  return await this.client.groupParticipantsUpdate(this.jid, jid, 'remove');
 }

 async promote(jid) {
  return await this.client.groupParticipantsUpdate(this.jid, jid, 'promote');
 }

 async demote(jid) {
  return await this.client.groupParticipantsUpdate(this.jid, jid, 'demote');
 }

 async downloadMediaMessage() {
  if (!this.reply_message) {
   throw new Error('No quoted message to download');
  }
  const buff = await this.m.quoted.download();
  const type = await fileType.fromBuffer(buff);
  await fs.promises.writeFile(tmpdir() + type.ext, buff);
  return tmpdir() + type.ext;
 }
}

module.exports = Message;
