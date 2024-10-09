const { Buffer } = require('buffer');
const { writeFileSync, readFileSync, unlinkSync } = require('fs');
const path = require('path');
const sharp = require('sharp');
const Crypto = require('crypto');
const webp = require('node-webpmux');
const { tmpdir } = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

async function imageToWebp(media) {
  const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`);

  writeFileSync(tmpFileIn, media);

  await new Promise((resolve, reject) => {
    ffmpeg(tmpFileIn)
      .on('error', reject)
      .on('end', () => resolve(true))
      .addOutputOptions(['-vcodec', 'libwebp', '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"])
      .toFormat('webp')
      .save(tmpFileOut);
  });

  const buff = readFileSync(tmpFileOut);
  unlinkSync(tmpFileOut);
  unlinkSync(tmpFileIn);
  return buff;
}

async function videoToWebp(media) {
  const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`);

  writeFileSync(tmpFileIn, media);

  await new Promise((resolve, reject) => {
    ffmpeg(tmpFileIn)
      .on('error', reject)
      .on('end', () => resolve(true))
      .addOutputOptions(['-vcodec', 'libwebp', '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse", '-loop', '0', '-ss', '00:00:00', '-t', '00:00:05', '-preset', 'default', '-an', '-vsync', '0'])
      .toFormat('webp')
      .save(tmpFileOut);
  });

  const buff = readFileSync(tmpFileOut);
  unlinkSync(tmpFileOut);
  unlinkSync(tmpFileIn);
  return buff;
}

async function writeExifImg(media, metadata) {
  let wMedia = await imageToWebp(media);
  const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  writeFileSync(tmpFileIn, wMedia);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      'sticker-pack-id': `https://github.com/FXastro/fxop-md`,
      'sticker-pack-name': metadata.packname,
      'sticker-pack-publisher': metadata.author,
      emojis: metadata.categories ? metadata.categories : [''],
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tmpFileIn);
    unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }
}

async function writeExifVid(media, metadata) {
  let wMedia = await videoToWebp(media);
  const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  writeFileSync(tmpFileIn, wMedia);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      'sticker-pack-id': `https://github.com/FXastro/fxop-md`,
      'sticker-pack-name': metadata.packname,
      'sticker-pack-publisher': metadata.author,
      emojis: metadata.categories ? metadata.categories : [''],
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tmpFileIn);
    unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }
}

async function writeExifWebp(media, metadata) {
  const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  writeFileSync(tmpFileIn, media);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      'sticker-pack-id': `https://github.com/FXastro/fxop-md`,
      'sticker-pack-name': metadata.packname,
      'sticker-pack-publisher': metadata.author,
      emojis: metadata.categories ? metadata.categories : [''],
    };
    const exifAttr = await Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = await Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = await Buffer.concat([exifAttr, jsonBuff]);
    await exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tmpFileIn);
    unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }
}

/**
 * Converts an image (path or buffer) to WebP format.
 * @param {string|Buffer} input - Path to the image or image buffer.
 * @param {string} [outputPath] - Optional path to save the converted WebP image.
 * @returns {Promise<Buffer>} - The WebP buffer.
 */
async function convertToWebP(input, outputPath = null) {
  let image = typeof input === 'string' ? sharp(input) : sharp(input);
  const webpBuffer = await image.toFormat('webp').toBuffer();
  if (outputPath) writeFileSync(outputPath, webpBuffer);
  return webpBuffer;
}

module.exports = {
  imageToWebp,
  videoToWebp,
  writeExifImg,
  writeExifVid,
  writeExifWebp,
  convertToWebP,
};
