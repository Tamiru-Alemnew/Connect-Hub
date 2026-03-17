class Room {
  constructor(roomId) {
    this.id = roomId;
    this.participants = new Map(); // peerId -> { socketId }
    this.createdAt = Date.now();
    this.maxParticipants = 10;
  }

  addParticipant(peerId, socketId) {
    this.participants.set(peerId, { socketId });
    return this.participants.size;
  }

  removeParticipant(peerId) {
    return this.participants.delete(peerId);
  }

  getParticipants() {
    return Array.from(this.participants.entries()).map(([peerId, data]) => ({
      peerId,
      socketId: data.socketId,
    }));
  }

  getParticipantBySocketId(socketId) {
    for (const [peerId, data] of this.participants.entries()) {
      if (data.socketId === socketId) {
        return { peerId, socketId };
      }
    }
    return null;
  }

  isFull() {
    return this.participants.size >= this.maxParticipants;
  }

  isEmpty() {
    return this.participants.size === 0;
  }

  get participantCount() {
    return this.participants.size;
  }
}

module.exports = Room;

