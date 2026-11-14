/**
 * Client cho tính năng AI Render phối cảnh (Gemini image model chạy ở backend qua hàng đợi):
 * POST /api/blueprint/ai-render-4k -> 202 { jobId }, rồi hỏi GET /api/blueprint/jobs/:jobId tới khi xong.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api").replace(/\/$/, "");

export interface AIRenderResult {
  renderUrl: string;
  model?: string;
  resolution?: string;
  width?: number | null;
  height?: number | null;
  enhancedPrompt?: string;
  executionTimeMs?: number;
}

export interface AIRenderRequest {
  snapshotDataUrl: string;
  style: string;
  customPrompt?: string;
  onProgress?: (progress: number, stage: string) => void;
  /** Mặc định 180s (model sinh ảnh có thể chậm khi quá tải) */
  timeoutMs?: number;
  pollIntervalMs?: number;
  /** Cho test: thay hàm chờ */
  sleep?: (ms: number) => Promise<void>;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // localStorage bị chặn: backend trả 401 và ta báo lỗi đăng nhập
  }
  return headers;
}

/** Đổi URL tương đối của backend (/api/...) thành URL tuyệt đối. */
export function toAbsoluteRenderUrl(renderUrl: string, apiBase: string = API_BASE): string {
  if (/^(https?:|data:|blob:)/.test(renderUrl)) return renderUrl;
  return `${apiBase.replace(/\/api$/, "")}${renderUrl}`;
}

const LOGIN_REQUIRED = "Bạn cần đăng nhập (hoặc vào bằng tài khoản khách) để dùng AI Render.";

export async function requestAIRender(req: AIRenderRequest): Promise<AIRenderResult> {
  const timeoutMs = req.timeoutMs ?? 180_000;
  const pollIntervalMs = req.pollIntervalMs ?? 1500;
  const sleep = req.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const headers = authHeaders();

  const startRes = await fetch(`${API_BASE}/blueprint/ai-render-4k`, {
    method: "POST",
    headers,
    body: JSON.stringify({ imageBase64: req.snapshotDataUrl, style: req.style, customPrompt: req.customPrompt || "" })
  });
  if (startRes.status === 401) throw new Error(LOGIN_REQUIRED);
  const start = await startRes.json().catch(() => ({}));
  if (!startRes.ok || !start?.success || !start?.jobId) {
    throw new Error(start?.message || `Máy chủ trả về mã ${startRes.status}`);
  }
  req.onProgress?.(5, "Đã xếp hàng tác vụ render...");

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);
    const statusRes = await fetch(`${API_BASE}/blueprint/jobs/${encodeURIComponent(start.jobId)}`, { headers });
    if (statusRes.status === 401) throw new Error(LOGIN_REQUIRED);
    const data = await statusRes.json().catch(() => ({}));
    if (!statusRes.ok || !data?.job) throw new Error(data?.message || `Không đọc được trạng thái render (${statusRes.status})`);

    const job = data.job;
    if (job.status === "failed") throw new Error(job.error || "AI render thất bại.");
    if (job.status === "completed" && job.result?.renderUrl) {
      req.onProgress?.(100, "Hoàn tất");
      return {
        ...job.result,
        renderUrl: toAbsoluteRenderUrl(job.result.renderUrl),
        enhancedPrompt: job.result.enhancedPrompt ?? start.enhancedPrompt
      };
    }
    req.onProgress?.(Number(job.progress) || 0, job.stage || "Đang render...");
  }
  throw new Error(`Quá ${Math.round(timeoutMs / 1000)} giây chưa render xong. Vui lòng thử lại sau.`);
}
