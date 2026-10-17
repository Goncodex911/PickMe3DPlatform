import type { AccountPlan } from "./paymentService";
import type { Deck } from "./presentationService";
import { buildInitMessage, STUDIO_URL } from "./slideBridge";

export type DeckExportFormat = "pptx" | "pdf" | "image";

export interface DeckExportResult {
  ok: boolean;
  feature?: "export-pptx";
  message?: string;
}

/** Tải PPTX / PDF / PNG qua iframe ẩn của studio, cùng giao thức với trang deck. */
export function startDeckDownload({
  deck,
  format,
  account,
  onFinish,
}: {
  deck: Deck;
  format: DeckExportFormat;
  account: Pick<AccountPlan, "plan" | "name" | "features"> | null;
  onFinish: (result: DeckExportResult) => void;
}) {
  const frame = document.createElement("iframe");
  frame.title = "Xuất file";
  const url = new URL(STUDIO_URL, window.location.href);
  url.searchParams.set("job", "download");
  frame.src = url.toString();
  frame.style.cssText = "position:fixed;left:-12000px;top:0;width:1680px;height:1000px;border:0;pointer-events:none";
  let settled = false;
  const finish = (result: DeckExportResult) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    window.removeEventListener("message", onMessage);
    frame.remove();
    onFinish(result);
  };
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== url.origin || event.source !== frame.contentWindow) return;
    const data = event.data as { type?: string; feature?: string; status?: string; message?: string };
    if (!data || typeof data !== "object") return;
    if (data.type === "PM_READY") {
      frame.contentWindow?.postMessage(buildInitMessage({
        deck,
        plan: account?.plan || "free",
        user: { name: account?.name || "" },
        designs: [],
        features: account?.features,
      }), url.origin);
      frame.contentWindow?.postMessage({ type: "PM_DOWNLOAD", format }, url.origin);
    }
    if (data.type === "PM_REQUEST_FEATURE" && data.feature === "export-pptx") finish({ ok: false, feature: "export-pptx" });
    if (data.type === "PM_EXPORT_DONE") {
      if (data.status === "blocked" && format === "pptx") finish({ ok: false, feature: "export-pptx" });
      else finish({ ok: data.status === "done", message: data.status === "done" ? undefined : (data.message || "Không xuất được file") });
    }
  };
  const timer = window.setTimeout(() => finish({ ok: false, message: "Xuất file quá lâu, hãy thử lại" }), 60000);
  window.addEventListener("message", onMessage);
  document.body.appendChild(frame);
}
