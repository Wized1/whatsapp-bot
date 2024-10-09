const Base = require('./base');
const config = require('../config');
const { decodeJid, parsedJid } = require('../utils');

class GroupManager extends Base {
  constructor(client, data) {
    super(client);
    if (data) this._patch(data);
    this.metadata = null;
  }

  _patch(data) {
    const { key, isGroup, message, pushName } = data;
    const senderID = message?.extendedTextMessage?.contextInfo?.participant || key.remoteJid;

    Object.assign(this, {
      user: decodeJid(this.client.user.id),
      key,
      isGroup,
      jid: key.remoteJid,
      senderID,
      pushName,
      participant: parsedJid(data.sender)[0],
      isSudo: config.SUDO.split(',').includes(this.participant?.split('@')[0]) || false,
      fromMe: key.fromMe,
      isOwner: key.fromMe,
    });

    return super._patch(data);
  }

  async ensureMetadata() {
    if (!this.metadata) {
      this.metadata = await this.fetchMetadata();
    }
    return this.metadata;
  }

  async manageParticipants(action, participants) {
    return this.client.groupParticipantsUpdate(this.jid, Array.isArray(participants) ? participants : [participants], action);
  }

  async add(participants) {
    return this.manageParticipants('add', participants);
  }
  async remove(participants) {
    return this.manageParticipants('remove', participants);
  }
  async promote(participants) {
    return this.manageParticipants('promote', participants);
  }
  async demote(participants) {
    return this.manageParticipants('demote', participants);
  }

  async createGroup(name, members = []) {
    return this.client.groupCreate(name, members);
  }

  async leave() {
    return this.client.groupLeave(this.jid);
  }
  async joinByInvite(code) {
    return this.client.groupAcceptInvite(code);
  }
  async joinByInviteV4(groupJid, message) {
    return this.client.groupAcceptInviteV4(groupJid, message);
  }

  async updateName(name) {
    return this.client.groupUpdateSubject(this.jid, name);
  }
  async updateDescription(description) {
    return this.client.groupUpdateDescription(this.jid, description);
  }

  async updatePicture(jid, pp) {
    return this.client.updateProfilePicture(
      jid || this.jid,
      Buffer.isBuffer(pp)
        ? pp
        : {
            url: pp,
          }
    );
  }

  async updateSettings(settings) {
    return this.client.groupSettingUpdate(this.jid, settings);
  }
  async setEphemeral(duration) {
    return this.client.groupToggleEphemeral(this.jid, duration);
  }

  async getInviteCode() {
    return this.client.groupInviteCode(this.jid);
  }
  async revokeInvite() {
    return this.client.groupRevokeInvite(this.jid);
  }
  async getInviteInfo(code) {
    return this.client.groupGetInviteInfo(code);
  }

  async sendInvite(inviteCode, inviteMessage, expiration) {
    return this.client.groupInviteMessage(this.jid, inviteCode, inviteMessage, expiration);
  }

  async fetchMetadata() {
    this.metadata = await this.client.groupMetadata(this.jid);
    return this.metadata;
  }

  async fetchParticipants() {
    await this.ensureMetadata();
    return this.metadata.participants;
  }

  async fetchMemberCount() {
    await this.ensureMetadata();
    return this.metadata.participants.length;
  }

  async isMember(jid) {
    const participants = await this.fetchParticipants();
    return participants.some((participant) => participant.id === jid);
  }

  async isAdmin(jid) {
    const participants = await this.fetchParticipants();
    const participant = participants.find((p) => p.id === jid);
    return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
  }

  async setDisappearingMessages(duration) {
    return this.updateSettings({
      disappearingMessages: duration,
    });
  }

  async setRestrict(isRestricted) {
    return this.updateSettings({
      restrict: isRestricted,
    });
  }
  async setAnnounce(isAnnounce) {
    return this.updateSettings({
      announce: isAnnounce,
    });
  }

  async mute() {
    return this.updateSettings('announcement');
  }
  async unmute() {
    return this.updateSettings('not_announcement');
  }
  async lock() {
    return this.updateSettings('locked');
  }
  async unlock() {
    return this.updateSettings('unlocked');
  }

  async getGroupLink() {
    const code = await this.getInviteCode();
    return `https://chat.whatsapp.com/${code}`;
  }

  async joinViaLink(link) {
    const code = link.split('https://chat.whatsapp.com/')[1];
    return this.joinByInvite(code);
  }

  async getJoinRequests() {
    return this.client.groupRequestParticipantsList(this.jid);
  }
  async approveRequest(jid) {
    return this.client.groupRequestParticipantsUpdate(this.jid, [jid], 'approve');
  }
  async rejectRequest(jid) {
    return this.client.groupRequestParticipantsUpdate(this.jid, [jid], 'reject');
  }
  async bulkApproveRequests(jids) {
    return this.client.groupRequestParticipantsUpdate(this.jid, jids, 'approve');
  }
  async bulkRejectRequests(jids) {
    return this.client.groupRequestParticipantsUpdate(this.jid, jids, 'reject');
  }

  async getGroupStats() {
    await this.ensureMetadata();
    const participants = this.metadata.participants;
    return {
      memberCount: participants.length,
      adminCount: participants.filter((p) => p.admin).length,
      creationTime: this.metadata.creation,
      description: this.metadata.desc,
      owner: this.metadata.owner,
    };
  }

  async kickInactiveMembers(days) {
    const participants = await this.fetchParticipants();
    const now = Date.now();
    const inactiveMembers = participants.filter((p) => {
      return !p.admin && now - p.lastKnownPresence > days * 24 * 60 * 60 * 1000;
    });
    return this.remove(inactiveMembers.map((m) => m.id));
  }

  async massMessage(message, filter = () => true) {
    const participants = await this.fetchParticipants();
    const eligibleParticipants = participants.filter(filter);
    for (const participant of eligibleParticipants) {
      await this.client.sendMessage(participant.id, {
        text: message,
      });
    }
  }

  async pollMembers(question, options) {
    return this.client.sendMessage(this.jid, {
      poll: {
        name: question,
        values: options,
        selectableCount: 1,
      },
    });
  }

  async getActiveMembers(hours = 24) {
    const participants = await this.fetchParticipants();
    const now = Date.now();
    return participants.filter((p) => now - p.lastKnownPresence < hours * 60 * 60 * 1000);
  }

  async setGroupRules(rules) {
    const description = await this.fetchMetadata().then((m) => m.desc);
    const updatedDescription = `${description}\n\nGroup Rules:\n${rules}`;
    return this.updateDescription(updatedDescription);
  }
}

module.exports = GroupManager;
