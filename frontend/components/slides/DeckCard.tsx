"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { editedLabel } from "@/lib/deckFormat";
import { isPptistSlide, toRenderSlides } from "@/lib/slideLegacy";
import type { Deck } from "@/lib/presentationService";
import DeckSource from "./DeckSource";
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
  return <span className={s.cover}><strong>{deck.title}</strong><span>No slides yet</span></span>;
}

export type DeckMenuAction = "studio" | "pptx" | "pdf" | "png" | "copy" | "toggle" | "rename" | "delete" | "confirm-delete" | "cancel" | "use";

const MAX_TITLE = 120;

/** Inline deck name editor: Enter or blur saves, Escape cancels. */
function RenameForm({ deck, onSave, onCancel }: { deck: Deck; onSave: (title: string) => Promise<boolean>; onCancel: () => void }) {
  const [value, setValue] = useState(deck.title);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);

  const submit = async () => {
    if (done.current || saving) return;
    const title = value.trim();
    if (!title || title === deck.title) { done.current = true; onCancel(); return; }
    setSaving(true);
    const ok = await onSave(title);
    setSaving(false);
    if (ok) done.current = true;
    else input.current?.focus();
  };

  return (
    <form
      className={s.rename}
      onSubmit={(event) => { event.preventDefault(); void submit(); }}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        ref={input}
        value={value}
        maxLength={MAX_TITLE}
        disabled={saving}
        aria-label="Deck name"
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void submit()}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.stopPropagation(); done.current = true; onCancel(); }
        }}
      />
    </form>
  );
}

// Lượt xem và lượt thích hiện ngay trên thẻ
export function DeckStats({ deck }: { deck: Deck }) {
  return (
    <>
      <span className={s.vis} title="Views"><Icon name="visibility" />{deck.viewsCount || 0}</span>
      <span className={s.vis} title="Likes"><Icon name="favorite" />{deck.likesCount || 0}</span>
    </>
  );
}

export default function DeckCard({
  deck,
  community = false,
  canPrivate,
  canExportPptx,
  menuOpen,
  confirming,
  renaming = false,
  onMenu,
  onAction,
  onRename,
}: {
  deck: Deck;
  // Thẻ của người khác (mục Cộng đồng): chỉ xem, không sửa
  community?: boolean;
  canPrivate: boolean;
  canExportPptx: boolean;
  menuOpen: boolean;
  confirming: boolean;
  onMenu: (id: string | null) => void;
  onAction: (action: DeckMenuAction, deck: Deck) => void;
  // Inline rename (own decks only). Resolves true when saved.
  renaming?: boolean;
  onRename?: (deck: Deck, title: string | null) => Promise<boolean>;
}) {
  const locked = Boolean(deck.readOnly) && !community;
  const href = `/slides/deck/?id=${deck.id}`;
  const count = deck.slideCount ?? deck.slides.length;
  return (
    <article className={s.deck}>
      <a className={s.thumb} href={href} aria-label={`View ${deck.title}`}>
        <DeckCover deck={deck} />
        {locked && (
          <span className={s.locked}>
            <span><Icon name="lock" />Over your plan limit<br />View only</span>
          </span>
        )}
      </a>
      {confirming ? (
        <div className={s.confirm} role="alert">
          Delete “{deck.title}” and its {count} {count === 1 ? "slide" : "slides"}? This cannot be undone.
          <div>
            <button type="button" className={s.btn} onClick={() => onAction("cancel", deck)}>Keep</button>
            <button type="button" className={`${s.btn} ${s.primary}`} onClick={() => onAction("confirm-delete", deck)}>Delete</button>
          </div>
        </div>
      ) : (
        <div className={s.meta}>
          {renaming && onRename ? (
            <RenameForm deck={deck} onSave={(title) => onRename(deck, title)} onCancel={() => void onRename(deck, null)} />
          ) : (
            <h3><a href={href}>{deck.title}</a></h3>
          )}
          <button
            type="button"
            className={s.more}
            aria-label={`Options for ${deck.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            data-deck-menu=""
            onClick={(event) => { event.stopPropagation(); onMenu(menuOpen ? null : deck.id); }}
          >
            <Icon name="more_horiz" />
          </button>
          <p>
            {community ? (
              <Link className={`${s.vis} ${s.creatorLink}`} href={`/creators/?id=${encodeURIComponent(deck.userId)}`} aria-label={`View ${deck.authorName || "creator"}'s profile`}>
                <Icon name="person" />{deck.authorName || "PickMe3D user"}
              </Link>
            ) : locked ? (
              <span className={s.vis} data-ro="true"><Icon name="lock" />View only</span>
            ) : deck.isPublic ? (
              <span className={s.vis}><Icon name="public" />Public</span>
            ) : (
              <span className={s.vis}><Icon name="visibility_off" />Private</span>
            )}
            <span className={s.sep}>·</span>
            <span className={s.count}>{count} {count === 1 ? "slide" : "slides"}</span>
            <span className={s.sep}>·</span>
            <span>{editedLabel(deck.updatedAt, deck.createdAt)}</span>
            <span className={s.sep}>·</span>
            <DeckStats deck={deck} />
          </p>
          <DeckSource deck={deck} compact />
        </div>
      )}
      {menuOpen && community && (
        <div className={s.menu} role="menu" data-deck-menu="" onClick={(event) => event.stopPropagation()}>
          <a role="menuitem" href={href}><Icon name="slideshow" />View deck</a>
          <button type="button" role="menuitem" onClick={() => onAction("use", deck)}><Icon name="content_copy" />Use this deck</button>
          <a role="menuitem" href={`/slides/view/?id=${deck.id}`} target="_blank" rel="noreferrer"><Icon name="open_in_new" />Public page</a>
          <button type="button" role="menuitem" onClick={() => onAction("copy", deck)}><Icon name="link" />Copy link</button>
        </div>
      )}
      {menuOpen && !community && (
        <div className={s.menu} role="menu" data-deck-menu="" onClick={(event) => event.stopPropagation()}>
          {/* Own decks: only rename and delete. A view-only deck (over the plan limit) cannot be renamed. */}
          <button type="button" role="menuitem" disabled={locked} onClick={() => onAction("rename", deck)}><Icon name="drive_file_rename_outline" />Rename</button>
          <button type="button" role="menuitem" className={s.danger} onClick={() => onAction("delete", deck)}><Icon name="delete" />Delete deck</button>
        </div>
      )}
    </article>
  );
}
