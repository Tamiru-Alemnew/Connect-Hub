const Room = require("./Room");

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room
  }

  createRoom(roomId) {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;
    const room = new Room(roomId);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  addPeer(roomId, peerId, socketId) {
    let room = this.getRoom(roomId);
    if (!room) {
      room = this.createRoom(roomId);
    }

    if (room.isFull()) {
      throw new Error("Room is full");
    }

    const existingPeers = room.getParticipants().map((p) => p.peerId);
    room.addParticipant(peerId, socketId);
    return existingPeers;
  }

  removePeer(roomId, peerId) {
    const room = this.getRoom(roomId);
    if (!room) return;
    room.removeParticipant(peerId);
    if (room.isEmpty()) {
      this.rooms.delete(roomId);
    }
  }

  findRoomBySocketId(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      const participant = room.getParticipantBySocketId(socketId);
      if (participant) {
        return { roomId, peerId: participant.peerId };
      }
    }
    return null;
  }

  getPeers(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return [];
    return room.getParticipants().map((p) => p.peerId);
  }

  getSocketId(roomId, peerId) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    const participant = room.participants.get(peerId);
    return participant ? participant.socketId : null;
  }
}

module.exports = RoomManager;

