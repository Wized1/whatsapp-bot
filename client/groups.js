const { Readable } = require('stream');
const fs = require('fs').promises;

/**
 * @class UserProfileManager
 * @description Manages user profile operations in the chat application
 */
class UserProfileManager {
 /**
  * @param {Object} client - The client object
  */
 constructor(client) {
  this.client = client;
 }

 /**
  * @param {string} name - The new display name
  * @returns {Promise<void>}
  */
 async updateDisplayName(name) {
  await this.client.updateProfileName(name);
 }

 /**
  * @param {string} status - The new status message
  * @returns {Promise<void>}
  */
 async updateStatus(status) {
  await this.client.updateProfileStatus(status);
 }

 /**
  * @param {Buffer|string} image - The new profile picture (as a buffer or file path)
  * @returns {Promise<void>}
  * @throws {Error} If the image input is invalid
  */
 async updateProfilePicture(image) {
  let imgBuffer = Buffer.isBuffer(image) ? image : await fs.readFile(image);
  const stream = Readable.from(imgBuffer);
  await this.client.updateProfilePicture(this.client.user.id, stream);
 }

 /**
  * @param {'all'|'contacts'|'none'} value - The privacy setting
  * @returns {Promise<void>}
  */
 async setLastSeenPrivacy(value) {
  await this.client.updateLastSeenPrivacy(value);
 }

 /**
  * @param {'all'|'contacts'|'none'} value - The privacy setting
  * @returns {Promise<void>}
  */
 async setProfilePicturePrivacy(value) {
  await this.client.updateProfilePicturePrivacy(value);
 }

 /**
  * @param {'all'|'contacts'|'none'} value - The privacy setting
  * @returns {Promise<void>}
  */
 async setStatusPrivacy(value) {
  await this.client.updateStatusPrivacy(value);
 }

 /**
  * @param {'all'|'none'} value - The privacy setting
  * @returns {Promise<void>}
  */
 async setReadReceiptsPrivacy(value) {
  await this.client.updateReadReceiptsPrivacy(value);
 }

 /**
  * @param {string} jid - The JID of the user
  * @returns {Promise<Object>} The status and formatted set time
  */
 async getStatus(jid) {
  const result = await this.client.fetchStatus(jid);
  return {
   status: result.status,
   setAt: new Date(result.setAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
   }),
  };
 }
}

module.exports = UserProfileManager;
