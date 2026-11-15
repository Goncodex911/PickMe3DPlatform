const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Template = require('../models/Template');
const { userFromToken } = require('../middlewares/authMiddleware');
const { isTemplateOwner } = require('./accessService');

const COLLAB_COLORS = [
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

/** Unsaved-draft rooms carry a random per-tab id (frontend Editor), so they are private by obscurity. */
const DRAFT_ROOM_RE = /^draft-[A-Za-z0-9-]{16,}$/;

function idOf(value) {
  if (!value) return '';
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
}

class CollaborationServer {
  constructor() {
    this.io = null;
    /** Map<canvasId, Map<socketId, PeerInfo>> */
    this.rooms = new Map();
    /** Map<canvasId, Map<nodeId, { socketId, userId, userName }>> */
    this.nodeLocks = new Map();
    /** Map<canvasId, docData> — latest full document of a live room, dropped when the room empties. */
    this.roomDocs = new Map();
  }

  /**
   * May this user join the room? Draft rooms are open; a saved design's room (its Template id)
   * is limited to the design's owner, the only account allowed to edit it.
   * @param {object | null} user authenticated user, or null for an anonymous socket
   * @param {string} canvasId
   */
  async canJoinRoom(user, canvasId) {
    if (DRAFT_ROOM_RE.test(canvasId)) return true;
    if (!user) return false;
    if (mongoose.connection.readyState !== 1 || !mongoose.isValidObjectId(canvasId)) return false;
    const template = await Template.findById(canvasId).select('author isSystem sellerType').lean();
    return isTemplateOwner(user, template);
  }

  init(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Identify the socket from the JWT sent in the handshake; invalid or missing tokens stay anonymous.
    this.io.use(async (socket, next) => {
      try {
        socket.data.user = await userFromToken(socket.handshake?.auth?.token);
      } catch {
        socket.data.user = null;
      }
      next();
    });

    this.io.on('connection', (socket) => {
      let currentCanvasId = null;
      let currentUser = null;
      let joinSeq = 0;

      /** Events are only accepted for the room this socket has actually joined. */
      const inRoom = (canvasId) => Boolean(currentUser && currentCanvasId && canvasId === currentCanvasId);

      const leaveRoom = () => {
        const canvasId = currentCanvasId;
        if (!canvasId) return;
        currentCanvasId = null;
        const leavingUser = currentUser;
        currentUser = null;
        if (typeof socket.leave === 'function') socket.leave(`canvas:${canvasId}`);
        if (!this.rooms.has(canvasId)) return;

        const roomPeers = this.rooms.get(canvasId);
        roomPeers.delete(socket.id);

        const roomLocks = this.nodeLocks.get(canvasId);
        if (roomLocks) {
          for (const [nodeId, lock] of Array.from(roomLocks.entries())) {
            if (lock.socketId === socket.id) {
              roomLocks.delete(nodeId);
            }
          }
        }

        socket.to(`canvas:${canvasId}`).emit('peer:left', {
          socketId: socket.id,
          userId: leavingUser?.id,
        });

        if (roomPeers.size === 0) {
          this.rooms.delete(canvasId);
          this.nodeLocks.delete(canvasId);
          // Drop the cached doc too, otherwise a later joiner receives a stale design.
          this.roomDocs.delete(canvasId);
        }
      };

      // User joins a canvas room
      socket.on('canvas:join', async ({ canvasId, user } = {}) => {
        if (typeof canvasId !== 'string' || !canvasId) return;
        const seq = ++joinSeq;
        const authUser = socket.data?.user || null;

        let allowed = false;
        try {
          allowed = await this.canJoinRoom(authUser, canvasId);
        } catch (err) {
          console.warn('[collab] room access check failed:', err.message);
          allowed = false;
        }
        // A newer join (or a disconnect) happened while the check was running.
        if (seq !== joinSeq || socket.connected === false) return;
        if (!allowed) {
          socket.emit('canvas:denied', { canvasId });
          return;
        }

        if (currentCanvasId) leaveRoom();
        currentCanvasId = canvasId;

        if (!this.rooms.has(canvasId)) {
          this.rooms.set(canvasId, new Map());
          this.nodeLocks.set(canvasId, new Map());
        }

        const roomPeers = this.rooms.get(canvasId);
        const colorIdx = roomPeers.size % COLLAB_COLORS.length;
        const assignedColor = user?.color || COLLAB_COLORS[colorIdx];

        currentUser = {
          socketId: socket.id,
          // Identity comes from the verified token; the client-sent profile only fills in guests.
          id: authUser ? idOf(authUser) : `guest_${socket.id.slice(0, 6)}`,
          name: authUser?.name || user?.name || `Guest_${socket.id.slice(0, 4)}`,
          avatar: authUser?.picture || authUser?.googlePicture || user?.avatar || '',
          color: assignedColor,
          cursor: { x: 0, y: 0 },
          activeFrameId: null,
          selectedNodeIds: [],
          joinedAt: Date.now(),
        };

        const existingPeers = Array.from(roomPeers.values());
        roomPeers.set(socket.id, currentUser);
        socket.join(`canvas:${canvasId}`);

        const currentLocks = Array.from(this.nodeLocks.get(canvasId).entries()).map(([nodeId, lock]) => ({
          nodeId,
          ...lock,
        }));

        const docData = this.roomDocs.get(canvasId) || null;
        socket.emit('canvas:init', {
          self: currentUser,
          peers: existingPeers,
          locks: currentLocks,
          docData,
        });

        // Notify other collaborators in the room
        socket.to(`canvas:${canvasId}`).emit('peer:joined', currentUser);

        // No stored doc yet: ask only the longest-present peer for it, so peers never race to overwrite.
        if (!docData && existingPeers.length > 0) {
          const leader = existingPeers.reduce((a, b) => (a.joinedAt <= b.joinedAt ? a : b));
          this.io.to(leader.socketId).emit('doc:request', { canvasId, requesterSocketId: socket.id });
        }
      });

      // Cursor movement tracking (throttled on client)
      socket.on('cursor:move', ({ canvasId, x, y, activeFrameId } = {}) => {
        if (!inRoom(canvasId)) return;
        currentUser.cursor = { x, y };
        currentUser.activeFrameId = activeFrameId || null;

        socket.to(`canvas:${canvasId}`).emit('cursor:update', {
          socketId: socket.id,
          userId: currentUser.id,
          userName: currentUser.name,
          color: currentUser.color,
          cursor: { x, y },
          activeFrameId: currentUser.activeFrameId,
        });
      });

      // Node selection & locking (prevents conflicting simultaneous edits)
      socket.on('node:select', ({ canvasId, selectedNodeIds } = {}) => {
        if (!inRoom(canvasId)) return;
        currentUser.selectedNodeIds = Array.isArray(selectedNodeIds) ? selectedNodeIds : [];

        const roomLocks = this.nodeLocks.get(canvasId);
        if (roomLocks) {
          // Release previous locks held by this socket
          for (const [nodeId, lock] of Array.from(roomLocks.entries())) {
            if (lock.socketId === socket.id) {
              roomLocks.delete(nodeId);
            }
          }

          // Acquire new locks
          currentUser.selectedNodeIds.forEach(nodeId => {
            roomLocks.set(nodeId, {
              socketId: socket.id,
              userId: currentUser.id,
              userName: currentUser.name,
              color: currentUser.color,
            });
          });
        }

        socket.to(`canvas:${canvasId}`).emit('node:selection_changed', {
          socketId: socket.id,
          userId: currentUser.id,
          userName: currentUser.name,
          color: currentUser.color,
          selectedNodeIds: currentUser.selectedNodeIds,
        });
      });

      // Real-time node delta patch broadcast
      socket.on('node:patch', ({ canvasId, nodeId, patch, source } = {}) => {
        if (!inRoom(canvasId) || !nodeId) return;
        socket.to(`canvas:${canvasId}`).emit('node:patched', {
          socketId: socket.id,
          userId: currentUser.id,
          nodeId,
          patch,
          source: source || 'remote',
        });
      });

      // Full / milestone docData broadcast
      socket.on('doc:broadcast', ({ canvasId, docData, versionMeta } = {}) => {
        if (!inRoom(canvasId) || !docData) return;
        this.roomDocs.set(canvasId, docData);
        socket.to(`canvas:${canvasId}`).emit('doc:updated', {
          socketId: socket.id,
          authorName: currentUser.name || 'Collaborator',
          docData,
          versionMeta,
        });
      });

      // Floating live canvas reaction (🔥, ❤️, 👍, 💡, 🚀)
      socket.on('reaction:send', ({ canvasId, emoji, x, y } = {}) => {
        if (!inRoom(canvasId) || !emoji) return;
        this.io.to(`canvas:${canvasId}`).emit('reaction:broadcast', {
          id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          socketId: socket.id,
          userName: currentUser.name || 'Someone',
          color: currentUser.color || '#3b82f6',
          emoji,
          x: x ?? 0,
          y: y ?? 0,
          createdAt: Date.now(),
        });
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        joinSeq += 1; // cancels a join whose access check is still running
        leaveRoom();
      });
    });

    console.log('⚡ PickMe3D Real-time Collaboration Engine (Socket.io) Initialized');
    return this;
  }
}

const collabServer = new CollaborationServer();
module.exports = collabServer;
