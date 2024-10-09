const { downloadContentFromMessage, getContentType } = require('baileys');
const fs = require('fs').promises;
const { existsSync, readFileSync, mkdirSync, writeFileSync } = require('fs');
const fetch = require('node-fetch');
const { fromBuffer } = require('file-type');
const path = require('path');
const { writeExifImg, writeExifVid, imageToWebp, videoToWebp, parsedJid } = require('../utils');
const config = require('../config');
const FileType = require('file-type');

async function downloadMedia(message) {
  const mimeMap = {
    imageMessage: 'image',
    videoMessage: 'video',
    stickerMessage: 'sticker',
    documentMessage: 'document',
    audioMessage: 'audio',
  };
  let type = Object.keys(message)[0];
  let mes = message;
  if (type === 'templateMessage') {
    mes = message.templateMessage.hydratedFourRowTemplate;
    type = Object.keys(mes)[0];
  } else if (type === 'interactiveResponseMessage') {
    mes = message.interactiveResponseMessage;
    type = Object.keys(mes)[0];
  } else if (type === 'buttonsMessage') {
    mes = message.buttonsMessage;
    type = Object.keys(mes)[0];
  }
  const stream = await downloadContentFromMessage(mes[type], mimeMap[type]);
  const buffer = [];
  for await (const chunk of stream) {
    buffer.push(chunk);
  }
  return Buffer.concat(buffer);
}

async function downloadAndSave(message) {
  const mimeMap = {
    imageMessage: 'image',
    videoMessage: 'video',
    stickerMessage: 'sticker',
    documentMessage: 'document',
    audioMessage: 'audio',
  };

  let type = Object.keys(message)[0];
  let mes = message;

  if (type === 'templateMessage') {
    mes = message.templateMessage.hydratedFourRowTemplate;
    type = Object.keys(mes)[0];
  } else if (type === 'interactiveResponseMessage') {
    mes = message.interactiveResponseMessage;
    type = Object.keys(mes)[0];
  } else if (type === 'buttonsMessage') {
    mes = message.buttonsMessage;
    type = Object.keys(mes)[0];
  }

  const stream = await downloadContentFromMessage(mes[type], mimeMap[type]);
  const buffer = [];
  for await (const chunk of stream) {
    buffer.push(chunk);
  }
  const mediaBuffer = Buffer.concat(buffer);
  const fileType = await FileType.fromBuffer(mediaBuffer);
  const extension = fileType ? fileType.ext : mimeMap[type];

  const tempDir = path.resolve(process.cwd(), 'temp'); // Use `path.resolve` for absolute path
  if (!existsSync(tempDir)) mkdirSync(tempDir);

  const fileName = `${Date.now()}.${extension}`;
  const filePath = path.resolve(tempDir, fileName); // Absolute path for the file
  writeFileSync(filePath, mediaBuffer);
  console.log(filePath);
  return filePath; // Return absolute file path as a string
}

