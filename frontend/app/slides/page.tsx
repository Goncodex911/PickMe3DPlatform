"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";
import DeckCard, { type DeckMenuAction } from "@/components/slides/DeckCard";
import StudioShell, { Arrow, Icon, useToast } from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";
import { startDeckDownload, type DeckExportFormat } from "@/lib/deckExport";
import { quotaText } from "@/lib/deckFormat";
import { fetchAccount, type AccountPlan } from "@/lib/paymentService";
import { createDeck, deleteDeck, generateDeck, listCommunityDecks, listDecks, saveDeck, type Deck } from "@/lib/presentationService";

type Filter = "all" | "public" | "private" | "readonly";

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null | undefined }) {
  const unlimited = limit == null;
  const state = unlimited ? "inf" : used > limit ? "over" : used >= limit ? "full" : "";
  const pct = unlimited ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100);
  return (
    <div className={s.meter} data-state={state} title={unlimited ? "Unlimited" : undefined}>
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
  const [scope, setScope] = useState<"mine" | "community">("mine");
  const [community, setCommunity] = useState<Deck[] | null>(null);
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

  // Tải deck cộng đồng lần đầu mở mục này
  useEffect(() => {
    if (scope !== "community" || community !== null) return;
    listCommunityDecks().then(setCommunity).catch((err) => { setError(err.message); setCommunity([]); });
  }, [scope, community]);

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
    else setError(coded.message || "Something went wrong. Please try again.");
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
      setHintError("Enter a topic first, for example: Silk L’Heure lookbook for a distributor meeting.");
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
      const deck = await createDeck("Untitled deck");
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
      showToast("Downloading…");
      return;
    }
    exporting.current = true;
    showToast("Downloading…");
    startDeckDownload({
      deck,
      format,
      account,
      onFinish: (result) => {
        exporting.current = false;
        if (result.feature === "export-pptx") setUpgrade("export-pptx");
        else showToast(result.ok ? "File downloaded" : (result.message || "Could not export the file"));
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
      try { await navigator.clipboard.writeText(url); showToast("Link copied"); } catch { showToast(url); }
      return;
    }
    try {
      if (action === "toggle") {
        const saved = await saveDeck(deck.id, { isPublic: !deck.isPublic });
        setDecks((rows) => (rows || []).map((row) => (row.id === deck.id ? { ...row, isPublic: saved.isPublic } : row)));
        showToast(saved.isPublic ? "Deck is now public" : "Deck is now private");
      }
      if (action === "confirm-delete") {
        await deleteDeck(deck.id);
        setConfirming(null);
        setDecks(await listDecks());
        showToast("Deck deleted");
      }
    } catch (err) {
      handleError(err);
    }
  };

  const filters: [Filter, string][] = [["all", "All"], ["public", "Public"], ["private", "Private"]];
  if (readOnlyCount) filters.push(["readonly", "View only"]);

  let hint: React.ReactNode = `AI writes a 6–8 slide deck on your topic (about 15–40 seconds), then opens it in the studio.${aiLimit == null ? "" : ` ${aiLeft} AI ${aiLeft === 1 ? "credit" : "credits"} left this month.`}`;
  let hintWarn = false;
  if (hintError) { hint = hintError; hintWarn = true; }
  else if (deckFull) { hint = <>You have reached the {deckLimit}-deck limit of the {planName} plan. Delete a deck or <a href="/pricing/">upgrade</a> to create more.</>; hintWarn = true; }
  else if (aiLeft === 0) { hint = "No AI credits left this month. You can still create a blank deck."; hintWarn = true; }

  return (
    <StudioShell plan={account?.plan} active="slides">
      <section className={`${s.page} ${s.wrap}`} aria-labelledby="slidesTitle">
        <div className={s.head}>
          <div>
            <p className={s.eyebrow}>Slide Studio · Lookbook · Line sheet · Pitch</p>
            <h1 className={`${s.h1} ${s.h1Mag}`} id="slidesTitle">Every collection<br /><em>tells a story.</em></h1>
          </div>
          <div className={s.headSide}>
            <p className={`${s.lede} ${s.ledeMag}`}>
              {readOnlyCount
                ? `${readOnlyCount} ${readOnlyCount === 1 ? "deck is" : "decks are"} view only because the ${planName} plan keeps up to ${deckLimit} decks. Upgrade to edit them again; nothing is lost.`
                : "Build lookbooks, line sheets and pitch decks from your own storefront designs. Present in the browser, or export a PPTX for your distributors."}
            </p>
            {readOnlyCount > 0 && <a className={`${s.btn} ${s.primary}`} href="/pricing/">Upgrade plan <Arrow /></a>}
          </div>
        </div>

        <form className={s.composer} onSubmit={onGenerate} autoComplete="off">
          <div className={s.cRow}>
            <span className={s.cLabel}>New deck</span>
            <label htmlFor="topic">
              <Icon name="auto_awesome" />
              <input
                id="topic"
                maxLength={80}
                value={topic}
                onChange={(event) => { setTopic(event.target.value); setHintError(""); }}
                placeholder="Topic for AI, e.g. Silk L’Heure lookbook for a distributor meeting"
              />
            </label>
            <button className={`${s.btn} ${s.primary}`} type="submit" disabled={busy || aiLeft === 0 || deckFull}>
              {busy ? "AI is writing…" : "Generate with AI"} <Arrow />
            </button>
            <button className={s.btn} type="button" onClick={onBlank} disabled={busy || deckFull}>
              Blank deck <span className={s.arrow} aria-hidden="true">+</span>
            </button>
          </div>
          <div className={s.cFoot}>
            <p className={`${s.hint} ${hintWarn ? s.warn : ""}`}>{hint}</p>
            <div className={s.usage}>
              <Meter label="Deck" used={list.length} limit={deckLimit} />
              <Meter label={`AI · ${new Date().toLocaleString("en-US", { month: "short" })}`} used={aiUsed} limit={aiLimit} />
            </div>
          </div>
        </form>
        {error && <p className={s.error}>{error}</p>}

        <div className={s.toolbar}>
          <div className={s.chips} role="group" aria-label="Xem deck">
            <button type="button" className={`${s.chip} ${s.scope}`} aria-pressed={scope === "mine"} onClick={() => setScope("mine")}>My decks</button>
            <button type="button" className={`${s.chip} ${s.scope}`} aria-pressed={scope === "community"} onClick={() => setScope("community")}>Community</button>
            {scope === "mine" && <span className={s.chipSep} aria-hidden="true" />}
            {scope === "mine" && filters.map(([key, label]) => (
              <button key={key} type="button" className={s.chip} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label}<span className={s.n}>{counts[key]}</span>
              </button>
            ))}
          </div>
          <span className={s.sort}>{scope === "mine" ? "Sorted by last edited" : "Public decks from everyone · recently updated first"}</span>
        </div>

        {scope === "community" && (
          <div className={s.grid}>
            {community === null && Array.from({ length: 4 }, (_, i) => <div key={i} className={s.skeleton} />)}
            {community !== null && community.length === 0 && (
              <div className={s.empty}>
                <strong>No public decks yet</strong>
                When other people make their decks public, they will show up here.
              </div>
            )}
            {(community || []).map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                community
                canPrivate={false}
                canExportPptx={false}
                menuOpen={menu === deck.id}
                confirming={false}
                onMenu={setMenu}
                onAction={onAction}
              />
            ))}
          </div>
        )}

        <div className={s.grid} hidden={scope !== "mine"}>
          {decks === null && Array.from({ length: 4 }, (_, i) => <div key={i} className={s.skeleton} />)}
          {decks !== null && shown.length === 0 && (
            <div className={s.empty}>
              <strong>{list.length ? "No decks in this view" : "No decks yet"}</strong>
              {list.length ? "Pick another filter to see the rest of your decks." : "Type a topic above and let AI build your first deck, or start from a blank one."}
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
