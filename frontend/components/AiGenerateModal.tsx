"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Palette } from "@/lib/tokens";
import { Icon } from "./M3Node";

export interface AiGenerateModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, screenCount: number) => Promise<void>;
  p: Palette;
  aiReady: boolean;
  onOpenSettings: () => void;
}

const SAMPLE_PROMPTS = [
  { icon: "restaurant", label: "Food delivery app", prompt: "A food delivery app with a Discover screen, restaurant categories, and a checkout cart." },
  { icon: "shopping_bag", label: "Fashion store", prompt: "A modern fashion store with a promotion banner, featured products, and category filters." },
  { icon: "account_balance_wallet", label: "Digital wallet", prompt: "A digital banking app with an account balance, quick transfers, and detailed transaction history." },
  { icon: "chat", label: "Messaging app", prompt: "A recent chat list with online avatars and a detailed conversation screen." },
  { icon: "music_note", label: "Music player", prompt: "A music app with curated playlists, a now-playing bar, and full playback controls." },
  { icon: "fitness_center", label: "Fitness tracker", prompt: "A fitness app showing calories, daily steps, and a personal workout schedule." },
];

export default function AiGenerateModal({
  open,
  onClose,
  onGenerate,
  p,
  aiReady,
  onOpenSettings,
}: AiGenerateModalProps) {
  const [prompt, setPrompt] = useState("");
  const [screenCount, setScreenCount] = useState<number>(2);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim() || busy) return;
    if (!aiReady) {
      setErrorMsg("Add an API key in AI Settings before generating screens.");
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setStatusText("AI is analyzing your idea...");

    const t1 = setTimeout(() => {
      setStatusText("Designing Material 3 Expressive components...");
    }, 2500);

    const t2 = setTimeout(() => {
      setStatusText("Finishing the layout and syncing screens to Canvas...");
    }, 6000);

    try {
      await onGenerate(prompt.trim(), screenCount);
      clearTimeout(t1);
      clearTimeout(t2);
      onClose();
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setErrorMsg("Couldn’t generate the interface. Please try again.");
    } finally {
      setBusy(false);
      setStatusText("");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ai-modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={busy ? undefined : onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 650,
            background: "rgba(0, 0, 0, 0.45)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <motion.div
            role="dialog"
            aria-modal
            initial={{ scale: 0.94, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 480, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(100%, 640px)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "26px 28px",
              borderRadius: 28,
              background: p.surfaceContainerHigh,
              color: p.onSurface,
              boxShadow: "0 16px 40px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              border: `1px solid ${p.outlineVariant}55`,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: "linear-gradient(135deg, #6366F1 0%, #A855F7 100%)",
                  color: "#FFFFFF",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 4px 12px rgba(168, 85, 247, 0.35)",
                }}
              >
                <Icon name="auto_awesome" size={24} fill />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: -0.2 }}>
                  Generate screens with AI
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: p.onSurfaceVariant }}>
                  Describe your idea and AI will build a complete interface for you.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  border: "none",
                  background: p.surfaceContainerHighest,
                  color: p.onSurfaceVariant,
                  cursor: busy ? "not-allowed" : "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
                title="Close"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Prompt input */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: p.onSurfaceVariant,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Describe the interface you want to create
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="For example: Create a travel app with a destination discovery screen featuring large photo cards and a tour details screen with a prominent booking button..."
                rows={4}
                autoFocus
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: `1px solid ${p.outlineVariant}`,
                  background: p.surface,
                  color: p.onSurface,
                  fontSize: 14,
                  lineHeight: 1.5,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Quick Suggestions */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: p.onSurfaceVariant, marginBottom: 8 }}>
                💡 Quick ideas:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SAMPLE_PROMPTS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    disabled={busy}
                    onClick={() => setPrompt(sample.prompt)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 500,
                      border: `1px solid ${p.outlineVariant}`,
                      background: p.surfaceContainerHighest,
                      color: p.onSurface,
                      cursor: busy ? "default" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 140ms ease",
                    }}
                  >
                    <Icon name={sample.icon} size={15} color={p.primary} />
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scope / Number of screens selector */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: p.onSurfaceVariant }}>
                Number of screens:
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { count: 1, label: "1 standalone screen" },
                  { count: 2, label: "2 connected screens" },
                  { count: 3, label: "Full flow (3 screens)" },
                ].map((item) => {
                  const active = screenCount === item.count;
                  return (
                    <button
                      key={item.count}
                      type="button"
                      disabled={busy}
                      onClick={() => setScreenCount(item.count)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 14,
                        fontSize: 12,
                        fontWeight: active ? 700 : 500,
                        border: `1px solid ${active ? p.primary : p.outlineVariant}`,
                        background: active ? p.primaryContainer : p.surface,
                        color: active ? p.onPrimaryContainer : p.onSurfaceVariant,
                        cursor: busy ? "default" : "pointer",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  fontSize: 13,
                  lineHeight: 1.45,
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "#dc2626",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span>✕ {errorMsg}</span>
                {!aiReady && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 10,
                      border: "none",
                      background: "#dc2626",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Open AI Settings
                  </button>
                )}
              </div>
            )}

            {/* Loading status text */}
            {busy && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: p.primaryContainer,
                  color: p.onPrimaryContainer,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <span className="m3-spin" style={{ display: "inline-flex" }}>
                  <Icon name="progress_activity" size={20} />
                </span>
                <span>{statusText || "Working..."}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                style={{
                  height: 42,
                  padding: "0 18px",
                  borderRadius: 21,
                  border: "none",
                  background: "transparent",
                  color: p.onSurfaceVariant,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={busy || !prompt.trim()}
                className="m3-press"
                style={{
                  height: 44,
                  padding: "0 24px",
                  borderRadius: 22,
                  border: "none",
                  background: (!prompt.trim() || busy)
                    ? p.surfaceContainerHighest
                    : "linear-gradient(135deg, #6366F1 0%, #A855F7 100%)",
                  color: (!prompt.trim() || busy) ? p.onSurfaceVariant : "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: (!prompt.trim() || busy) ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: (!prompt.trim() || busy)
                    ? "none"
                    : "0 4px 14px rgba(168, 85, 247, 0.4)",
                  transition: "all 160ms ease",
                }}
              >
                <Icon name={busy ? "progress_activity" : "auto_awesome"} size={18} fill />
                {busy ? "Generating screens..." : "Generate interface"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
