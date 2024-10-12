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
  this.user = decodeJid(this.client.user.id);
  this.key = data.key || {};
  this.isGroup = data.isGroup || false;
  this.prefix = data.prefix || '';
  this.id = this.key.id || '';
  this.jid = this.key.remoteJid || '';
  this.message = { key: this.key, message: data.message || {} };
  this.pushName = data.pushName || '';
  this.participant = parsedJid(data.sender)?.[0] || false;

  this.sudo = this.checkSudo(this.participant);
  this.text = data.body || '';
  this.fromMe = this.key.fromMe || false;
  this.isBaileys = this.id.startsWith('BAE5');
  this.timestamp = data.messageTimestamp?.low || data.messageTimestamp || Date.now();
  const contextInfo = data.message?.extendedTextMessage?.contextInfo || {};
  this.mention = contextInfo.mentionedJid || false;

  if (data.quoted) {
   if (data.message?.buttonsResponseMessage) return;
   this._patchReplyMessage(data.quoted, contextInfo);
  } else {
   this.reply_message = false;
  }

  return super._patch(data);
 }

 checkSudo(participant) {
  try {
   return config.SUDO.split(',').includes(participant?.split('@')[0]);
  } catch {
   return false;
  }
 }

 _patchReplyMessage(quoted, contextInfo) {
  this.reply_message = {
   key: quoted.key || {},
   id: quoted.key?.id || '',
   participant: quoted.participant || '',
   fromMe: parsedJid(this.client.user.jid)?.[0] === parsedJid(quoted.participant)?.[0],
   sudo: this.checkSudo(quoted.participant),
  };

  const quotedMessage = quoted.message || {};
  if (quotedMessage) {
   let type = Object.keys(quotedMessage)[0] || 'extendedTextMessage';
   this.reply_message.type = quoted.type || 'extendedTextMessage';
   this.reply_message.mtype = quoted.mtype || '';

   if (type === 'extendedTextMessage' || type === 'conversation') {
    this.reply_message.text = quotedMessage[type]?.text || '';
    this.reply_message.mimetype = 'text/plain';
   } else if (type === 'stickerMessage') {
    this.reply_message.mimetype = 'image/webp';
    this.reply_message.sticker = quotedMessage[type] || {};
   } else {
    let mimetype = quotedMessage[type]?.mimetype || type;
    this.reply_message.mimetype = mimetype;
    if (mimetype.includes('/')) {
     let mime = mimetype.split('/')[0];
     this.reply_message[mime] = quotedMessage[type] || {};
    } else {
     this.reply_message.message = quotedMessage[type] || {};
    }
   }
  }

  this.reply_message.mention = contextInfo.mentionedJid || false;
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
   if (typeof content === 'string') {
    return isUrl(content) ? (await fetch(content, { method: 'HEAD' })).headers.get('content-type')?.split('/')[0] : 'text';
   }
   if (Buffer.isBuffer(content)) {
    return (await fileType.fromBuffer(content))?.mime?.split('/')[0] || 'text';
   }
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
    return this.sendMediaMessage(jid, content, 'image', opt);
   case 'video':
    return this.sendMediaMessage(jid, content, 'video', opt);
   case 'audio':
    return this.sendMediaMessage(jid, content, 'audio', opt);
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
    await this.sendStickerMessage(jid, content, opt);
    break;
   case 'document':
    if (!opt.mimetype) throw new Error('Mimetype is required for document');
    return this.sendMediaMessage(jid, content, 'document', opt);
  }
 }

 async sendMediaMessage(jid, content, mediaType, opt) {
  if (Buffer.isBuffer(content)) {
   return this.client.sendMessage(jid, { [mediaType]: content, ...opt });
  } else if (isUrl(content)) {
   return this.client.sendMessage(jid, { [mediaType]: { url: content }, ...opt });
  }
 }

 async sendStickerMessage(jid, content, opt) {
  const { data, mime } = await this.client.getFile(content);
  if (mime === 'image/webp') {
   const buff = await writeExifWebp(data, opt);
   await this.client.sendMessage(jid, { sticker: { url: buff }, ...opt }, opt);
  } else {
   const mimePrefix = mime.split('/')[0];
   if (mimePrefix === 'video' || mimePrefix === 'image') {
    await this.client.sendImageAsSticker(this.jid, content, opt);
   }
  }
 }

 async forward(jid, content, options = {}) {
  if (options.readViewOnce) {
   content = content?.ephemeralMessage?.message || content;
   const viewOnceKey = Object.keys(content || {})[0];
   delete content?.ignore;
   delete content?.viewOnceMessage?.message?.[viewOnceKey]?.viewOnce;
   content = { ...content?.viewOnceMessage?.message };
  }

  if (options.mentions) {
   content[getContentType(content)].contextInfo.mentionedJid = options.mentions || [];
  }

  const forwardContent = generateForwardMessageContent(content, false);
  const contentType = getContentType(forwardContent);
  const forwardOptions = { ...options };

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

 async download(options = {}) {
  try {
   const content = this.message?.message || {};
   const mime = content?.mimetype || Object.keys(content)?.[0];
   const buffer = await downloadContentFromMessage(content, mime);
   const filename = `${tmpdir()}/${this.id}.${mime.split('/')[1]}`;
   const writeStream = fs.createWriteStream(filename);

   buffer.pipe(writeStream);
   return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(filename));
    writeStream.on('error', reject);
   });
  } catch (error) {
   throw new Error('Error downloading file: ' + error.message);
  }
 }

 async delete() {
  return await this.client.sendMessage(this.jid, { delete: this.key });
 }
}

module.exports = Message;
