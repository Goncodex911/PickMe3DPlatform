"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/Skeleton";
import { isLang, setGlobalLang, type Lang } from "@/lib/i18n";

const loadEditor = () => import("./Editor");
/* the editor chunk starts downloading as soon as this module runs, alongside hydration,
   instead of waiting for the first client render */
if (typeof window !== "undefined") void loadEditor();

const Editor = dynamic(loadEditor, { ssr: false, loading: () => null });

/** the static page: the editor's shell with nothing in it, standing over the editor until
 *  the document has been read, then fading away to show the real one in its place */
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

/** how long the overlay takes to fade; matches .m3e-boot in globals.css */
const BOOT_FADE_MS = 420;

import LandingPage from "@/components/LandingPage";

export default function Page() {
  const [lang, setLang] = useState<Lang | null>(null);
  const [phase, setPhase] = useState<"loading" | "fading" | "done">("loading");
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if token exists in localStorage
    const token = localStorage.getItem("pickme3d_token");
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    const initialLang = initialLanguage();
    document.documentElement.lang = initialLang;
    setGlobalLang(initialLang);
    setLang(initialLang);
  }, []);

  useEffect(() => {
    if (phase !== "fading") return;
    const id = setTimeout(() => setPhase("done"), BOOT_FADE_MS);
    return () => clearTimeout(id);
  }, [phase]);

  const handleLoginSuccess = (token: string, user: any) => {
    localStorage.setItem("pickme3d_token", token);
    localStorage.setItem("pickme3d_user", JSON.stringify(user));
    setIsAuthenticated(true);
  };

  // Prevent flashing by showing nothing while checking auth
  if (isAuthenticated === null) {
    return <Boot done={false} />;
  }

  if (!isAuthenticated) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      {lang && <Editor initialLang={lang} onReady={() => setPhase((p) => (p === "loading" ? "fading" : p))} />}
      {phase !== "done" && <Boot done={phase === "fading"} />}
    </>
  );
}
