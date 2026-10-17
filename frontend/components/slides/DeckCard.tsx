"use client";

import { useMemo } from "react";
import { editedLabel } from "@/lib/deckFormat";
import { isPptistSlide, toRenderSlides } from "@/lib/slideLegacy";
import type { Deck } from "@/lib/presentationService";
import SlideView from "./SlideView";
import { Icon } from "./StudioShell";
import s from "./studio.module.css";

export function DeckCover({ deck }: { deck: Deck }) {
  const first = useMemo(() => toRenderSlides(deck.slides.slice(0, 1), deck.theme)[0], [deck.slides, deck.theme]);
  // Slide PPTist vẽ trực tiếp để luôn khớp nội dung; deck cũ ưu tiên ảnh bìa đã lưu
  if (deck.slides[0] && isPptistSlide(deck.slides[0])) return <SlideView slide={first} className={s.thumbView} />;
  if (deck.thumbnail) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={deck.thumbnail} alt="" />;
  }
  if (first) return <SlideView slide={first} className={s.thumbView} />;
  return <span className={s.cover}><strong>{deck.title}</strong><span>Chưa có slide</span></span>;
}

export default function DeckCard({
  deck,
  canPrivate,
  menuOpen,
  confirming,
  onMenu,
  onAction,
}: {
  deck: Deck;
  canPrivate: boolean;
  menuOpen: boolean;
  confirming: boolean;
  onMenu: (id: string | null) => void;
  onAction: (action: "studio" | "copy" | "toggle" | "delete" | "confirm-delete" | "cancel", deck: Deck) => void;
}) {
  const locked = Boolean(deck.readOnly);
  const href = `/slides/deck/?id=${deck.id}`;
  const count = deck.slides.length;
  return (
    <article className={s.deck}>
      <a className={s.thumb} href={href} aria-label={`Xem ${deck.title}`}>
        <DeckCover deck={deck} />
        {locked && (
          <span className={s.locked}>
            <span><Icon name="lock" />Vượt hạn mức gói hiện tại<br />Chỉ xem được</span>
          </span>
        )}
      </a>
      {confirming ? (
        <div className={s.confirm} role="alert">
          Xóa “{deck.title}” và {count} slide? Không khôi phục được.
          <div>
            <button type="button" className={s.btn} onClick={() => onAction("cancel", deck)}>Giữ lại</button>
            <button type="button" className={`${s.btn} ${s.primary}`} onClick={() => onAction("confirm-delete", deck)}>Xóa</button>
          </div>
        </div>
      ) : (
        <div className={s.meta}>
          <h3><a href={href}>{deck.title}</a></h3>
          <button
            type="button"
            className={s.more}
            aria-label={`Tùy chọn cho ${deck.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(event) => { event.stopPropagation(); onMenu(menuOpen ? null : deck.id); }}
          >
            <Icon name="more_horiz" />
          </button>
          <p>
            {locked ? (
              <span className={s.vis} data-ro="true"><Icon name="lock" />Chỉ xem</span>
            ) : deck.isPublic ? (
              <span className={s.vis}><Icon name="public" />Công khai</span>
            ) : (
              <span className={s.vis}><Icon name="visibility_off" />Riêng tư</span>
            )}
            <span className={s.sep}>·</span>
            <span className={s.count}>{count} slide</span>
            <span className={s.sep}>·</span>
            <span>{editedLabel(deck.updatedAt, deck.createdAt)}</span>
          </p>
        </div>
      )}
      {menuOpen && (
        <div className={s.menu} role="menu" onClick={(event) => event.stopPropagation()}>
          {locked ? (
            <a role="menuitem" href={href}><Icon name="slideshow" />Xem deck</a>
          ) : (
            <button type="button" role="menuitem" onClick={() => onAction("studio", deck)}><Icon name="edit" />Mở trong studio</button>
          )}
          <a role="menuitem" href={`/slides/view/?id=${deck.id}`} target="_blank" rel="noreferrer" aria-disabled={!deck.isPublic} style={deck.isPublic ? undefined : { pointerEvents: "none", color: "var(--faint)" }}>
            <Icon name="open_in_new" />Trang xem công khai
          </a>
          <button type="button" role="menuitem" disabled={!deck.isPublic} onClick={() => onAction("copy", deck)}><Icon name="link" />Sao chép link</button>
          <button type="button" role="menuitem" disabled={locked} onClick={() => onAction("toggle", deck)}>
            <Icon name={deck.isPublic ? "visibility_off" : "public"} />
            {deck.isPublic ? "Chuyển sang riêng tư" : "Chuyển sang công khai"}
            {!canPrivate && deck.isPublic && <small>Pro</small>}
          </button>
          <button type="button" role="menuitem" className={s.danger} onClick={() => onAction("delete", deck)}><Icon name="delete" />Xóa deck</button>
        </div>
      )}
    </article>
  );
}
