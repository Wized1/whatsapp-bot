const { bot, remini, enhanceImage, getJson, getBuffer, localBuffer } = require('../utils');

bot(
  {
    pattern: 'upscale',
    fromMe: false,
    desc: 'Upscales Images',
    type: 'ai',
  },
  async (message, match, m, client) => {
    if (!m.quoted) return await message.reply('*_Reply An Image Only!_*');
    let buff = await m.quoted.copyNSave();
    const media = await localBuffer(buff);
    const upscaled = await remini(media, 'enhance');
    return await message.send(upscaled);
  }
);

bot(
  {
    pattern: 'enhance',
    fromMe: false,
    desc: 'Increase Image Resolution',
    type: 'ai',
  },
  async (message, match, m, client) => {
    if (!m.quoted) return await message.reply('*_Reply Image Only!_*');
    let buff = await m.quoted.download();
    const image = await enhanceImage(buff, 'enhance');
    return await message.send(image, {
      jid: message.jid,
      quoted: m.quoted,
    });
  }
);

bot(
  {
    pattern: 'dehaze',
    fromMe: false,
    desc: 'Dehazes Images',
    type: 'ai',
  },
  async (message, match, m, client) => {
    if (!m.quoted) return await message.reply('*_Reply Image Only!_*');
    let buff = await m.quoted.download();
    const image = await enhanceImage(buff, 'dehaze');
    return await message.send(image);
  }
);

bot(
  {
    pattern: 'recolor',
    fromMe: false,
    desc: 'Recolors Poor Images',
    type: 'ai',
  },
  async (message, match, m, client) => {
    if (!m.quoted) return await message.reply('*_Reply Image Only!_*');
    let buff = await m.quoted.download();
    const image = await enhanceImage(buff, 'recolor');
    return await message.send(image);
  }
);
