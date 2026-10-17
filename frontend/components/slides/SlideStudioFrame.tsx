"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { buildInitMessage, isTrustedOrigin, parseStudioMessage, STUDIO_URL, studioOrigin, type StudioMessage } from "@/lib/slideBridge";

type SaveMessage = Extract<StudioMessage, { type: "PM_SAVE" }>;
type FeatureMessage = Extract<StudioMessage, { type: "PM_REQUEST_FEATURE" }>;

export interface SlideStudioHandle {
  // Bắt studio lưu ngay (không chờ debounce) và đợi host ghi xong
  flush: () => Promise<void>;
  insertDesign: (imageUrl: string) => void;
}

export default function SlideStudioFrame({
  ref,
  deck,
  plan,
  userName,
  designs,
  features,
  mode = "edit",
  openExport,
  onSave,
  onFeature,
  onSaving,
}: {
  ref?: Ref<SlideStudioHandle>;
  deck: unknown;
  plan: string;
  userName: string;
  designs: unknown[];
  features?: { exportPptx?: boolean; watermark?: boolean };
  mode?: "edit" | "view";
  // Mở sẵn hộp xuất file của studio sau khi nạp deck (từ trang chi tiết deck)
  openExport?: "pptx" | "pdf" | "image";
  onSave?: (message: SaveMessage) => Promise<void> | void;
  onFeature?: (message: FeatureMessage) => void;
  onSaving?: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const deckRef = useRef(deck);
  const planRef = useRef(plan);
  const designsRef = useRef(designs);
  const featuresRef = useRef(features);
  featuresRef.current = features;
  const handlers = useRef({ onSave, onFeature, onSaving });
  const pending = useRef(new Map<string, () => void>());
  const sentFor = useRef("");
  deckRef.current = deck;
  planRef.current = plan;
  designsRef.current = designs;
  handlers.current = { onSave, onFeature, onSaving };

  const send = (message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(message, studioOrigin());
  };

  const sendInit = () => {
    if (!deckRef.current) return;
    send(buildInitMessage({
      deck: deckRef.current,
      plan: planRef.current,
      user: { name: userName },
      designs: designsRef.current,
      features: featuresRef.current,
    }));
  };

  const settle = (requestId?: string) => {
    if (!requestId) return;
    pending.current.get(requestId)?.();
    pending.current.delete(requestId);
  };

  useImperativeHandle(ref, () => ({
    flush: () => new Promise<void>((resolve) => {
      if (!frameRef.current?.contentWindow) return resolve();
      const requestId = `f${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      const timeout = window.setTimeout(() => settle(requestId), 5000);
      pending.current.set(requestId, () => {
        window.clearTimeout(timeout);
        resolve();
      });
      send({ type: "PM_FLUSH", requestId });
    }),
    insertDesign: (imageUrl: string) => send({ type: "PM_INSERT_DESIGN", imageUrl }),
  }));

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (!isTrustedOrigin(event.origin)) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = parseStudioMessage(event.data);
      if (!message) return;
      if (message.type === "PM_READY") {
        sendInit();
        if (openExport) send({ type: "PM_OPEN_EXPORT", format: openExport });
      }
      if (message.type === "PM_SAVE_STATUS") {
        if (message.status === "saving") handlers.current.onSaving?.();
        else settle(message.requestId);
      }
      if (message.type === "PM_SAVE") {
        try {
          await handlers.current.onSave?.(message);
        } finally {
          settle(message.requestId);
        }
      }
      if (message.type === "PM_REQUEST_FEATURE") handlers.current.onFeature?.(message);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [userName, openExport]);

  useEffect(() => {
    const deckId = (deck as { id?: string } | null)?.id || "";
    if (!deckId || sentFor.current === deckId) return;
    sentFor.current = deckId;
    sendInit();
  }, [deck, userName]);

  // Tài khoản tải sau deck: báo lại gói cho studio khi nó thay đổi
  useEffect(() => {
    send({ type: "PM_PLAN", plan, features: features || null });
  }, [plan, features?.exportPptx, features?.watermark]);

  return (
    <iframe
      ref={frameRef}
      title="Slide Studio"
      src={mode === "view" ? `${STUDIO_URL}?mode=view` : STUDIO_URL}
      allow="fullscreen; clipboard-read; clipboard-write"
      allowFullScreen
      className="h-full w-full border-0 bg-[#090d16]"
    />
  );
}
