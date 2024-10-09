const { Buffer } = require('buffer');
const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Convert Audio to Playable WhatsApp Audio
 * @param {Buffer} buffer Audio Buffer
 * @param {String} ext File Extension
 */
const toAudio = (inputBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = new Readable();
    stream.push(inputBuffer);
    stream.push(null);
    const chunks = [];
    ffmpeg(stream)
      .toFormat('mp3')
      .on('error', (err) => reject(err))
      .on('end', () => {
        resolve(Buffer.concat(chunks));
      })
      .pipe()
      .on('data', (chunk) => chunks.push(chunk));
  });
};

/**
 * Convert audio buffer to WhatsApp PTT format (opus).
 * @param {Buffer} inputBuffer - Buffer containing the input file.
 * @returns {Promise<Buffer>} - Promise resolving to the converted Opus buffer.
 */
const toPTT = (inputBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = new Readable();
    stream.push(inputBuffer);
    stream.push(null);
    const chunks = [];

    ffmpeg(stream)
      .audioCodec('libopus')
      .audioBitrate(128)
      .audioQuality(10)
      .toFormat('opus')
      .on('error', (err) => reject(err))
      .on('end', () => {
        resolve(Buffer.concat(chunks));
      })
      .pipe()
      .on('data', (chunk) => chunks.push(chunk));
  });
};

/**
 * Convert Audio to Playable WhatsApp Video
 * @param {Buffer} buffer Video Buffer
 * @param {String} ext File Extension
 */
function toVideo(buffer, ext) {
  return ffmpeg(buffer, ['-c:v', 'libx264', '-c:a', 'aac', '-ab', '128k', '-ar', '44100', '-crf', '32', '-preset', 'slow'], ext, 'mp4');
}
module.exports = {
  toAudio,
  toPTT,
  toVideo,
};
