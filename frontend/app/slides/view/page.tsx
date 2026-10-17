"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SlideView from "@/components/slides/SlideView";
import StudioShell, { Icon, useToast } from "@/components/slides/StudioShell";
import s from "@/components/slides/studio.module.css";
import { editedLabel } from "@/lib/deckFormat";
import { commentDeck, getPublicDeck, likeDeck, recordDeckViewOnce, type Deck } from "@/lib/presentationService";
import { toRenderSlides } from "@/lib/slideLegacy";

// Trang xem công khai: ai có link đều xem được deck công khai, kể cả chưa đăng nhập
export default function SlideViewPage() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [toast, showToast] = useToast();

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") || "";
    if (!id) { setError("Thiếu mã deck trong đường dẫn."); return; }
    getPublicDeck(id)
      .then((found) => {
        setDeck(found);
        recordDeckViewOnce(found.id).then((view) => {
          if (view?.counted) setDeck((current) => (current ? { ...current, viewsCount: view.viewsCount } : current));
        });
      })
      .catch((err) => setError(err.message || "Không mở được deck"));
  }, []);

  const slides = useMemo(() => (deck ? toRenderSlides(deck.slides, deck.theme) : []), [deck]);
  const last = Math.max(0, slides.length - 1);
  const go = useCallback((step: number) => setIndex((value) => Math.max(0, Math.min(last, value + step))), [last]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/input|textarea/i.test((event.target as HTMLElement).tagName)) return;
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go]);

  const toggleLike = async () => {
    if (!deck) return;
    try {
      const result = await likeDeck(deck.id);
      setDeck({ ...deck, likesCount: result.likesCount, liked: result.liked });
    } catch {
      showToast("Đăng nhập để thích deck này");
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deck || !note.trim()) return;
    try {
      const comments = await commentDeck(deck.id, note);
      setDeck({ ...deck, comments });
      setNote("");
    } catch {
      showToast("Đăng nhập để bình luận");
    }
  };

  return (
    <StudioShell active="slides">
      <section className={`${s.deckPage} ${s.wrap}`} aria-labelledby="viewTitle">
        {error && <p className={s.error}>{error}</p>}
        {!deck && !error && <div className={s.skeleton} style={{ marginTop: 20, maxWidth: 960 }} />}
        {deck && (
          <>
            <div className={s.dhead}>
              <div>
                <p className={s.sub}>
                  <span className={s.vis}><Icon name="person" />{deck.authorName || "Người dùng PickMe3D"}</span>
                  <span>·</span><span>{slides.length} slide</span>
                  <span>·</span><span>{editedLabel(deck.updatedAt, deck.createdAt)}</span>
                </p>
                <h1 className={s.h1} id="viewTitle">{deck.title}</h1>
              </div>
              <div className={s.actions}>
                <span className={s.btn} title="Lượt xem"><Icon name="visibility" />{deck.viewsCount || 0}</span>
                <button type="button" className={`${s.btn} ${deck.liked ? s.liked : ""}`} onClick={toggleLike} aria-pressed={Boolean(deck.liked)} title={deck.liked ? "Bỏ thích" : "Thích"}>
                  <Icon name="favorite" />{deck.likesCount || 0}
                </button>
              </div>
            </div>

            <div className={s.viewer} style={{ marginTop: 28 }}>
              <div className={s.stage} aria-label={`Slide ${index + 1} trên ${slides.length}`}>
                <SlideView slide={slides[Math.min(index, last)]} className={s.stageSlide} />
                <button type="button" className={`${s.navBtn} ${s.prev}`} onClick={() => go(-1)} disabled={index === 0} aria-label="Slide trước"><Icon name="chevron_left" /></button>
                <button type="button" className={`${s.navBtn} ${s.next}`} onClick={() => go(1)} disabled={index >= last} aria-label="Slide sau"><Icon name="chevron_right" /></button>
              </div>
              <div className={s.pager}>
                <span>Slide {Math.min(index, last) + 1} / {slides.length}</span>
                <span>Dùng <kbd>←</kbd> <kbd>→</kbd> để chuyển slide</span>
              </div>
            </div>

            <section className={s.box} style={{ maxWidth: 760, margin: "40px auto 0" }} aria-labelledby="commentsTitle">
              <h2 id="commentsTitle">Bình luận · {deck.comments?.length || 0}</h2>
              <form className={s.linkRow} onSubmit={send}>
                <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Viết bình luận" aria-label="Bình luận" />
                <button className={s.btn} type="submit" disabled={!note.trim()}>Gửi</button>
              </form>
              {(deck.comments || []).map((comment) => (
                <p key={comment.id} className={s.notes}><strong style={{ color: "var(--fg)" }}>{comment.userName}</strong> {comment.content}</p>
              ))}
            </section>
          </>
        )}
      </section>
      {toast}
    </StudioShell>
  );
}
