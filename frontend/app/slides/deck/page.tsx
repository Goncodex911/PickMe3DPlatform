"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";
import SlideView from "@/components/slides/SlideView";
import StudioShell, { Icon, useToast } from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";
import { editedLabel } from "@/lib/deckFormat";
import { fetchAccount, type AccountPlan } from "@/lib/paymentService";
import { getDeck, saveDeck, type Deck } from "@/lib/presentationService";
import { slideHeadline, toRenderSlides } from "@/lib/slideLegacy";

function plainText(html: string) {
  return html.replace(/<\/p>/g, "\n").replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

export default function DeckPage() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [account, setAccount] = useState<AccountPlan | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [upgrade, setUpgrade] = useState("");
  const [toast, showToast] = useToast();
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") || "";
    if (!id) { setError("Thiếu mã deck trong đường dẫn."); return; }
    getDeck(id).then(setDeck).catch((err) => setError(err.message || "Không mở được deck"));
    fetchAccount().then(setAccount).catch(() => setAccount(null));
  }, []);

  const slides = useMemo(() => (deck ? toRenderSlides(deck.slides, deck.theme) : []), [deck]);
  const last = Math.max(0, slides.length - 1);
  const current = slides[Math.min(index, last)];

  const go = useCallback((step: number) => setIndex((value) => Math.max(0, Math.min(last, value + step))), [last]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/input|textarea/i.test((event.target as HTMLElement).tagName)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown" || (event.key === " " && document.fullscreenElement)) { event.preventDefault(); go(1); }
      if (event.key === "ArrowLeft" || event.key === "PageUp") { event.preventDefault(); go(-1); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go]);

  const present = async () => {
    try {
      await stageRef.current?.requestFullscreen();
    } catch {
      showToast("Trình duyệt không cho mở toàn màn hình");
    }
  };

  const toggleVisibility = async () => {
    if (!deck) return;
    try {
      const saved = await saveDeck(deck.id, { isPublic: !deck.isPublic });
      setDeck({ ...deck, isPublic: saved.isPublic });
      showToast(saved.isPublic ? "Deck đã công khai" : "Deck đã chuyển sang riêng tư");
    } catch (err) {
      const coded = err as Error & { code?: string };
      if (coded.code === "UPGRADE_REQUIRED" || coded.code === "READ_ONLY") setUpgrade(coded.message);
      else showToast(coded.message);
    }
  };

  const shareUrl = deck && typeof window !== "undefined" ? `${window.location.origin}/slides/view/?id=${deck.id}` : "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); showToast("Đã sao chép link"); }
    catch { (document.getElementById("shareLink") as HTMLInputElement | null)?.select(); }
  };

  const features = account?.features;
  const locked = Boolean(deck?.readOnly);
  const visLabel = locked ? "Chỉ xem (vượt hạn mức)" : deck?.isPublic ? "Công khai" : "Riêng tư";
  const notes = current?.remark ? plainText(String(current.remark)) : "";

  return (
    <StudioShell plan={account?.plan} active="slides">
      <section className={`${s.deckPage} ${s.wrap}`} aria-labelledby="deckTitle">
        <a className={s.back} href="/slides/"><Icon name="arrow_back" />Tất cả deck</a>
        {error && <p className={s.error}>{error}</p>}
        {!deck && !error && <div className={s.skeleton} style={{ marginTop: 20, maxWidth: 960 }} />}
        {deck && (
          <>
            <div className={s.dhead}>
              <div>
                <h1 className={s.h1} id="deckTitle">{deck.title}</h1>
                <p className={s.sub}>
                  <span className={s.vis} data-ro={locked}><Icon name={locked ? "lock" : deck.isPublic ? "public" : "visibility_off"} />{visLabel}</span>
                  <span>·</span><span>{slides.length} slide</span>
                  <span>·</span><span>{editedLabel(deck.updatedAt, deck.createdAt)}</span>
                </p>
              </div>
              <div className={s.actions}>
                <button type="button" className={s.btn} onClick={present} disabled={!slides.length}><Icon name="slideshow" />Trình chiếu</button>
                {locked ? (
                  <a className={`${s.btn} ${s.primary}`} href="/pricing/"><Icon name="lock_open" />Nâng cấp để sửa</a>
                ) : (
                  <a className={`${s.btn} ${s.primary}`} href={`/slides/edit/?id=${deck.id}`}><Icon name="edit" />Mở trong studio</a>
                )}
              </div>
            </div>

            <div className={s.dbody}>
              <nav className={s.strip} aria-label="Các slide trong deck">
                {slides.map((slide, n) => (
                  <button key={slide.id || n} type="button" aria-current={n === index} onClick={() => setIndex(n)} aria-label={`Slide ${n + 1}`}>
                    <span className={s.n}>{n + 1}</span>
                    <span className={s.stripThumb}>
                      <SlideView slide={slide} className={s.mini} />
                      <span>{slideHeadline(slide) || "Slide trống"}</span>
                    </span>
                  </button>
                ))}
              </nav>

              <div className={s.viewer}>
                <div ref={stageRef} className={s.stage} aria-label={`Slide ${index + 1} trên ${slides.length}`}>
                  <SlideView slide={current} className={s.stageSlide} />
                  <button type="button" className={`${s.navBtn} ${s.prev}`} onClick={() => go(-1)} disabled={index === 0} aria-label="Slide trước"><Icon name="chevron_left" /></button>
                  <button type="button" className={`${s.navBtn} ${s.next}`} onClick={() => go(1)} disabled={index >= last} aria-label="Slide sau"><Icon name="chevron_right" /></button>
                </div>
                <div className={s.pager}>
                  <span>Slide {Math.min(index, last) + 1} / {slides.length}</span>
                  <span>Dùng <kbd>←</kbd> <kbd>→</kbd> để chuyển slide</span>
                </div>
              </div>

              <aside className={s.side}>
                <section className={s.box}>
                  <h2>Thông tin</h2>
                  <div className={s.stats}>
                    <div><strong>{slides.length}</strong><span>slide</span></div>
                    <div><strong>{deck.likesCount}</strong><span>lượt thích</span></div>
                    <div><strong>{deck.comments?.length || 0}</strong><span>bình luận</span></div>
                  </div>
                  <dl className={s.kv}>
                    <dt>Trạng thái</dt><dd>{visLabel}</dd>
                    <dt>Lần sửa cuối</dt><dd>{editedLabel(deck.updatedAt, deck.createdAt).replace(/^(Sửa|Tạo) /, "")}</dd>
                  </dl>
                </section>

                <section className={s.box}>
                  <h2>Chia sẻ</h2>
                  {deck.isPublic ? (
                    <>
                      <div className={s.linkRow}>
                        <input id="shareLink" readOnly value={shareUrl} aria-label="Link xem công khai" onFocus={(event) => event.currentTarget.select()} />
                        <button type="button" className={s.btn} onClick={copy}>Sao chép</button>
                      </div>
                      <p className={s.note}>Ai có link đều xem được, thích và bình luận.</p>
                    </>
                  ) : (
                    <p className={s.note}>Deck riêng tư chỉ bạn xem được.</p>
                  )}
                  <button type="button" className={s.btn} onClick={toggleVisibility} disabled={locked}>
                    <Icon name={deck.isPublic ? "visibility_off" : "public"} />
                    {deck.isPublic ? (features?.privateDeck ? "Chuyển sang riêng tư" : "Riêng tư (gói Pro)") : "Công khai deck"}
                  </button>
                </section>

                <section className={s.box}>
                  <h2>Xuất file</h2>
                  <div className={s.exp}>
                    {([
                      ["pptx", "PPTX", features?.exportPptx ? "PowerPoint" : "Gói Pro", Boolean(features?.exportPptx)],
                      ["pdf", "PDF", "In ấn", true],
                      ["image", "PNG", "Từng slide", true],
                    ] as const).map(([format, label, small, allowed]) => (
                      allowed && !locked ? (
                        <a key={format} className={s.btn} href={`/slides/edit/?id=${deck.id}&export=${format}`}>{label}<small>{small}</small></a>
                      ) : (
                        <button key={format} type="button" className={s.btn} onClick={() => setUpgrade(locked ? "Deck đang chỉ xem" : "export-pptx")}>{label}<small>{small}</small></button>
                      )
                    ))}
                  </div>
                  <p className={s.note}>Xuất file mở studio với hộp xuất có sẵn.</p>
                </section>

                <section className={s.box}>
                  <h2>Ghi chú slide {index + 1}</h2>
                  {notes ? <p className={s.notes}>{notes}</p> : <p className={s.note}>Slide này chưa có ghi chú. Thêm ghi chú cho người thuyết trình trong studio.</p>}
                </section>
              </aside>
            </div>
          </>
        )}
      </section>
      {toast}
      <UpgradeModal open={Boolean(upgrade)} feature={upgrade} onClose={() => setUpgrade("")} />
    </StudioShell>
  );
}
