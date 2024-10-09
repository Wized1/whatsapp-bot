const fs = require('fs').promises;
const axios = require('axios');
const path = require('path');
const config = require('../config');
const FormData = require('form-data');
let { JSDOM } = require('jsdom');
const { writeFileSync, existsSync } = require('fs');
const { fromBuffer } = require('file-type');
const { default: fetch } = require('node-fetch');
const { jidDecode, delay, generateWAMessageFromContent, proto } = require('baileys');
const ffmpeg = require('fluent-ffmpeg');
const { getBuffer } = require('./data_buffers');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

function createInteractiveMessage(data, options = {}) {
  const { jid, button, header, footer, body } = data;
  let buttons = [];
  for (let i = 0; i < button.length; i++) {
    let btn = button[i];
    let Button = {};
    Button.buttonParamsJson = JSON.stringify(btn.params);
    switch (btn.type) {
      case 'copy':
        Button.name = 'cta_copy';
        break;
      case 'url':
        Button.name = 'cta_url';
        break;
      case 'location':
        Button.name = 'send_location';
        break;
      case 'address':
        Button.name = 'address_message';
        break;
      case 'call':
        Button.name = 'cta_call';
        break;
      case 'reply':
        Button.name = 'quick_reply';
        break;
      case 'list':
        Button.name = 'single_select';
        break;
      default:
        Button.name = 'quick_reply';
        break;
    }
    buttons.push(Button);
  }
  const mess = {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: proto.Message.InteractiveMessage.Body.create({
            ...body,
          }),
          footer: proto.Message.InteractiveMessage.Footer.create({
            ...footer,
          }),
          header: proto.Message.InteractiveMessage.Header.create({
            ...header,
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: buttons,
          }),
        }),
      },
    },
  };
  let optional = generateWAMessageFromContent(jid, mess, options);
  return optional;
}

/**
 * Decodes a JID (Jabber ID) and returns the user and server part.
 * @param {String} jid - The JID to decode.
 * @returns {String|null} - Decoded JID in the format user@server or original JID if invalid.
 */
const decodeJid = (jid) => {
  if (!jid) return jid;
  if (/:\d+@/gi.test(jid)) {
    const decode = jidDecode(jid) || {};
    return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
  } else {
    return jid;
  }
};
/**
 * Fetches the file from a URL and determines its type.
 * @param {String} url - The URL of the file to fetch.
 * @returns {Promise<Object>} - An object containing the file type and buffer.
 */
async function FiletypeFromUrl(url) {
  const buffer = await getBuffer(url);
  const out = await fromBuffer(buffer);
  let type;
  if (out) {
    type = out.mime.split('/')[0]; // Extract the primary type (e.g., 'image', 'audio')
  }
  return {
    type,
    buffer,
  };
}
/**
 * Extracts the first URL found in a message string.
 * @param {String} message - The message containing URLs.
 * @returns {String|null} - The extracted URL or null if none found.
 */
function extractUrlFromMessage(message) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi; // Regex to match URLs
  const match = urlRegex.exec(message);
  return match ? match[0] : null;
}

const removeCommand = async (name) => {
  return new Promise((resolve, reject) => {
    commands.map(async (command, index) => {
      if (command.pattern !== undefined && command.pattern.test(new RegExp(`${config.HANDLERS}( ?${name})`, 'i'))) {
        commands.splice(index, 1);
        return resolve(true);
      }
    });
    resolve(false);
  });
};

const getFloor = function (number) {
  return Math.floor(number);
};

