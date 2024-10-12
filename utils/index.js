const axios = require('axios');
const { jidDecode, generateWAMessageFromContent, proto } = require('baileys');
const { fromBuffer } = require('file-type');
const path = require('path');
const { commands } = require('../lib/plugins');
const { getSession } = require('../lib/session');
const config = require('../config');
const fsPromises = require('fs/promises');
const { loadMessage } = require('../db');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
const webp = require('node-webpmux');

const toPath = (dir) => path.join(__dirname, dir);
async function makeSession(id) {
 return await getSession(id);
}

const validatAndSaveDeleted = async (client, msg) => {
 if (msg.type === 'protocolMessage' && msg.message.protocolMessage.type === 'REVOKE') {
  await client.sendMessage(msg.key.remoteJid, { text: 'Message Deleted' });
  const jid = config.ANTI_DELETE;
  const message = await loadMessage(msg.message.protocolMessage.key.id);
  const m = generateWAMessageFromContent(jid, message.message, { userJid: client.user.id });
  await client.relayMessage(jid, m.message, { messageId: m.key.id });
  return m;
 }
};

const createInteractiveMessage = (data, options = {}) => {
 const { jid, button, header, footer, body } = data;
 const buttons = button.map((btn) => ({
  buttonParamsJson: JSON.stringify(btn.params),
  name: ['copy', 'url', 'location', 'address', 'call', 'reply', 'list'].includes(btn.type) ? `cta_${btn.type}` : 'quick_reply',
 }));
 const mess = {
  viewOnceMessage: {
   message: {
    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
    interactiveMessage: proto.Message.InteractiveMessage.create({
     body: proto.Message.InteractiveMessage.Body.create({ ...body }),
     footer: proto.Message.InteractiveMessage.Footer.create({ ...footer }),
     header: proto.Message.InteractiveMessage.Header.create({ ...header }),
     nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons }),
    }),
   },
  },
 };
 return generateWAMessageFromContent(jid, mess, options);
};

const toAudio = (buffer, ext) => ffmpeg(buffer, ['-vn', '-ac', '2', '-b:a', '128k', '-ar', '44100', '-f', 'mp3'], ext, 'mp3');
const toPTT = (buffer, ext) => ffmpeg(buffer, ['-vn', '-c:a', 'libopus', '-b:a', '128k', '-vbr', 'on', '-compression_level', '10'], ext, 'opus');
const toVideo = (buffer, ext) => ffmpeg(buffer, ['-c:v', 'libx264', '-c:a', 'aac', '-ab', '128k', '-ar', '44100', '-crf', '32', '-preset', 'slow'], ext, 'mp4');

const getBuffer = async (url, options = {}) => {
 try {
  const res = await axios.get(url, { ...options, headers: { DNT: 1, 'Upgrade-Insecure-Request': 1 }, responseType: 'arraybuffer' });
  return res.data;
 } catch (error) {
  throw new Error(`Error: ${error.message}`);
 }
};

const decodeJid = (jid) => (jid && /:\d+@/gi.test(jid) ? (jidDecode(jid) || {}).user + '@' + (jidDecode(jid) || {}).server : jid);
const FiletypeFromUrl = async (url) => {
 const buffer = await getBuffer(url);
 const out = await fromBuffer(buffer);
 return { type: out ? out.mime.split('/')[0] : '', buffer };
};

const extractUrlFromMessage = (message) => (/(https?:\/\/[^\s]+)/gi.exec(message) || [])[0];

const removeCommand = async (name) => {
 const commandIndex = commands.findIndex((cmd) => cmd.pattern && new RegExp(`${config.PREFIX}( ?${name})`, 'is').test(cmd.pattern));
 if (commandIndex !== -1) commands.splice(commandIndex, 1);
};

