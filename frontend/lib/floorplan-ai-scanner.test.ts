import { afterEach, describe, expect, it, vi } from "vitest";
import { extractJsonFromModelText, scanBlueprintWithAI } from "./floorplan-ai-scanner";

const AI_PAYLOAD = {
  metadata: { project_name: "Nhà phố test", dimensions: { width: 5, length: 20, ceiling_height: 3.2 } },
  walls: [
    { id: "w_n", type: "exterior", start: [0, 0], end: [1, 0], openings: ["d1"] },
    { id: "w_e", type: "exterior", start: [1, 0], end: [1, 1], openings: [] },
    { id: "w_s", type: "exterior", start: [1, 1], end: [0, 1], openings: [] },
    { id: "w_w", type: "exterior", start: [0, 1], end: [0, 0], openings: [] }
  ],
  openings: [{ id: "d1", type: "door", wall_id: "w_n", center: [0.5, 0], width_m: 1.2 }],
  rooms: [
    { id: "r1", name: "Living Room", vietnamese_name: "Phòng Khách", category: "living", polygon: [[0, 0], [1, 0], [1, 0.5], [0, 0.5]] },
    { id: "r2", name: "Bedroom", vietnamese_name: "Phòng Ngủ", category: "bedroom", polygon: [[0, 0.5], [1, 0.5], [1, 1], [0, 1]] }
  ],
  furniture_assets: []
};

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Blueprint AI scanner (Gemini qua backend)", () => {
  it("gọi backend /ai/complete và dựng LayoutData từ JSON của AI", async () => {
    const fetchMock = mockFetchOnce({ success: true, content: "```json\n" + JSON.stringify(AI_PAYLOAD) + "\n```" });

    const res = await scanBlueprintWithAI("data:image/jpeg;base64,AAAA");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/ai\/complete$/);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.provider).toBe("gemini");
    expect(sent.messages[0].content[1].image_url.url).toBe("data:image/jpeg;base64,AAAA");

    expect(res.success).toBe(true);
    expect(res.source).toBe("ai");
    expect(res.layoutData?.walls).toHaveLength(4);
    expect(res.layoutData?.metadata.dimensions.width).toBe(5);
    expect(res.project?.rooms).toHaveLength(2);
    expect(res.project?.layoutData).toBe(res.layoutData);
  });

  it("báo lỗi rõ ràng khi backend lỗi, KHÔNG trả mặt bằng mẫu", async () => {
    mockFetchOnce({ success: false, error: { message: "Chưa cấu hình API Key" } }, 400);

    const res = await scanBlueprintWithAI("AAAA");

    expect(res.success).toBe(false);
    expect(res.source).toBe("error");
    expect(res.project).toBeUndefined();
    expect(res.layoutData).toBeUndefined();
    expect(res.error).toContain("Chưa cấu hình API Key");
  });

  it("báo lỗi khi AI không nhận diện được tường nào", async () => {
    mockFetchOnce({ success: true, content: JSON.stringify({ ...AI_PAYLOAD, walls: [] }) });

    const res = await scanBlueprintWithAI("AAAA");

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/không nhận diện được tường/i);
  });

  it("báo lỗi khi phản hồi bị cắt ngang (finish_reason=length)", async () => {
    mockFetchOnce({ success: true, content: '{"walls": [', finish_reason: "length" });

    const res = await scanBlueprintWithAI("AAAA");

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/cắt ngang/);
  });

  it("huỷ yêu cầu và báo hết giờ khi AI không phản hồi", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      })
    ));

    const res = await scanBlueprintWithAI("AAAA", undefined, 20);

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/chưa phản hồi/);
  });
});

describe("extractJsonFromModelText", () => {
  it("đọc JSON trong code fence", () => {
    expect(extractJsonFromModelText('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("đọc JSON lẫn chữ thừa trước/sau", () => {
    expect(extractJsonFromModelText('Đây là kết quả: {"a": {"b": 2}} xong.')).toEqual({ a: { b: 2 } });
  });
});
