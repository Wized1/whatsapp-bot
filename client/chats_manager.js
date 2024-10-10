const { proto } = require('baileys');
const { Readable } = require('stream');
const Message = require('./message');

class UserProfileManager {
 constructor(client) {
  this.client = client;
 }

 /**
  * Update the user's display name
  * @param {string} name - The new display name
  */
 async updateDisplayName(name) {
  await this.client.updateProfileName(name);
 }

 /**
  * Update the user's status (about)
  * @param {string} status - The new status message
  */
 async updateStatus(status) {
  await this.client.updateProfileStatus(status);
 }

 /**
  * Update the user's profile picture
  * @param {Buffer|string} image - The new profile picture (as a buffer or file path)
  */
 async updateProfilePicture(image) {
  let imgBuffer;
  if (typeof image === 'string') {
   // If image is a file path, read it into a buffer
   const { promises: fs } = require('fs');
   imgBuffer = await fs.readFile(image);
  } else if (Buffer.isBuffer(image)) {
   imgBuffer = image;
  } else {
   throw new Error('Invalid image input. Must be a file path or Buffer.');
  }

  const stream = new Readable();
  stream.push(imgBuffer);
  stream.push(null);

  await this.client.updateProfilePicture(this.client.user.id, stream);
 }

 /**
  * Set the "last seen" privacy setting
  * @param {'all'|'contacts'|'none'} value - The privacy setting
  */
 async setLastSeenPrivacy(value) {
  await this.client.updateLastSeenPrivacy(value);
 }

 /**
  * Set the profile picture privacy setting
  * @param {'all'|'contacts'|'none'} value - The privacy setting
  */
 async setProfilePicturePrivacy(value) {
  await this.client.updateProfilePicturePrivacy(value);
 }

 /**
  * Set the status privacy setting
  * @param {'all'|'contacts'|'none'} value - The privacy setting
  */
 async setStatusPrivacy(value) {
  await this.client.updateStatusPrivacy(value);
 }

 /**
  * Set the read receipts privacy setting
  * @param {'all'|'none'} value - The privacy setting
  */
 async setReadReceiptsPrivacy(value) {
  await this.client.updateReadReceiptsPrivacy(value);
 }

 async getStatus(jid) {
  const result = await this.client.fetchStatus(jid);
  const formattedDate = new Date(result.setAt).toLocaleString('en-US', {
   year: 'numeric',
   month: 'long',
   day: 'numeric',
   hour: '2-digit',
   minute: '2-digit',
   second: '2-digit',
   hour12: true,
  });

  return {
   status: result.status,
   setAt: formattedDate,
  };
 }
}

module.exports = UserProfileManager;
