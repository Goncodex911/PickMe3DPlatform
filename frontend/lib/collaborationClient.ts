"use client";

import { io, Socket } from "socket.io-client";

export interface CollabPeer {
  socketId: string;
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor: { x: number; y: number };
  activeFrameId?: string | null;
  selectedNodeIds?: string[];
  joinedAt: number;
}

export interface NodeLock {
  nodeId: string;
  socketId: string;
  userId: string;
  userName: string;
  color: string;
}

export interface FloatingReaction {
  id: string;
  socketId: string;
  userName: string;
  color: string;
  emoji: string;
  x: number;
  y: number;
  createdAt: number;
}

export type CollabListener = {
  onPeersChange?: (peers: CollabPeer[]) => void;
  onLocksChange?: (locks: NodeLock[]) => void;
  onCursorMove?: (peer: CollabPeer) => void;
  onNodePatch?: (data: { nodeId: string; patch: any; source: string }) => void;
  onDocSync?: (data: { docData: any; authorName: string }) => void;
  onReaction?: (reaction: FloatingReaction) => void;
  onConnectionChange?: (connected: boolean) => void;
};

class CollaborationClient {
  private socket: Socket | null = null;
  private canvasId: string | null = null;
  private currentUser: any = null;
  private peers: Map<string, CollabPeer> = new Map();
  private locks: Map<string, NodeLock> = new Map();
  private listeners: Set<CollabListener> = new Set();
  private lastCursorEmit = 0;
  private cursorThrottleMs = 40; // ~25 FPS

  public connect(canvasId: string, user: { id?: string; name?: string; avatar?: string; color?: string }) {
    if (this.socket && this.canvasId === canvasId) {
      return;
    }

    this.disconnect();
    this.canvasId = canvasId;
    this.currentUser = user;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:5001";

    this.socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      this.notifyConnection(true);
      this.socket?.emit("canvas:join", {
        canvasId: this.canvasId,
        user: this.currentUser,
      });
    });

    this.socket.on("disconnect", () => {
      this.notifyConnection(false);
    });

    this.socket.on("canvas:init", ({ self, peers, locks, docData }: any) => {
      if (self) this.currentUser = self;
      this.peers.clear();
      if (Array.isArray(peers)) {
        peers.forEach((p) => this.peers.set(p.socketId, p));
      }
      this.locks.clear();
      if (Array.isArray(locks)) {
        locks.forEach((l) => this.locks.set(l.nodeId, l));
      }
      this.notifyPeers();
      this.notifyLocks();
      if (docData) {
        this.listeners.forEach((l) => l.onDocSync && l.onDocSync({ docData, authorName: "Server" }));
      }
    });

    this.socket.on("peer:joined", (peer: CollabPeer) => {
      this.peers.set(peer.socketId, peer);
      this.notifyPeers();
    });

    this.socket.on("peer:left", ({ socketId }: any) => {
      this.peers.delete(socketId);
      // Clean up locks from this peer
      for (const [nodeId, lock] of Array.from(this.locks.entries())) {
        if (lock.socketId === socketId) {
          this.locks.delete(nodeId);
        }
      }
      this.notifyPeers();
      this.notifyLocks();
    });

    this.socket.on("cursor:update", (data: any) => {
      const existing = this.peers.get(data.socketId);
      if (existing) {
        existing.cursor = data.cursor;
        existing.activeFrameId = data.activeFrameId;
        this.listeners.forEach((l) => l.onCursorMove && l.onCursorMove(existing));
      }
    });

    this.socket.on("node:selection_changed", ({ socketId, selectedNodeIds, userId, userName, color }: any) => {
      const peer = this.peers.get(socketId);
      if (peer) {
        peer.selectedNodeIds = selectedNodeIds;
      }
      // Update locks
      for (const [nodeId, lock] of Array.from(this.locks.entries())) {
        if (lock.socketId === socketId) {
          this.locks.delete(nodeId);
        }
      }
      if (Array.isArray(selectedNodeIds)) {
        selectedNodeIds.forEach((nodeId) => {
          this.locks.set(nodeId, { nodeId, socketId, userId, userName, color });
        });
      }
      this.notifyPeers();
      this.notifyLocks();
    });

    this.socket.on("node:patched", (data: any) => {
      this.listeners.forEach((l) => l.onNodePatch && l.onNodePatch(data));
    });

    this.socket.on("doc:updated", (data: any) => {
      this.listeners.forEach((l) => l.onDocSync && l.onDocSync(data));
    });

    this.socket.on("reaction:broadcast", (reaction: FloatingReaction) => {
      this.listeners.forEach((l) => l.onReaction && l.onReaction(reaction));
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.peers.clear();
    this.locks.clear();
    this.notifyPeers();
    this.notifyLocks();
    this.notifyConnection(false);
  }

  public sendCursor(x: number, y: number, activeFrameId?: string | null) {
    if (!this.socket || !this.canvasId) return;
    const now = Date.now();
    if (now - this.lastCursorEmit < this.cursorThrottleMs) return;
    this.lastCursorEmit = now;

    this.socket.emit("cursor:move", {
      canvasId: this.canvasId,
      x: Math.round(x),
      y: Math.round(y),
      activeFrameId,
    });
  }

  public selectNodes(nodeIds: string[]) {
    if (!this.socket || !this.canvasId) return;
    this.socket.emit("node:select", {
      canvasId: this.canvasId,
      selectedNodeIds: nodeIds,
    });
  }

  public patchNode(nodeId: string, patch: any) {
    if (!this.socket || !this.canvasId) return;
    this.socket.emit("node:patch", {
      canvasId: this.canvasId,
      nodeId,
      patch,
    });
  }

  public broadcastDoc(docData: any, versionMeta?: any) {
    if (!this.socket || !this.canvasId) return;
    this.socket.emit("doc:broadcast", {
      canvasId: this.canvasId,
      docData,
      versionMeta,
    });
  }

  public sendReaction(emoji: string, x: number, y: number) {
    if (!this.socket || !this.canvasId) return;
    this.socket.emit("reaction:send", {
      canvasId: this.canvasId,
      emoji,
      x: Math.round(x),
      y: Math.round(y),
    });
  }

  public subscribe(listener: CollabListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial state
    listener.onPeersChange && listener.onPeersChange(Array.from(this.peers.values()));
    listener.onLocksChange && listener.onLocksChange(Array.from(this.locks.values()));
    listener.onConnectionChange && listener.onConnectionChange(Boolean(this.socket?.connected));

    return () => {
      this.listeners.delete(listener);
    };
  }

  public getPeers(): CollabPeer[] {
    return Array.from(this.peers.values());
  }

  public getLocks(): NodeLock[] {
    return Array.from(this.locks.values());
  }

  private notifyPeers() {
    const list = Array.from(this.peers.values());
    this.listeners.forEach((l) => l.onPeersChange && l.onPeersChange(list));
  }

  private notifyLocks() {
    const list = Array.from(this.locks.values());
    this.listeners.forEach((l) => l.onLocksChange && l.onLocksChange(list));
  }

  private notifyConnection(connected: boolean) {
    this.listeners.forEach((l) => l.onConnectionChange && l.onConnectionChange(connected));
  }
}

export const collabClient = new CollaborationClient();

