const { MEDIA } = require('../config');
const { localBuffer, getBuffer } = require('./data_buffers');
const path = require('path');
async function images() {
 if (!MEDIA) {
  const defaultMedia = await localBuffer(path.join(__dirname, '../assets/images/thumb.jpg'));
  return defaultMedia;
 } else {
  const mediaUrls = MEDIA.split(';');
  const buffers = [];
  for (const url of mediaUrls) {
   const buffer = await getBuffer(url);
   buffers.push(buffer);
  }
  const randomIndex = Math.floor(Math.random() * buffers.length);
  return buffers[randomIndex];
 }
}
module.exports = { images };
