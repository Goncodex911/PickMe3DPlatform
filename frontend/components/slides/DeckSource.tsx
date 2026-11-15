import { copiedFrom, type Deck } from "@/lib/presentationService";
import s from "./studio.module.css";

// Ghi nguồn công khai cho deck được tạo bằng "Use this deck": "Based on ‹deck gốc› by ‹tác giả›".
// Hiện cho mọi người xem; nguồn do server giữ cố định nên chủ bản sao không xoá được.
export default function DeckSource({
  deck,
  linkBase = "/slides/deck/",
  compact = false,
}: {
  deck: Pick<Deck, "theme">;
  /** Trang mở deck gốc: /slides/deck/ (đã đăng nhập) hoặc /slides/view/ (trang công khai) */
  linkBase?: string;
  /** Bản rút gọn trên thẻ deck: chỉ chữ, không link (thẻ đã là một link) */
  compact?: boolean;
}) {
  const source = copiedFrom(deck);
  if (!source) return null;
  const title = source.title || "a community deck";
  if (compact) {
    return (
      <span className={s.note} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`Based on ${title}${source.authorName ? ` by ${source.authorName}` : ""}`}>
        Based on {title}{source.authorName ? ` by ${source.authorName}` : ""}
      </span>
    );
  }
  return (
    <p className={s.note}>
      Based on <a href={`${linkBase}?id=${encodeURIComponent(source.deckId)}`}>{title}</a>
      {source.authorName ? ` by ${source.authorName}` : ""}
    </p>
  );
}
