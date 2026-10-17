"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";
import SlideStudioFrame, { type SlideStudioHandle } from "@/components/slides/SlideStudioFrame";
import { fetchAccount, type AccountPlan } from "@/lib/paymentService";
import { generateDeck, getDeck, saveDeck, type Deck } from "@/lib/presentationService";
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get("id") || "";
    const exportFormat = params.get("export");
    if (exportFormat === "pptx" || exportFormat === "pdf" || exportFormat === "image") setOpenExport(exportFormat);
    setId(deckId);
    try {
      setDesigns(JSON.parse(localStorage.getItem("pickme3d_my_designs") || "[]"));
    } catch { setDesigns([]); }
    fetchAccount().then(setAccount).catch(() => setAccount(null));
    if (!deckId) {
      setError("Thiếu mã bài trình bày");
      return;
    }
    getDeck(deckId).then(setDeck).catch((err) => setError(err.message || "Không mở được bài"));
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
      setSaved("Đã lưu");
    } catch (err) {
      const coded = err as Error & { code?: string };
      if (coded.code === "READ_ONLY" || coded.code === "UPGRADE_REQUIRED") setUpgrade(coded.message);
      setSaved(`Lỗi lưu: ${coded.message}`);
    }
  }, [id]);

  const onFeature = useCallback(async (message: Extract<StudioMessage, { type: "PM_REQUEST_FEATURE" }>) => {
    // Studio tự xuất PPTX bằng pptxgenjs khi gói cho phép; chỉ gửi yêu cầu này khi gói đang chặn.
    if (message.feature === "export-pptx") {
      setUpgrade("export-pptx");
      return;
    }
    if (message.feature === "ai-slide" && message.topic) {
      setBusy("Đang lưu và tạo bài mới…");
      await studio.current?.flush();
      try {
        const created = await generateDeck(message.topic);
        window.location.href = `/slides/edit/?id=${created.id}`;
      } catch (err) {
        const coded = err as Error & { code?: string };
        setBusy("");
        if (coded.code === "QUOTA" || coded.code === "UPGRADE_REQUIRED") setUpgrade(coded.message);
        else setSaved(`AI lỗi: ${coded.message}`);
      }
    }
  }, []);

  const leave = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const href = event.currentTarget.href;
    setBusy("Đang lưu…");
    await studio.current?.flush();
    window.location.href = href;
  };

  return (
    <main className="flex h-screen flex-col bg-[#090d16] text-white">
      <header className="relative flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <a href={id ? `/slides/deck/?id=${id}` : "/slides/"} onClick={leave}>← Về deck</a>
        <span className="truncate">{deck?.title}{deck?.readOnly ? " · chỉ xem (vượt hạn mức gói)" : ""}</span>
        <span className="flex items-center gap-3">
          <span className={saved.startsWith("Lỗi") || saved.startsWith("AI") ? "text-rose-300" : "text-slate-400"}>{busy || saved}</span>
          {deck && !deck.readOnly && (
            <button type="button" onClick={() => setShowDesigns((value) => !value)} className="rounded-full border border-white/15 px-3 py-1">
              Thiết kế của tôi
            </button>
          )}
        </span>
        {showDesigns && (
          <div className="absolute right-4 top-12 z-10 max-h-[60vh] w-72 overflow-auto rounded-2xl border border-white/10 bg-[#151c2c] p-3 shadow-2xl">
            {designs.length === 0 && <p className="text-slate-400">Chưa có thiết kế nào được lưu.</p>}
            {designs.map((design, index) => {
              const src = design.imageUrl || design.thumbnailUrl || "";
              return (
                <button
                  key={design.id || design._id || index}
                  type="button"
                  disabled={!src}
                  onClick={() => { studio.current?.insertDesign(src); setShowDesigns(false); }}
                  className="mb-2 block w-full rounded-xl border border-white/10 p-2 text-left hover:border-rose-500 disabled:opacity-40"
                >
                  {src && <img src={src} alt="" className="h-20 w-full rounded-lg object-cover" />}
                  <span className="mt-1 block truncate">{design.title || "Thiết kế"}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>
      <div className="min-h-0 flex-1">
        {error && <p className="grid h-full place-items-center text-rose-300">{error}</p>}
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
            onSaving={() => setSaved("Đang lưu…")}
          />
        )}
      </div>
      <UpgradeModal open={Boolean(upgrade)} feature={upgrade} onClose={() => setUpgrade("")} />
    </main>
  );
}
