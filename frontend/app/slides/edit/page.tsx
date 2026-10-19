"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";
import SlideStudioFrame, { type SlideStudioHandle } from "@/components/slides/SlideStudioFrame";
import { fetchAccount, type AccountPlan } from "@/lib/paymentService";
import { describeAiRun, generateDeckWithAi, getDeck, saveDeck, stashAiNotice, takeAiNotice, type Deck } from "@/lib/presentationService";
import type { StudioMessage } from "@/lib/slideBridge";

interface MyDesign {
  id?: string;
  _id?: string;
  title?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
}

export default function SlideEditPage() {
  const studio = useRef<SlideStudioHandle>(null);
  const [id, setId] = useState("");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [account, setAccount] = useState<AccountPlan | null>(null);
  const [designs, setDesigns] = useState<MyDesign[]>([]);
  const [showDesigns, setShowDesigns] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [upgrade, setUpgrade] = useState("");
  const [busy, setBusy] = useState("");
  const [openExport, setOpenExport] = useState<"pptx" | "pdf" | "image" | undefined>(undefined);
  const [aiNotice, setAiNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get("id") || "";
    const exportFormat = params.get("export");
    if (exportFormat === "pptx" || exportFormat === "pdf" || exportFormat === "image") setOpenExport(exportFormat);
    setId(deckId);
    setAiNotice(takeAiNotice());
    try {
      setDesigns(JSON.parse(localStorage.getItem("pickme3d_my_designs") || "[]"));
    } catch { setDesigns([]); }
    fetchAccount().then(setAccount).catch(() => setAccount(null));
    if (!deckId) {
      setError("The link is missing a deck id");
      return;
    }
    getDeck(deckId).then(setDeck).catch((err) => setError(err.message || "Could not open this deck"));
  }, []);

  const onSave = useCallback(async (message: Extract<StudioMessage, { type: "PM_SAVE" }>) => {
    if (!id) return;
    try {
      const next = await saveDeck(id, {
        title: message.title,
        slides: message.slides as Deck["slides"],
        theme: message.theme,
        ...(message.thumbnail ? { thumbnail: message.thumbnail } : {}),
      });
      setDeck(next);
      setSaved("Saved");
    } catch (err) {
      const coded = err as Error & { code?: string };
      if (coded.code === "READ_ONLY" || coded.code === "UPGRADE_REQUIRED") setUpgrade(coded.message);
      setSaved(`Save failed: ${coded.message}`);
    }
  }, [id]);

  const onFeature = useCallback(async (message: Extract<StudioMessage, { type: "PM_REQUEST_FEATURE" }>) => {
    // Studio tự xuất PPTX bằng pptxgenjs khi gói cho phép; chỉ gửi yêu cầu này khi gói đang chặn.
    if (message.feature === "export-pptx") {
      setUpgrade("export-pptx");
      return;
    }
    if (message.feature === "ai-slide" && message.topic) {
      setBusy("Saving and creating a new deck…");
      await studio.current?.flush();
      try {
        const { deck: created, ai } = await generateDeckWithAi(message.topic);
        stashAiNotice(describeAiRun(ai));
        window.location.href = `/slides/edit/?id=${created.id}`;
      } catch (err) {
        const coded = err as Error & { code?: string };
        setBusy("");
        if (coded.code === "QUOTA" || coded.code === "UPGRADE_REQUIRED") setUpgrade(coded.message);
        else setSaved(`AI error: ${coded.message}`);
      }
    }
  }, []);

  const leave = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const href = event.currentTarget.href;
    setBusy("Saving…");
    await studio.current?.flush();
    window.location.href = href;
  };

  return (
    <main className="flex h-screen flex-col bg-[#131313] text-white" style={{ fontFamily: "var(--font-ui)" }}>
      <header className="relative grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[#2c2c2c] px-5 text-sm">
        <span className="flex min-w-0 items-center gap-5">
          <a href="/" aria-label="PickMe3D home" className="flex shrink-0 items-center gap-2 text-[17px] font-bold tracking-[-0.8px]">
            <svg viewBox="0 0 40 44" className="h-6 w-[22px]" aria-hidden="true"><path d="M20 1 38 11.5 20 22 2 11.5 20 1ZM2 15l16 9.5V43L2 33V15ZM22 24.5 38 15v18L22 43V24.5Z" fill="currentColor" /></svg>
            <span>PickMe<span className="font-normal">3D</span></span>
          </a>
          <a href={id ? `/slides/deck/?id=${id}` : "/slides/"} onClick={leave} className="truncate text-[#adadad] hover:text-white">← Back to deck</a>
        </span>
        <span className="flex min-w-0 flex-col items-center leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[#7d7d7d]">{deck?.readOnly ? "View only · over plan limit" : "Slide Studio"}</span>
          <span className="max-w-[40vw] truncate font-medium tracking-[-0.2px]">{deck?.title}</span>
        </span>
        <span className="flex items-center justify-end gap-4">
          <span className={`text-[11px] uppercase tracking-[1.4px] ${saved.startsWith("Save failed") || saved.startsWith("AI error") ? "text-[#ff8f8f]" : "text-[#7d7d7d]"}`}>{busy || saved}</span>
          {deck && !deck.readOnly && (
            <button type="button" onClick={() => setShowDesigns((value) => !value)} aria-expanded={showDesigns} className="flex min-h-9 items-center gap-4 border border-[#8a8a8a] px-4 hover:bg-white hover:text-[#131313]">
              My designs <span aria-hidden="true">{showDesigns ? "−" : "+"}</span>
            </button>
          )}
        </span>
        {showDesigns && (
          <div className="absolute right-5 top-[60px] z-10 max-h-[60vh] w-80 overflow-auto bg-white p-2 text-[#131313] shadow-2xl">
            {designs.length === 0 && <p className="p-3 text-[#626262]">No saved designs yet.</p>}
            {designs.map((design, index) => {
              const src = design.imageUrl || design.thumbnailUrl || "";
              return (
                <button
                  key={design.id || design._id || index}
                  type="button"
                  disabled={!src}
                  onClick={() => { studio.current?.insertDesign(src); setShowDesigns(false); }}
                  className="block w-full p-2 text-left hover:bg-[#ececec] disabled:opacity-40"
                >
                  {src && <img src={src} alt="" className="aspect-video w-full object-cover grayscale transition hover:grayscale-0" />}
                  <span className="mt-2 block truncate text-sm">{design.title || "Design"}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>
      {aiNotice && (
        <div role="status" className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#5a4a1a] bg-[#1d1a12] px-5 py-2.5 text-[13px] text-[#f1d58a]">
          <span className="min-w-0 flex-1">{aiNotice}</span>
          <a href="/slides/#topic" className="underline underline-offset-4 hover:text-white">Choose model or API key</a>
          <button type="button" onClick={() => setAiNotice("")} className="text-[#adadad] hover:text-white" aria-label="Dismiss">✕</button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        {error && <p className="grid h-full place-items-center text-[#ff8f8f]">{error}</p>}
        {deck && (
          <SlideStudioFrame
            ref={studio}
            deck={deck}
            plan={account?.plan || "free"}
            userName={account?.name || ""}
            designs={designs}
            features={account?.features}
            openExport={openExport}
            onSave={onSave}
            onFeature={onFeature}
            onSaving={() => setSaved("Saving…")}
          />
        )}
      </div>
      <UpgradeModal open={Boolean(upgrade)} feature={upgrade} onClose={() => setUpgrade("")} />
    </main>
  );
}
