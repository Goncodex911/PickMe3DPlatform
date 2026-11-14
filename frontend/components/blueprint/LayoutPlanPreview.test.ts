import { describe, expect, it } from "vitest";
import LayoutPlanPreview from "./LayoutPlanPreview";
import type { LayoutData } from "../../lib/floorplan-types";

const layout: LayoutData = {
  metadata: {
    project_id: "p", project_name: "p", units: "meters", coordinate_system: "right_handed_y_up",
    dimensions: { width: 4, length: 2, default_ceiling_height: 2.8, exterior_wall_thickness: 0.22, interior_wall_thickness: 0.11 }
  },
  walls: [
    { id: "n", type: "exterior", start: [-2, -1], end: [2, -1], thickness: 0.22, height: 2.8, openings: ["d"] },
    { id: "m", type: "interior", start: [0, -1], end: [0, 1], thickness: 0.11, height: 2.8, openings: [] }
  ],
  openings: [{ id: "d", type: "door", wall_id: "n", center: [1, -1], width: 0.8, height: 2.1, sill_height: 0 }],
  rooms: [
    { id: "a", name: "Bath", vietnamese_name: "Phòng Vệ Sinh & Lavabo", category: "bath", polygon: [[-2, -1], [0, -1], [0, 1], [-2, 1]], area_m2: 4 },
    { id: "b", name: "Shower", vietnamese_name: "Khu Tắm Đứng", category: "bath", polygon: [[0, -1], [2, -1], [2, 1], [0, 1]], area_m2: 4 }
  ],
  furniture_assets: []
};

describe("LayoutPlanPreview", () => {
  it("vẽ đủ phòng, tường, cửa trong viewBox bao trọn công trình", () => {
    const el = LayoutPlanPreview({ layout }) as any;
    const json = JSON.stringify(el);
    expect(el.type).toBe("svg");
    const [x, y, w, h] = el.props.viewBox.split(" ").map(Number);
    expect(x).toBeLessThan(-2);
    expect(y).toBeLessThan(-1);
    expect(x + w).toBeGreaterThan(2);
    expect(y + h).toBeGreaterThan(1);
    expect(json.match(/"polygon"/g)).toHaveLength(2);
    expect(json.match(/"line"/g)).toHaveLength(3); // 2 tường + 1 cửa
    expect(json).toContain("#FF4D00"); // cửa đi màu cam
    expect(el.props["aria-label"]).toContain("2 phòng");
  });

  it("cửa nằm dọc theo hướng tường chứa nó", () => {
    const json = JSON.stringify(LayoutPlanPreview({ layout }));
    // tường "n" nằm ngang => cửa rộng 0.8 trải từ x=0.6 đến x=1.4 tại z=-1
    expect(json).toContain('"x1":0.6,"y1":-1,"x2":1.4,"y2":-1');
  });

  it("báo chưa có dữ liệu khi layout rỗng", () => {
    const empty = { ...layout, walls: [], rooms: [], openings: [] };
    expect(JSON.stringify(LayoutPlanPreview({ layout: empty }))).toContain("Chưa có dữ liệu mặt bằng");
  });
});
