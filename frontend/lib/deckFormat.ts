// Định dạng thời gian và nhãn cho danh sách deck

export function editedLabel(updatedAt?: string, createdAt?: string, now = Date.now()) {
  const at = updatedAt || createdAt;
  if (!at) return "";
  const time = new Date(at).getTime();
  if (!Number.isFinite(time)) return "";
  const verb = createdAt && updatedAt && Math.abs(new Date(updatedAt).getTime() - new Date(createdAt).getTime()) < 5000 ? "Created" : "Edited";
  const diff = Math.max(0, now - time);
  const min = 60 * 1000;
  if (diff < min) return `${verb} just now`;
  if (diff < 60 * min) return `${verb} ${Math.floor(diff / min)} min ago`;
  if (diff < 24 * 60 * min) return `${verb} ${Math.floor(diff / (60 * min))} hr ago`;
  const d = new Date(time);
  const today = new Date(now);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()) return `${verb} yesterday`;
  const opts: Intl.DateTimeFormatOptions = d.getFullYear() === today.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" };
  return `${verb} ${d.toLocaleDateString("en-US", opts)}`;
}

export function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function quotaText(used: number, limit: number | null | undefined) {
  return limit == null ? `${used} / ∞` : `${used} / ${limit}`;
}