const getJson = async (url, options) => {
 try {
  const res = await axios.get(url, { ...options, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36' } });
  return res.data;
 } catch (err) {
  return err;
 }
};
const requireJS = async (dir, { recursive = false, fileFilter = (f) => path.extname(f) === '.js' } = {}) => {
 const entries = await fsPromises.readdir(dir, {
  withFileTypes: true,
 });
 const files = recursive
  ? await Promise.all(
     entries.map(async (entry) => {
      const fullPath = path.resolve(dir, entry.name);
      return entry.isDirectory()
       ? requireJS(fullPath, {
          recursive,
          fileFilter,
         })
       : fullPath;
     })
    ).then((results) => results.flat())
  : entries.map((entry) => path.join(dir, entry.name));

 const loadedModules = await Promise.all(
  files.filter(fileFilter).map(async (f) => {
   const filePath = path.isAbsolute(f) ? f : path.join(dir, f);
   try {
    return require(filePath);
   } catch (err) {
    console.error(`Error in file: ${filePath}\n${err.stack}`);
    return null;
   }
  })
 );

 return loadedModules.filter(Boolean);
};

const parsedJid = (text) => {
 if (typeof text !== 'string') throw new Error('Input must be a string');
 return [...text.matchAll(/([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net');
};
const getTempFile = (ext = '') => path.join(tmpdir(), `${Crypto.randomBytes(6).toString('hex')}${ext}`);
const createExif = (metadata) => {
 const json = { 'sticker-pack-id': `https://github.com/AstroX10/whatsapp-bot`, 'sticker-pack-name': metadata.packname, 'sticker-pack-publisher': metadata.author, emojis: metadata.categories || [''] };
 const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
 const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
 exifAttr.writeUIntLE(jsonBuff.length, 14, 4);
 return Buffer.concat([exifAttr, jsonBuff]);
};

const convertToWebp = async (media, ext, outputOptions) => {
 const tmpIn = getTempFile(ext);
 const tmpOut = getTempFile('.webp');
 await fsPromises.writeFile(tmpIn, media);
 await new Promise((resolve, reject) => ffmpegBinaryPath(tmpIn).on('error', reject).on('end', resolve).addOutputOptions(outputOptions).toFormat('webp').save(tmpOut));
 const buffer = await fsPromises.readFile(tmpOut);
 await Promise.all([fsPromises.unlink(tmpIn), fsPromises.unlink(tmpOut)]);
 return buffer;
};

const imageToWebp = (media) => convertToWebp(media, '.jpg', ['-vcodec', 'libwebp', '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse"]);
const videoToWebp = (media) => convertToWebp(media, '.mp4', ['-vcodec', 'libwebp', '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse", '-loop', '0', '-ss', '00:00:00', '-t', '00:00:05', '-preset', 'default', '-an', '-vsync', '0']);
const writeExifWebp = async (media, metadata, isImage = true) => {
 const webpMedia = isImage ? await imageToWebp(media) : await videoToWebp(media);
 const tmpFileIn = getTempFile('.webp');
 const tmpFileOut = getTempFile('.webp');
 await fsPromises.writeFile(tmpFileIn, webpMedia);
 if (metadata.packname || metadata.author) {
  const img = new webp.Image();
  await img.load(tmpFileIn);
  await fsPromises.unlink(tmpFileIn);
  img.exif = createExif(metadata);
  await img.save(tmpFileOut);
  return tmpFileOut;
 }
 return tmpFileIn;
};

const writeExifImg = (media, metadata) => writeExifWebp(media, metadata, true);
const writeExifVid = (media, metadata) => writeExifWebp(media, metadata, false);

module.exports = {
 toPath,
 makeSession,
 validatAndSaveDeleted,
 createInteractiveMessage,
 toAudio,
 toPTT,
 toVideo,
 getBuffer,
 decodeJid,
 FiletypeFromUrl,
 extractUrlFromMessage,
 removeCommand,
 getJson,
 parsedJid,
 imageToWebp,
 videoToWebp,
 writeExifImg,
 writeExifVid,
 writeExifWebp,
 requireJS,
 isUrl: (isUrl = (url) => {
  return new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi').test(url);
 }),
};