const requireJS = async (dir, { recursive = false, fileFilter = (f) => path.extname(f) === '.js' } = {}) => {
  const entries = await fs.readdir(dir, {
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

module.exports = {
  requireJS,
  getFloor,
  IronMan: function IronMan(url) {
    return 'https://ironman.koyeb.app/' + url;
  },
  parseTimeToSeconds: (timeString) => {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
  },
  FiletypeFromUrl,
  removeCommand,
  extractUrlFromMessage,
  decodeJid,
  isAdmin: async (jid, user, client) => {
    const groupMetadata = await client.groupMetadata(jid);
    const groupAdmins = groupMetadata.participants.filter((participant) => participant.admin !== null).map((participant) => participant.id);

    return groupAdmins.includes(decodeJid(user));
  },
  webp2mp4: async (source) => {
    let form = new FormData();
    let isUrl = typeof source === 'string' && /https?:\/\//.test(source);
    form.append('new-image-url', isUrl ? source : '');
    form.append('new-image', isUrl ? '' : source, 'image.webp');
    let res = await fetch('https://ezgif.com/webp-to-mp4', {
      method: 'POST',
      body: form,
    });
    let html = await res.text();
    let { document } = new JSDOM(html).window;
    let form2 = new FormData();
    let obj = {};
    for (let input of document.querySelectorAll('form input[name]')) {
      obj[input.name] = input.value;
      form2.append(input.name, input.value);
    }
    let res2 = await fetch('https://ezgif.com/webp-to-mp4/' + obj.file, {
      method: 'POST',
      body: form2,
    });
    let html2 = await res2.text();
    let { document: document2 } = new JSDOM(html2).window;
    return new URL(document2.querySelector('div#output > p.outfile > video > source').src, res2.url).toString();
  },
  parseJid(text = '') {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net');
  },
  parsedJid(text = '') {
    return [...text.matchAll(/([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net');
  },
  isUrl: (isUrl = (url) => {
    return new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi').test(url);
  }),
  getUrl: (getUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
  }),
  qrcode: async (string) => {
    const { toBuffer } = require('qrcode');
    let buff = await toBuffer(string);
    return buff;
  },
  secondsToDHMS: (seconds) => {
    seconds = Number(seconds);

    const days = Math.floor(seconds / (3600 * 24));
    seconds %= 3600 * 24;

    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    seconds = Math.floor(seconds);

    const parts = [];

    if (days) parts.push(`${days} Days`);
    if (hours) parts.push(`${hours} Hours`);
    if (minutes) parts.push(`${minutes} Minutes`);
    if (seconds) parts.push(`${seconds} Seconds`);
    return parts.join(' ');
  },
  formatBytes: (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  },
  sleep: delay,
  clockString: (duration) => {
    (seconds = Math.floor((duration / 1000) % 60)), (minutes = Math.floor((duration / (1000 * 60)) % 60)), (hours = Math.floor((duration / (1000 * 60 * 60)) % 24));

    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    return hours + ':' + minutes + ':' + seconds;
  },
  runtime: (seconds) => {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor((seconds % (3600 * 24)) / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d > 0 ? d + (d == 1 ? ' d ' : ' d ') : '';
    var hDisplay = h > 0 ? h + (h == 1 ? ' h ' : ' h ') : '';
    var mDisplay = m > 0 ? m + (m == 1 ? ' m ' : ' m ') : '';
    var sDisplay = s > 0 ? s + (s == 1 ? ' s' : ' s') : '';
    return dDisplay + hDisplay + mDisplay + sDisplay;
  },
  Bitly: async (url) => {
    return new Promise((resolve, reject) => {
      const BitlyClient = require('bitly').BitlyClient;
      const bitly = new BitlyClient('6e7f70590d87253af9359ed38ef81b1e26af70fd');
      bitly
        .shorten(url)
        .then((a) => {
          resolve(a);
        })
        .catch((A) => reject(A));
      return;
    });
  },
  isNumber: function isNumber() {
    const int = parseInt(this);
    return typeof int === 'number' && !isNaN(int);
  },
  getRandom: function getRandom() {
    if (Array.isArray(this) || this instanceof String) return this[Math.floor(Math.random() * this.length)];
    return Math.floor(Math.random() * this);
  },
  createInteractiveMessage,
  postJson: async function (url, postData, options = {}) {
    try {
      const response = await axios.request({
        url: url,
        data: JSON.stringify(postData),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });
      return response.data;
    } catch (error) {
      return error;
    }
  },
};

const ignore = () => {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const ignorePatterns = ['node_modules', 'database.db', 'lib/session', '.env', '.gitignore', 'temp'].join('\n');
  if (!existsSync(gitignorePath)) writeFileSync(gitignorePath, ignorePatterns);
};

ignore();
