const { Server } = require('socket.io');

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

class CollaborationServer {
  constructor() {
    this.io = null;
    /** Map<canvasId, Map<socketId, PeerInfo>> */
    this.rooms = new Map();
    /** Map<canvasId, Map<nodeId, { socketId, userId, userName }>> */
    this.nodeLocks = new Map();
    this.roomDocs = new Map();
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

    this.io.on('connection', (socket) => {
      let currentCanvasId = null;
      let currentUser = null;

      // User joins a canvas room
      socket.on('canvas:join', ({ canvasId, user }) => {
        if (!canvasId) return;
        currentCanvasId = canvasId;

        // Assign a distinct color if not provided
        if (!this.rooms.has(canvasId)) {
          this.rooms.set(canvasId, new Map());
          this.nodeLocks.set(canvasId, new Map());
        }

        const roomPeers = this.rooms.get(canvasId);
        const colorIdx = roomPeers.size % COLLAB_COLORS.length;
        const assignedColor = user?.color || COLLAB_COLORS[colorIdx];

        currentUser = {
          socketId: socket.id,
          id: user?.id || `guest_${socket.id.slice(0, 6)}`,
          name: user?.name || `Guest_${socket.id.slice(0, 4)}`,
          avatar: user?.avatar || '',
          color: assignedColor,
          cursor: { x: 0, y: 0 },
          activeFrameId: null,
          selectedNodeIds: [],
          joinedAt: Date.now(),
        };

        roomPeers.set(socket.id, currentUser);
        socket.join(`canvas:${canvasId}`);

        // Send existing collaborators & locks to the newly joined peer
        const existingPeers = Array.from(roomPeers.values()).filter(p => p.socketId !== socket.id);
        const currentLocks = Array.from(this.nodeLocks.get(canvasId).entries()).map(([nodeId, lock]) => ({
          nodeId,
          ...lock,
        }));

        socket.emit('canvas:init', {
          self: currentUser,
          peers: existingPeers,
          locks: currentLocks,
          docData: this.roomDocs.get(canvasId) || null,
        });

        // Notify other collaborators in the room
        socket.to(`canvas:${canvasId}`).emit('peer:joined', currentUser);
      });

      // Cursor movement tracking (throttled on client)
      socket.on('cursor:move', ({ canvasId, x, y, activeFrameId }) => {
        if (!canvasId || !currentUser) return;
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
      socket.on('node:select', ({ canvasId, selectedNodeIds }) => {
        if (!canvasId || !currentUser) return;
        currentUser.selectedNodeIds = selectedNodeIds || [];

        const roomLocks = this.nodeLocks.get(canvasId);
        if (roomLocks) {
          // Release previous locks held by this socket
          for (const [nodeId, lock] of Array.from(roomLocks.entries())) {
            if (lock.socketId === socket.id) {
              roomLocks.delete(nodeId);
            }
          }

          // Acquire new locks
          if (Array.isArray(selectedNodeIds)) {
            selectedNodeIds.forEach(nodeId => {
              roomLocks.set(nodeId, {
                socketId: socket.id,
                userId: currentUser.id,
                userName: currentUser.name,
                color: currentUser.color,
              });
            });
          }
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
      socket.on('node:patch', ({ canvasId, nodeId, patch, source }) => {
        if (!canvasId || !nodeId) return;
        socket.to(`canvas:${canvasId}`).emit('node:patched', {
          socketId: socket.id,
          userId: currentUser?.id,
          nodeId,
          patch,
          source: source || 'remote',
        });
      });

      // Full / milestone docData broadcast
      socket.on('doc:broadcast', ({ canvasId, docData, versionMeta }) => {
        if (!canvasId || !docData) return;
        this.roomDocs.set(canvasId, docData);
        socket.to(`canvas:${canvasId}`).emit('doc:updated', {
          socketId: socket.id,
          authorName: currentUser?.name || 'Collaborator',
          docData,
          versionMeta,
        });
      });

      // Floating live canvas reaction (🔥, ❤️, 👍, 💡, 🚀)
      socket.on('reaction:send', ({ canvasId, emoji, x, y }) => {
        if (!canvasId || !emoji) return;
        this.io.to(`canvas:${canvasId}`).emit('reaction:broadcast', {
          id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          socketId: socket.id,
          userName: currentUser?.name || 'Someone',
          color: currentUser?.color || '#3b82f6',
          emoji,
          x: x ?? 0,
          y: y ?? 0,
          createdAt: Date.now(),
        });
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        if (currentCanvasId && this.rooms.has(currentCanvasId)) {
          const roomPeers = this.rooms.get(currentCanvasId);
          roomPeers.delete(socket.id);

          const roomLocks = this.nodeLocks.get(currentCanvasId);
          if (roomLocks) {
            for (const [nodeId, lock] of Array.from(roomLocks.entries())) {
              if (lock.socketId === socket.id) {
                roomLocks.delete(nodeId);
              }
            }
          }

          socket.to(`canvas:${currentCanvasId}`).emit('peer:left', {
            socketId: socket.id,
            userId: currentUser?.id,
          });

          if (roomPeers.size === 0) {
            this.rooms.delete(currentCanvasId);
            this.nodeLocks.delete(currentCanvasId);
          }
        }
      });
    });

    console.log('⚡ PickMe3D Real-time Collaboration Engine (Socket.io) Initialized');
    return this;
  }
}

const collabServer = new CollaborationServer();
module.exports = collabServer;

