const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Enhances an image using a specified filter type.
 *
 * @async
 * @function remini
 * @param {Buffer|string} image - The image data in a buffer format or the file path of the image.
 * @param {string} filterType - The type of filter to apply. It can be "enhance", "recolor", or "dehaze".
 * @returns {Promise<Buffer>} - A Promise that resolves to the enhanced image buffer.
 */
async function remini(image, filterType) {
 const availableFilters = ['enhance', 'recolor', 'dehaze'];
 filterType = availableFilters.includes(filterType) ? filterType : availableFilters[0];

 const form = new FormData();
 const apiUrl = `https://inferenceengine.vyro.ai/${filterType}`;

 form.append('model_version', 1);

 const imageBuffer = Buffer.isBuffer(image) ? image : fs.readFileSync(image);
 form.append('image', imageBuffer, {
  filename: 'enhance_image_body.jpg',
  contentType: 'image/jpeg',
 });
 try {
  const response = await axios.post(apiUrl, form, {
   headers: {
    ...form.getHeaders(),
    'User-Agent': 'okhttp/4.9.3',
    Connection: 'Keep-Alive',
    'Accept-Encoding': 'gzip',
   },
   responseType: 'arraybuffer',
  });
  return Buffer.from(response.data);
 } catch (error) {
  throw new Error('Error enhancing image: ' + error.message);
 }
}

module.exports = { remini };
