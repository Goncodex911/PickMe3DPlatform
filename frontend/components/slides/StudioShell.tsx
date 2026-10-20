"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import s from "./studio.module.css";

export function Icon({ name, className }: { name: string; className?: string }) {
  return <span className={`msr ${s.ms} ${className || ""}`} aria-hidden="true">{name}</span>;
}

export function Arrow() {
  return <span className={s.arrow} aria-hidden="true">↗</span>;
}

export function useToast() {
  const [text, setText] = useState("");
  const timer = useRef<number>(0);
  const show = useCallback((message: string) => {
    setText(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setText(""), 2400);
  }, []);
  const node = text ? <div className={s.toast} role="status">{text}</div> : null;
  return [node, show] as const;
}

// plan giữ trong props cho các trang đang truyền vào; thanh điều hướng chung không hiện gói
export default function StudioShell({ children }: { plan?: string; active: "slides" | "pricing" | "templates"; children: ReactNode }) {
  return (
    <div className={s.root}>
      <main>{children}</main>
    </div>
  );
}
