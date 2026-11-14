import { afterEach, describe, expect, it, vi } from "vitest";
import { requestAIRender, toAbsoluteRenderUrl } from "./aiRenderClient";

const json = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

afterEach(() => vi.unstubAllGlobals());

describe("requestAIRender (Gemini qua hàng đợi backend)", () => {
  it("gửi ảnh, hỏi trạng thái tới khi xong và trả URL tuyệt đối", async () => {
    vi.stubGlobal("localStorage", { getItem: () => "tok" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(202, { success: true, jobId: "job_bp_1", enhancedPrompt: "p" }))
      .mockResolvedValueOnce(json(200, { success: true, job: { status: "processing", progress: 30, stage: "Gemini đang render" } }))
      .mockResolvedValueOnce(json(200, {
        success: true,
        job: { status: "completed", progress: 100, result: { renderUrl: "/api/blueprint/cdn/renders/a.png", model: "gemini-x", resolution: "1024x768" } }
      }));
    vi.stubGlobal("fetch", fetchMock);
    const stages: string[] = [];

    const result = await requestAIRender({
      snapshotDataUrl: "data:image/jpeg;base64,AAA",
      style: "scandinavian",
      onProgress: (_p, s) => stages.push(s),
      sleep: async () => {}
    });

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/blueprint\/ai-render-4k$/);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).style).toBe("scandinavian");
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/blueprint\/jobs\/job_bp_1$/);
    expect(result.renderUrl).toMatch(/^http:\/\/localhost:5001\/api\/blueprint\/cdn\/renders\/a\.png$/);
    expect(result.model).toBe("gemini-x");
    expect(result.enhancedPrompt).toBe("p");
    expect(stages).toContain("Gemini đang render");
  });

  it("báo lỗi khi tác vụ thất bại", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json(202, { success: true, jobId: "j" }))
      .mockResolvedValueOnce(json(200, { success: true, job: { status: "failed", error: "Gemini quá tải" } })));
    await expect(requestAIRender({ snapshotDataUrl: "x", style: "s", sleep: async () => {} })).rejects.toThrow("Gemini quá tải");
  });

  it("báo cần đăng nhập khi backend trả 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json(401, {})));
    await expect(requestAIRender({ snapshotDataUrl: "x", style: "s" })).rejects.toThrow(/đăng nhập/);
  });

  it("dừng hỏi và báo hết giờ", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json(202, { success: true, jobId: "j" }))
      .mockResolvedValue(json(200, { success: true, job: { status: "processing", progress: 10 } })));
    await expect(
      requestAIRender({ snapshotDataUrl: "x", style: "s", timeoutMs: 30, pollIntervalMs: 10 })
    ).rejects.toThrow(/chưa render xong/);
  });

  it("giữ nguyên URL Cloudinary tuyệt đối", () => {
    expect(toAbsoluteRenderUrl("https://res.cloudinary.com/x.png")).toBe("https://res.cloudinary.com/x.png");
  });
});
