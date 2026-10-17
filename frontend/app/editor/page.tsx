"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import { isLang, setGlobalLang, type Lang } from "@/lib/i18n";

const loadEditor = () => import("../Editor");
if (typeof window !== "undefined") void loadEditor();

const Editor = dynamic(loadEditor, { ssr: false, loading: () => null });

function Boot({ done }: { done: boolean }) {
  return (
    <div className="m3e-boot" data-done={done ? "" : undefined} aria-busy={!done} aria-hidden={done}>
      <Skeleton />
    </div>
  );
}

function initialLanguage(): Lang {
  try {
    const ui = JSON.parse(localStorage.getItem("m3e:ui") ?? "null");
    if (isLang(ui?.lang)) return ui.lang;
  } catch {}
  const language = (navigator.language ?? "").toLowerCase();
  return language.startsWith("zh") ? "zh" : language.startsWith("ko") ? "ko" : language.startsWith("ja") ? "ja" : "en";
}

const BOOT_FADE_MS = 420;

export default function EditorPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang | null>(null);
  const [phase, setPhase] = useState<"loading" | "fading" | "done">("loading");
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("pickme3d_token");
    if (!token) {
      router.replace("/login/");
      return;
    }
    setIsAuth(true);

    const initialLang = initialLanguage();
    document.documentElement.lang = initialLang;
    setGlobalLang(initialLang);
    setLang(initialLang);
  }, [router]);

  useEffect(() => {
    if (phase !== "fading") return;
    const id = setTimeout(() => setPhase("done"), BOOT_FADE_MS);
    return () => clearTimeout(id);
  }, [phase]);

  return (
    <div className="relative w-full h-full" suppressHydrationWarning>
      {isAuth ? (
        <>
          {/* Return to Landing Page Floating Pill */}
          <Link
            href="/"
            className="fixed top-3 left-16 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors transition-all"
            style={{ background: "#f8f8fa", color: "#44464e", borderColor: "#d5d5dc", fontFamily: "var(--font-ui)", minHeight: 36 }}
            title="Back to home"
          >
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            <span className="font-medium text-[11px]">Home</span>
          </Link>

          {lang && <Editor initialLang={lang} onReady={() => setPhase((p) => (p === "loading" ? "fading" : p))} />}
        </>
      ) : null}

      {(!isAuth || phase !== "done") && (
        <div style={{ pointerEvents: phase === "fading" ? "none" : "auto" }}>
          <Boot done={Boolean(isAuth && phase === "fading")} />
        </div>
      )}
    </div>
  );
}
