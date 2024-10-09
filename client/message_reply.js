const Base = require('./base');
const fs = require('fs').promises;
const fileType = require('file-type');
const config = require('../config');
const { parsedJid } = require('../utils');
const path = require('path');
const os = require('os');

class ReplyMessage extends Base {
  constructor(client, data) {
    super(client);
    if (data) this._patch(data);
  }

  _patch(data) {
    const { key, stanzaId, participant, quotedMessage } = data;
    this.key = key;
    this.id = stanzaId;
    this.isBaileys = (this.id && this.id.startsWith('BAE5')) || (this.id && this.id.length === 16);
    this.jid = participant || '';
    this.sudo = this.jid ? config.SUDO.split(',').includes(this.jid.split('@')[0]) : false;
    this.fromMe = this.jid ? parsedJid(this.client.user.jid)[0] === parsedJid(this.jid)[0] : false;
    this.participant = parsedJid(data.sender)[0];

    if (quotedMessage) this.processQuotedMessage(quotedMessage);

    return super._patch(data);
  }

  processQuotedMessage(quotedMessage) {
    if (!quotedMessage) return;

    const [type] = Object.keys(quotedMessage);
    const message = quotedMessage[type];

    if (['extendedTextMessage', 'conversation'].includes(type)) {
      this.text = message.text || message;
      this.mimetype = 'text/plain';
    } else if (type === 'stickerMessage') {
      this.mimetype = 'image/webp';
      this.sticker = message;
    } else {
      this.mimetype = message?.mimetype || type;
      const [mime] = (this.mimetype || '').split('/');
      if (mime) this[mime] = message;
    }
  }

  async edit(text, opt = {}) {
    return this.client.sendMessage(this.jid, {
      text,
      edit: this.key,
      ...opt,
    });
  }

  async downloadMediaMessage() {
    if (!this.m || !this.m.quoted) throw new Error('No quoted message');
    const buff = await this.m.quoted.download();
    const { ext } = await fileType.fromBuffer(buff);
    const fileBuffer = path.join(os.tmpdir(), `downloaded_media${ext}`);
    await fs.writeFile(fileBuffer, buff);
    return fileBuffer;
  }

  async downloadAndSaveMedia() {
    if (!this.m || !this.m.quoted) throw new Error('No quoted message');
    const filePath = await this.m.quoted.copyNSave();
    return filePath;
  }
}

module.exports = ReplyMessage;
