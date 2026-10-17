// Định dạng thời gian và nhãn cho danh sách deck

export function editedLabel(updatedAt?: string, createdAt?: string, now = Date.now()) {
  const at = updatedAt || createdAt;
  if (!at) return "";
  const time = new Date(at).getTime();
  if (!Number.isFinite(time)) return "";
  const verb = createdAt && updatedAt && Math.abs(new Date(updatedAt).getTime() - new Date(createdAt).getTime()) < 5000 ? "Tạo" : "Sửa";
  const diff = Math.max(0, now - time);
  const min = 60 * 1000;
  if (diff < min) return `${verb} vừa xong`;
  if (diff < 60 * min) return `${verb} ${Math.floor(diff / min)} phút trước`;
  if (diff < 24 * 60 * min) return `${verb} ${Math.floor(diff / (60 * min))} giờ trước`;
  const d = new Date(time);
  const today = new Date(now);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()) return `${verb} hôm qua`;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return d.getFullYear() === today.getFullYear() ? `${verb} ${dd}/${mm}` : `${verb} ${dd}/${mm}/${d.getFullYear()}`;
}

export function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function quotaText(used: number, limit: number | null | undefined) {
  return limit == null ? `${used} / ∞` : `${used} / ${limit}`;
}
