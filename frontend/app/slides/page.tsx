"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";
import DeckCard, { type DeckMenuAction } from "@/components/slides/DeckCard";
import StudioShell, { Arrow, Icon, useToast } from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";
import { startDeckDownload, type DeckExportFormat } from "@/lib/deckExport";
import { quotaText } from "@/lib/deckFormat";
import { fetchAccount, type AccountPlan } from "@/lib/paymentService";
import { createDeck, deleteDeck, generateDeck, listDecks, saveDeck, type Deck } from "@/lib/presentationService";

type Filter = "all" | "public" | "private" | "readonly";

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null | undefined }) {
  const unlimited = limit == null;
  const state = unlimited ? "inf" : used > limit ? "over" : used >= limit ? "full" : "";
  const pct = unlimited ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100);
  return (
    <div className={s.meter} data-state={state} title={unlimited ? "Không giới hạn" : undefined}>
      <span>{label}</span>
      <strong>{quotaText(used, limit)}</strong>
      <span className={s.bar}><span style={{ width: `${pct}%` }} /></span>
    </div>
  );
}

export default function SlidesPage() {
  const [account, setAccount] = useState<AccountPlan | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [topic, setTopic] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [menu, setMenu] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hintError, setHintError] = useState("");
  const [upgrade, setUpgrade] = useState("");
  const [toast, showToast] = useToast();
  const exporting = useRef(false);

  const load = useCallback(async () => {
    const [me, rows] = await Promise.all([fetchAccount(), listDecks()]);
    setAccount(me);
    setDecks(rows);
  }, []);

  useEffect(() => { load().catch((err) => { setError(err.message); setDecks([]); }); }, [load]);

  useEffect(() => {
    const close = () => setMenu(null);
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenu(null); setConfirming(null); } };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", onKey); };
  }, []);

  const handleError = (err: unknown) => {
    const coded = err as Error & { code?: string };
    if (coded.code === "QUOTA" || coded.code === "UPGRADE_REQUIRED" || coded.code === "READ_ONLY") setUpgrade(coded.message);
    else setError(coded.message || "Có lỗi, thử lại sau");
  };

  const list = decks || [];
  const quotas = account?.quotas;
  const deckLimit = quotas ? quotas.slides : 3;
  const aiLimit = account ? account.aiLimit : 3;
  const aiUsed = account?.aiUsed || 0;
  const aiLeft = aiLimit == null ? Infinity : Math.max(0, aiLimit - aiUsed);
  const deckFull = deckLimit != null && list.length >= deckLimit;
  const readOnlyCount = list.filter((deck) => deck.readOnly).length;
  const planName = account?.plan === "studio" ? "Studio" : account?.plan === "pro" ? "Pro" : "Free";
  const month = new Date().getMonth() + 1;

  const counts = useMemo(() => ({
    all: list.length,
    public: list.filter((d) => d.isPublic).length,
    private: list.filter((d) => !d.isPublic).length,
    readonly: readOnlyCount,
  }), [list, readOnlyCount]);

  const shown = list.filter((d) =>
    filter === "all" || (filter === "public" && d.isPublic) || (filter === "private" && !d.isPublic) || (filter === "readonly" && d.readOnly));

  const onGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const value = topic.trim();
    if (!value) {
      setHintError("Nhập chủ đề trước, ví dụ: Lookbook Silk L’Heure cho buổi gặp nhà phân phối.");
      return;
    }
    setBusy(true);
    try {
      const deck = await generateDeck(value);
      window.location.href = `/slides/edit/?id=${deck.id}`;
    } catch (err) {
      setBusy(false);
      handleError(err);
    }
  };

  const onBlank = async () => {
    setError("");
    setBusy(true);
    try {
      const deck = await createDeck("Bài trình bày mới");
      window.location.href = `/slides/edit/?id=${deck.id}`;
    } catch (err) {
      setBusy(false);
      handleError(err);
    }
  };

  const onExport = (format: DeckExportFormat, deck: Deck) => {
    if (deck.readOnly) return;
    if (format === "pptx" && !account?.features?.exportPptx) {
      setUpgrade("export-pptx");
      return;
    }
    if (exporting.current) {
      showToast("Đang tải…");
      return;
    }
    exporting.current = true;
    showToast("Đang tải…");
    startDeckDownload({
      deck,
      format,
      account,
      onFinish: (result) => {
        exporting.current = false;
        if (result.feature === "export-pptx") setUpgrade("export-pptx");
        else showToast(result.ok ? "Đã tải file" : (result.message || "Không xuất được file"));
      },
    });
  };

  const onAction = async (action: DeckMenuAction, deck: Deck) => {
    setMenu(null);
    if (action === "studio") { window.location.href = `/slides/edit/?id=${deck.id}`; return; }
    if (action === "pptx" || action === "pdf" || action === "png") {
      onExport(action === "png" ? "image" : action, deck);
      return;
    }
    if (action === "delete") { setConfirming(deck.id); return; }
    if (action === "cancel") { setConfirming(null); return; }
    if (action === "copy") {
      const url = `${window.location.origin}/slides/view/?id=${deck.id}`;
      try { await navigator.clipboard.writeText(url); showToast("Đã sao chép link"); } catch { showToast(url); }
      return;
    }
    try {
      if (action === "toggle") {
        const saved = await saveDeck(deck.id, { isPublic: !deck.isPublic });
        setDecks((rows) => (rows || []).map((row) => (row.id === deck.id ? { ...row, isPublic: saved.isPublic } : row)));
        showToast(saved.isPublic ? "Deck đã công khai" : "Deck đã chuyển sang riêng tư");
      }
      if (action === "confirm-delete") {
        await deleteDeck(deck.id);
        setConfirming(null);
        setDecks(await listDecks());
        showToast("Đã xóa deck");
      }
    } catch (err) {
      handleError(err);
    }
  };

  const filters: [Filter, string][] = [["all", "Tất cả"], ["public", "Công khai"], ["private", "Riêng tư"]];
  if (readOnlyCount) filters.push(["readonly", "Chỉ xem"]);

  let hint: React.ReactNode = `AI viết deck 6–8 slide theo chủ đề (khoảng 15–40 giây) rồi mở trong studio.${aiLimit == null ? "" : ` Còn ${aiLeft} lượt tháng này.`}`;
  let hintWarn = false;
  if (hintError) { hint = hintError; hintWarn = true; }
  else if (deckFull) { hint = <>Đã đủ {deckLimit} deck của gói {planName}. Xóa bớt deck hoặc <a href="/pricing/">nâng cấp</a> để tạo thêm.</>; hintWarn = true; }
  else if (aiLeft === 0) { hint = "Hết lượt AI tháng này. Vẫn tạo được deck trống."; hintWarn = true; }

  return (
    <StudioShell plan={account?.plan} active="slides">
      <section className={`${s.page} ${s.wrap}`} aria-labelledby="slidesTitle">
        <div className={s.head}>
          <div>
            <p className={s.eyebrow}>Slide Studio · Lookbook · Line sheet · Pitch</p>
            <h1 className={`${s.h1} ${s.h1Mag}`} id="slidesTitle">Mỗi bộ sưu tập<br /><em>một câu chuyện.</em></h1>
          </div>
          <div className={s.headSide}>
            <p className={`${s.lede} ${s.ledeMag}`}>
              {readOnlyCount
                ? `${readOnlyCount} deck đang chỉ xem vì gói ${planName} lưu tối đa ${deckLimit} deck. Nâng cấp để sửa lại, không mất dữ liệu.`
                : "Dựng lookbook, line sheet và bài pitch từ chính thiết kế storefront của bạn. Trình chiếu ngay trên trình duyệt, hoặc xuất PPTX gửi nhà phân phối."}
            </p>
            {readOnlyCount > 0 && <a className={`${s.btn} ${s.primary}`} href="/pricing/">Nâng cấp gói <Arrow /></a>}
          </div>
        </div>

        <form className={s.composer} onSubmit={onGenerate} autoComplete="off">
          <div className={s.cRow}>
            <span className={s.cLabel}>Deck mới</span>
            <label htmlFor="topic">
              <Icon name="auto_awesome" />
              <input
                id="topic"
                maxLength={80}
                value={topic}
                onChange={(event) => { setTopic(event.target.value); setHintError(""); }}
                placeholder="Chủ đề cho AI, ví dụ: Lookbook Silk L’Heure cho buổi gặp nhà phân phối"
              />
            </label>
            <button className={`${s.btn} ${s.primary}`} type="submit" disabled={busy || aiLeft === 0 || deckFull}>
              {busy ? "AI đang viết…" : "AI tạo deck"} <Arrow />
            </button>
            <button className={s.btn} type="button" onClick={onBlank} disabled={busy || deckFull}>
              Deck trống <span className={s.arrow} aria-hidden="true">+</span>
            </button>
          </div>
          <div className={s.cFoot}>
            <p className={`${s.hint} ${hintWarn ? s.warn : ""}`}>{hint}</p>
            <div className={s.usage}>
              <Meter label="Deck" used={list.length} limit={deckLimit} />
              <Meter label={`AI tháng ${month}`} used={aiUsed} limit={aiLimit} />
            </div>
          </div>
        </form>
        {error && <p className={s.error}>{error}</p>}

        <div className={s.toolbar}>
          <div className={s.chips} role="group" aria-label="Lọc deck">
            {filters.map(([key, label]) => (
              <button key={key} type="button" className={s.chip} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label}<span className={s.n}>{counts[key]}</span>
              </button>
            ))}
          </div>
          <span className={s.sort}>Sắp theo lần sửa gần nhất</span>
        </div>

        <div className={s.grid}>
          {decks === null && Array.from({ length: 4 }, (_, i) => <div key={i} className={s.skeleton} />)}
          {decks !== null && shown.length === 0 && (
            <div className={s.empty}>
              <strong>{list.length ? "Không có deck nào ở mục này" : "Chưa có deck nào"}</strong>
              {list.length ? "Chọn bộ lọc khác để xem các deck còn lại." : "Nhập một chủ đề ở trên để AI dựng deck đầu tiên, hoặc bắt đầu từ deck trống."}
            </div>
          )}
          {shown.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              canPrivate={Boolean(account?.features?.privateDeck)}
              canExportPptx={Boolean(account?.features?.exportPptx)}
              menuOpen={menu === deck.id}
              confirming={confirming === deck.id}
              onMenu={setMenu}
              onAction={onAction}
            />
          ))}
        </div>
      </section>
      {toast}
      <UpgradeModal open={Boolean(upgrade)} feature={upgrade} onClose={() => setUpgrade("")} />
    </StudioShell>
  );
}