async function serialize(msg, conn) {
  conn.logger = {
    info() {},
    error() {},
    warn() {},
  };
  if (msg.key) {
    msg.id = msg.key.id;
    msg.isSelf = msg.key.fromMe;
    msg.from = msg.key.remoteJid;
    msg.isGroup = msg.from.endsWith('@g.us');

    msg.sender = msg.isGroup ? msg.key.participant : msg.isSelf ? conn.user.id : msg.from;

    try {
      msg.sudo = config.SUDO.split(',').includes(parsedJid(msg.sender)[0].split('@')[0]) || msg.key.fromMe;
    } catch {
      msg.sudo = false;
    }
  }

  if (msg.message) {
    msg.type = getContentType(msg.message);

    try {
      msg.mentions = msg.message[msg.type]?.contextInfo?.mentionedJid || [];
    } catch {
      msg.mentions = false;
    }

    try {
      const quoted = msg.message[msg.type]?.contextInfo;
      if (quoted && quoted.quotedMessage) {
        let type, message;

        if (quoted.quotedMessage['ephemeralMessage']) {
          type = Object.keys(quoted.quotedMessage.ephemeralMessage.message)[0];
          message = type === 'viewOnceMessageV2' ? quoted.quotedMessage.ephemeralMessage.message.viewOnceMessageV2.message : quoted.quotedMessage.ephemeralMessage.message;
          type = type === 'viewOnceMessageV2' ? 'view_once' : 'ephemeral';
        } else if (quoted.quotedMessage['viewOnceMessageV2']) {
          type = 'view_once';
          message = quoted.quotedMessage.viewOnceMessageV2.message;
        } else if (quoted.quotedMessage['viewOnceMessageV2Extension']) {
          type = 'view_once_audio';
          message = quoted.quotedMessage.viewOnceMessageV2Extension.message;
        } else {
          type = 'normal';
          message = quoted.quotedMessage;
        }

        msg.quoted = {
          type,
          stanzaId: quoted.stanzaId,
          sender: quoted.participant,
          message,
          isSelf: quoted.participant === conn.user.id,
          mtype: Object.keys(message)[0],
        };

        msg.quoted.text = message[msg.quoted.mtype]?.text || message[msg.quoted.mtype]?.description || message[msg.quoted.mtype]?.caption || (msg.quoted.mtype === 'templateButtonReplyMessage' && message[msg.quoted.mtype].hydratedTemplate?.hydratedContentText) || message[msg.quoted.mtype] || '';

        msg.quoted.key = {
          id: msg.quoted.stanzaId,
          fromMe: msg.quoted.isSelf,
          remoteJid: msg.from,
        };

        msg.quoted.download = (pathFile) => downloadMedia(msg.quoted.message, pathFile);
        msg.quoted.copyNSave = (fileBuffer) => downloadAndSave(msg.quoted.message, fileBuffer);
      }
    } catch (error) {
      console.error('Error in processing quoted message:', error);
      msg.quoted = null;
    }

    try {
      msg.body = msg.message.conversation || msg.message[msg.type]?.text || msg.message[msg.type]?.caption || (msg.type === 'listResponseMessage' && msg.message[msg.type].singleSelectReply.selectedRowId) || (msg.type === 'buttonsResponseMessage' && msg.message[msg.type].selectedButtonId && msg.message[msg.type].selectedButtonId) || (msg.type === 'templateButtonReplyMessage' && msg.message[msg.type].selectedId) || false;
    } catch (error) {
      console.error('Error in extracting message body:', error);
      msg.body = false;
    }

    msg.download = (pathFile) => downloadMedia(msg.message, pathFile);
    msg.copyNSave = (filePath) => downloadAndSave(msg.message, filePath);
    conn.client = msg;

    conn.getFile = async (PATH, returnAsFilename) => {
      let res, filename;
      let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : existsSync(PATH) ? ((filename = PATH), readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0);
      if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer');
      let type = (await fromBuffer(data)) || {
        mime: 'application/octet-stream',
        ext: '.bin',
      };
      if (data && returnAsFilename && !filename) (filename = path.join(__dirname, '../' + new Date() * 1 + '.' + type.ext)), await fs.writeFile(filename, data);
      return {
        res,
        filename,
        ...type,
        data,
      };
    };

    conn.sendImageAsSticker = async (jid, buff, options = {}) => {
      let buffer;
      if (options && (options.packname || options.author)) {
        buffer = await writeExifImg(buff, options);
      } else {
        buffer = await imageToWebp(buff);
      }
      await conn.sendMessage(
        jid,
        {
          sticker: {
            url: buffer,
          },
          ...options,
        },
        options
      );
    };

    conn.sendVideoAsSticker = async (jid, buff, options = {}) => {
      let buffer;
      if (options && (options.packname || options.author)) {
        buffer = await writeExifVid(buff, options);
      } else {
        buffer = await videoToWebp(buff);
      }
      await conn.sendMessage(
        jid,
        {
          sticker: {
            url: buffer,
          },
          ...options,
        },
        options
      );
    };
  }
  return msg;
}

module.exports = {
  serialize,
  downloadMedia,
  downloadAndSave,
};
