import { describe, it, expect, vi } from "vitest";
import FloorLayerToolbar, { FloorLayerToolbarProps } from "./FloorLayerToolbar";

const baseProps = (overrides: Partial<FloorLayerToolbarProps> = {}): FloorLayerToolbarProps => ({
  cameraMode: "orbit",
  onCameraModeChange: vi.fn(),
  showCeilings: true,
  onToggleCeilings: vi.fn(),
  showWalls: true,
  onToggleWalls: vi.fn(),
  showFurniture: true,
  onToggleFurniture: vi.fn(),
  showLandscape: true,
  onToggleLandscape: vi.fn(),
  isRulerActive: false,
  onToggleRuler: vi.fn(),
  measuredDistance: null,
  onClearMeasurement: vi.fn(),
  ...overrides
});

const render = (overrides: Partial<FloorLayerToolbarProps> = {}) =>
  JSON.stringify(FloorLayerToolbar(baseProps(overrides)));

describe("STORY-THUAN-BP08: Thanh công cụ dọc bên trái (FloorLayerToolbar)", () => {
  it("hiển thị đủ 4 chế độ xem dưới dạng nút có nhãn", () => {
    const json = render();
    expect(json).toContain("Công cụ bản vẽ 3D");
    for (const label of ["Mặt Bằng (2D)", "Sa Bàn (1.5m)", "Xoay 360°", "Đi Dạo (WASD)"]) {
      expect(json).toContain(label);
    }
  });

  it("chỉ hiện nút tệp/thu phóng khi được truyền handler", () => {
    expect(render()).not.toContain("Tải bản vẽ 2D");
    const json = render({ onUploadClick: vi.fn(), onExportGLB: vi.fn(), onSelectArchetype: vi.fn(), onZoomIn: vi.fn(), zoomScale: 1.4 });
    expect(json).toContain("Tải bản vẽ 2D");
    expect(json).toContain("Xuất 3D (.GLB)");
    expect(json).toContain("Mặt bằng mẫu");
    expect(json).toContain("Phóng to");
    expect(json).toContain("140");
  });

  it("bảng lớp hiển thị chỉ xuất hiện khi mở, gồm cả khung dây", () => {
    expect(render()).not.toContain("Trần / Mái");
    const json = render({ openPanel: "layers", onToggleWireframe: vi.fn() });
    for (const label of ["Trần / Mái", "Tường", "Nội thất", "Sân vườn", "Khung dây (Wireframe)"]) {
      expect(json).toContain(label);
    }
  });

  it("bảng mặt bằng mẫu liệt kê các mẫu và nút khôi phục demo", () => {
    const json = render({ openPanel: "samples", onSelectArchetype: vi.fn(), onResetToDemo: vi.fn() });
    expect(json).toContain("Biệt thự Casa Serra");
    expect(json).toContain("Căn hộ cao cấp 2 phòng ngủ");
    expect(json).toContain("Khôi phục bản demo ban đầu");
  });

  it("bảng phong cách đánh dấu phong cách đang chọn", () => {
    const json = render({ openPanel: "style", onSelectStyle: vi.fn(), currentStyle: "tropical" });
    expect(json).toContain('"label":"Nhiệt Đới Xanh","selected":true');
    expect(json).toContain('"label":"Bắc Âu Gỗ Sồi","selected":false');
  });

  it("displays measured distance when ruler has 2 points", () => {
    const json = render({ isRulerActive: true, measuredDistance: 4.852 });
    expect(json).toContain('"4.85"');
    expect(json).toContain('" m"');
  });

  it("nhắc cách đo khi bật thước nhưng chưa có kết quả", () => {
    expect(render({ isRulerActive: true })).toContain("Bấm 2 điểm trong không gian 3D để đo");
  });

  it("displays walkthrough instructions when cameraMode is walkthrough", () => {
    const json = render({ cameraMode: "walkthrough" });
    expect(json).toContain("W-A-S-D");
    expect(json).toContain("First-Person");
  });

  it("STORY-THUAN-BP16: nút AI render dùng Gemini, không quảng cáo 4K/ControlNet", () => {
    const json = render({ onTriggerAIRender: vi.fn() });
    expect(json).toContain("AI Render phối cảnh");
    expect(json).toContain("Gemini");
    expect(json).not.toContain("4K");
    expect(json.toUpperCase()).not.toContain("CONTROLNET");
  });
});
