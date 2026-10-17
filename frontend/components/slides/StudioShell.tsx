"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import s from "./studio.module.css";

const PLAN_NAME: Record<string, string> = { free: "Free", pro: "Pro", studio: "Studio" };

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

export default function StudioShell({ plan, active, children }: { plan?: string; active: "slides" | "pricing" | "templates"; children: ReactNode }) {
  const planId = plan && PLAN_NAME[plan] ? plan : "free";
  return (
    <div className={s.root}>
      <header className={s.nav}>
        <div className={`${s.wrap} ${s.navIn}`}>
          <a className={s.brand} href="/" aria-label="PickMe3D, về trang chủ">
            <svg viewBox="0 0 40 44" fill="none" aria-hidden="true"><path d="M20 1 38 11.5 20 22 2 11.5 20 1ZM2 15l16 9.5V43L2 33V15ZM22 24.5 38 15v18L22 43V24.5Z" fill="currentColor" /></svg>
            <span>PickMe<i>3D</i></span>
          </a>
          <nav className={s.links} aria-label="Chính">
            <a href="/slides/" aria-current={active === "slides" ? "page" : undefined}>Slides</a>
            <a href="/templates/" aria-current={active === "templates" ? "page" : undefined}>Thư viện mẫu</a>
            <a href="/pricing/" aria-current={active === "pricing" ? "page" : undefined}>Bảng giá</a>
          </nav>
          <a className={s.planPill} href="/pricing/" data-plan={planId} aria-label={`Gói hiện tại: ${PLAN_NAME[planId]}`}>
            <span className={s.dot} />
            {PLAN_NAME[planId]}
          </a>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
