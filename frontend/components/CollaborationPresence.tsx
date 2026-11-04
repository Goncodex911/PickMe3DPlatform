"use client";

import React, { useEffect, useState } from "react";
import {
  CollabPeer,
  FloatingReaction,
  NodeLock,
  collabClient,
} from "@/lib/collaborationClient";

interface Props {
  canvasId: string;
  user: { id?: string; name?: string; avatar?: string; color?: string };
  zoom?: number;
  panX?: number;
  panY?: number;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  onFollowPeer?: (peer: CollabPeer) => void;
  primaryColor?: string;
}

export default function CollaborationPresence({
  canvasId,
  user,
  zoom = 1,
  panX = 0,
  panY = 0,
  canvasRef,
  onFollowPeer,
  primaryColor = "#6366f1",
}: Props) {
  const [peers, setPeers] = useState<CollabPeer[]>([]);
  const [locks, setLocks] = useState<NodeLock[]>([]);
  const [connected, setConnected] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    collabClient.connect(canvasId, user);

    const unsubscribe = collabClient.subscribe({
      onPeersChange: (newPeers) => setPeers(newPeers),
      onLocksChange: (newLocks) => setLocks(newLocks),
      onConnectionChange: (status) => setConnected(status),
      onReaction: (rx) => {
        setReactions((prev) => [...prev.slice(-15), rx]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== rx.id));
        }, 3000);
      },
    });

    return () => {
      unsubscribe();
      collabClient.disconnect();
    };
  }, [canvasId, user.id, user.name]);

  useEffect(() => {
    const el = canvasRef?.current;
    if (!el) return;
    const handlePointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const worldX = (clientX - panX) / zoom;
      const worldY = (clientY - panY) / zoom;
      collabClient.sendCursor(worldX, worldY);
    };
    el.addEventListener("pointermove", handlePointerMove);
    return () => el.removeEventListener("pointermove", handlePointerMove);
  }, [canvasRef, zoom, panX, panY]);

  return (
    <>
      {/* ── Live Multi-User Cursors Overlay on Canvas ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 80,
          overflow: "visible",
        }}
      >
        {peers.map((peer) => {
          const screenX = peer.cursor.x * zoom + panX;
          const screenY = peer.cursor.y * zoom + panY;

          if (screenX < -100 || screenY < -100) return null;

          return (
            <div
              key={peer.socketId}
              style={{
                position: "absolute",
                left: screenX,
                top: screenY,
                transition: "left 0.06s linear, top 0.06s linear",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                pointerEvents: "none",
              }}
            >
              {/* SVG Cursor Pointer */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                  fill={peer.color}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Name Tag */}
              <div
                style={{
                  backgroundColor: peer.color,
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  marginTop: -4,
                  marginLeft: 14,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                }}
              >
                {peer.name}
              </div>
            </div>
          );
        })}

        {/* ── Floating Reactions ── */}
        {reactions.map((rx) => {
          const rxScreenX = rx.x * zoom + panX;
          const rxScreenY = rx.y * zoom + panY;

          return (
            <div
              key={rx.id}
              style={{
                position: "absolute",
                left: rxScreenX,
                top: rxScreenY,
                fontSize: 28,
                animation: "floatUp 2.8s ease-out forwards",
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span>{rx.emoji}</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  backgroundColor: rx.color,
                  color: "#fff",
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
              >
                {rx.userName}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.6);
          }
          20% {
            opacity: 1;
            transform: translateY(-20px) scale(1.3);
          }
          100% {
            opacity: 0;
            transform: translateY(-120px) scale(1);
          }
        }
      `}</style>
    </>
  );
}
