const config = require('../config');
const { bot, getJson, postJson, toAudio, aptoideDl, toPTT, getBuffer, convertToWebP, twitter, pinterest } = require('../utils');
bot(
  {
    pattern: 'spotify ?(.*)',
    fromMe: false,
    desc: 'Downloads Spotify Music',
    type: 'download',
  },
  async (message, match, m, client) => {
    if (!match || !match.includes('spotify.com')) return await message.reply('*_Provide a valid Spotify link!_*');
    const res = await getJson('https://giftedapis.us.kg/api/download/spotifydl?url=' + encodeURIComponent(match.trim()) + '&apikey=gifted');
    const msg = await message.reply('*_Downloading ' + res.data.title + '_*');
    const audio = await toAudio(res.preview);
    await msg.edit(`*_Download Success_*\n*Song Name: ${res.data.title}*\n*Duration: ${res.data.duration}*`);
    return await message.send(audio, {
      quoted: message,
    });
  }
);

bot(
  {
    pattern: 'fb ?(.*)',
    fromMe: false,
    desc: 'Downloads Facebook Videos | Reels',
    type: 'download',
  },
  async (message, match, m, client) => {
    if (!match || !match.includes('facebook.com')) return await message.reply('*_Provide Vaild Facebook Url_*');
    const res = await getJson('https://api.guruapi.tech/fbvideo?url=' + encodeURIComponent(match.trim() + ''));
    const msg = await message.reply('*_Downloading ' + res.result.title + '_*');
    await msg.react('⬇️');
    await msg.edit('*_Download Success_*');
    await message.send(res.result.hd, {
      caption: res.result.title,
      quoted: msg,
    });
    return await msg.react('✅');
  }
);

bot(
  {
    pattern: 'insta',
    fromMe: false,
    desc: 'Downloads Instagram Videos Only!',
    type: 'download',
  },
  async (message, match, m, client) => {
    if (!match || !match.includes('instagram.com')) return await message.reply('*_Provide a Valid Instagram URL_*');
    const msg = await message.reply('_Downloading_');
    await msg.react('⬇️');
    const res = await getJson(`https://api.guruapi.tech/insta/v1/igdl?url=${encodeURIComponent(match.trim())}`);

    if (res) {
      await msg.edit('_Download Success_');
      await msg.react('✅');
      const extarctedUrl = res.media[0].url.replace(/'/g, '');
      return await message.send(extarctedUrl, {
        quoted: msg,
      });
    } else {
      return await message.sendMessage(message.chat, '```Error From API```');
    }
  }
);

bot(
  {
    pattern: 'tgs ?(.*)',
    fromMe: false,
    desc: 'Downloads Telegram Stickers',
    type: 'download',
  },
  async (message, match, m, client) => {
    if (!match || !match.includes('t.me')) return await message.reply('_Downloads Telegram Stickers_');
    await message.reply('_Downloading Stickers_');
    const res = await getJson('https://giftedapis.us.kg/api/download/tgs?url=' + encodeURIComponent(match.trim()) + '&apikey=gifted');
    for (const stickerUrl of res.results) {
      const stickerBuffer = await getBuffer(stickerUrl);
      const stickerWebp = await convertToWebP(stickerBuffer);
      await message.sendMessage(
        message.jid,
        stickerWebp,
        {
          packname: config.PACKNAME,
          author: config.AUTHOR,
        },
        'sticker'
      );
    }
  }
);

bot(
  {
    pattern: 'drive',
    fromMe: false,
    desc: 'Downloads Files From Google Drive Via Url',
    type: 'download',
  },
  async (message, match, m, client) => {
    if (!match || !match.includes('drive.google.com')) return await message.reply('_Provide Google Drive File Url_');
    await message.reply('_Downloading_');
    const res = await getJson(`https://giftedapis.us.kg/api/download/gdrivedl?url=${encodeURIComponent(match.trim())}&apikey=gifted`);
    return await message.send(res.result.download);
  }
);

bot(
  {
    pattern: 'twitter ?(.*)',
    fromMe: false,
    desc: 'Downloads Twitter Videos',
    type: 'download',
  },
  async (message, match, m) => {
    if (!match || !match.includes('x.com' || 'twitter.com')) return await message.reply('*_Provide Twiiter Url_*');
    await message.reply('_Downloading Video_');
    const res = await twitter(match);
    return await message.send(res);
  }
);

bot(
  {
    pattern: 'pinterest',
    fromMe: false,
    desc: 'Search & Download Pinterest Images',
    type: 'download',
  },
  async (message, match) => {
    if (!match) return message.reply('_Provide Search Query!_');
    const res = await pinterest(match);
    for (const images of res) {
      await message.send(images);
    }
  }
);

bot(
  {
    pattern: 'apk',
    fromMe: false,
    desc: 'Search & Download Apk files',
    type: 'download',
  },
  async (message, match) => {
    if (!match) return message.reply('_Provide Apk Name_');
    const msg = await message.reply(`_Searching for ${match}_`);
    const res = await aptoideDl(match);
    await msg.edit(`_Found ${res.appname}. Downloading..._`);
    const apkBuffer = await getBuffer(res.link);
    await message.bot.sendMessage(
      message.jid,
      {
        document: apkBuffer,
        fileName: `${res.appname}.apk`,
        mimetype: 'application/vnd.android.package-archive',
      },
      {
        quoted: message,
      }
    );
  }
);

bot(
  {
    pattern: 'ytv ?(.*)',
    fromMe: false,
    desc: 'Downloads Youtube Videos From URL',
    type: 'download',
  },
  async (message, match, client) => {
    if (!match || !/^(https:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(match)) {
      return await message.reply('ɴᴇᴇᴅ ʏᴛ ᴜʀʟ');
    }
    const msgdl = await message.reply('_Downloading ' + match + '_');
    const res = await getJson('https://api.guruapi.tech/ytdl/ytmp4?url=' + match);
    const buff = await getBuffer(res.video_url);
    await msgdl.edit(`_Successfully Downloaded ${res.title}_`);
    return await message.send(buff, {
      caption: res.description,
    });
  }
);

bot(
  {
    pattern: 'yta ?(.*)',
    fromeMe: false,
    desc: 'Downloads Youtube Audio From URL',
    type: 'download',
  },
  async (message, match, client) => {
    if (!match || !/^(https:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(match)) {
      return await message.reply('ɴᴇᴇᴅ ʏᴛ ᴜʀʟ');
    }
    const msgdl = await message.reply('_Downloading ' + match + '_');
    const res = await getJson('https://api.guruapi.tech/ytdl/ytmp4?url=' + match);
    const buff = await getBuffer(res.audio_url);
    await msgdl.edit(`_Successfully Downloaded ${res.title}\n${res.author}_`);
    return await message.send(buff);
  }
);
