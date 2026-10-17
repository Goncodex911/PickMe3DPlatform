"use client";

import { useEffect, useState } from "react";
import SlideStudioFrame from "@/components/slides/SlideStudioFrame";
import { commentDeck, getPublicDeck, likeDeck, type Deck } from "@/lib/presentationService";
import { isPptistDeck } from "@/lib/slideBridge";

export default function SlideViewPage() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") || "";
    if (!id) return;
    getPublicDeck(id).then(setDeck).catch((err) => setError(err.message));
  }, []);

  if (error) return <main className="grid min-h-screen place-items-center bg-black text-white">{error}</main>;
  if (!deck) return <main className="grid min-h-screen place-items-center bg-black text-white">Đang mở bài…</main>;
  const slide = deck.slides[index] || deck.slides[0];
  const studio = isPptistDeck(deck.slides);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
        {studio ? (
          <>
            <p className="text-xs uppercase tracking-[0.22em] text-rose-300">{deck.authorName} · {deck.title}</p>
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-white/10">
              <SlideStudioFrame deck={deck} plan="free" userName="" designs={[]} mode="view" />
            </div>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.22em] text-rose-300">{deck.authorName} · {index + 1}/{deck.slides.length}</p>
            <h1 className="mt-3 text-5xl italic" style={{ fontFamily: "Instrument Serif, serif" }}>{slide?.title || deck.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">{slide?.body}</p>
            {slide?.image && <img src={slide.image} alt="" className="mt-6 max-h-80 rounded-2xl object-cover" />}
          </>
        )}
        <div className="mt-8 flex gap-3 text-sm">
          {!studio && <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} className="rounded-full border border-white/20 px-4 py-2">Trước</button>}
          {!studio && <button type="button" onClick={() => setIndex((value) => Math.min(deck.slides.length - 1, value + 1))} className="rounded-full border border-white/20 px-4 py-2">Sau</button>}
          <button type="button" onClick={async () => { const result = await likeDeck(deck.id); setDeck({ ...deck, likesCount: result.likesCount }); }} className="rounded-full bg-white px-4 py-2 text-black">{deck.likesCount} thích</button>
        </div>
        <form className="mt-8 flex gap-2" onSubmit={async (event) => {
          event.preventDefault();
          const comments = await commentDeck(deck.id, note);
          setDeck({ ...deck, comments });
          setNote("");
        }}>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Bình luận" className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm" />
          <button className="rounded-full bg-rose-600 px-4 text-sm" type="submit">Gửi</button>
        </form>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          {deck.comments.map((comment) => <li key={comment.id}><strong className="text-white">{comment.userName}</strong> {comment.content}</li>)}
        </ul>
      </section>
    </main>
  );
}
