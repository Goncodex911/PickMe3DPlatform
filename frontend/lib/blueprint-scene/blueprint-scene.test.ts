import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { buildExteriorLandscape, flatGroundRadius, PRESET_POOL, resolvePoolRect } from "./landscape";
import { createFurniturePlaceholder, placeLayoutFurniture, resolveFurnitureUrl } from "./furnitureAssets";
import { buildProceduralRoomFurniture } from "./proceduralFurniture";
import { CASA_SERRA_PRESET, type BlueprintProject, type FurniturePlacement } from "../floorplan-types";

const aiProject = (rooms: BlueprintProject["rooms"]): BlueprintProject => ({
  ...CASA_SERRA_PRESET,
  rooms,
  layoutData: {
    metadata: {
      project_id: "ai", project_name: "ai", units: "meters", coordinate_system: "right_handed_y_up",
      dimensions: { width: 44, length: 32, default_ceiling_height: 3.3, exterior_wall_thickness: 0.22, interior_wall_thickness: 0.11 }
    },
    walls: [], openings: [], rooms: [], furniture_assets: []
  }
});

const room = (id: string, name: string, category: any, bounds: [number, number, number, number]) => ({
  id, name, vietnameseName: name, category, bounds, area: 0, ceilingHeight: 3.3, floorMaterial: "concrete" as const,
  description: "", specs: { orientation: "", ventilation: "", lightSource: "" }
});

describe("landscape", () => {
  it("mặt bằng mẫu giữ hồ bơi cố định như trước", () => {
    expect(resolvePoolRect(CASA_SERRA_PRESET)).toEqual(PRESET_POOL);
  });

  it("bản vẽ AI đặt hồ bơi giữa phòng outdoor tên 'hồ bơi', co theo phòng", () => {
    const pool = resolvePoolRect(aiProject([room("p", "Sân Trong & Hồ Bơi", "outdoor", [-4, -8, 16, 8])]));
    expect(pool).toEqual({ cx: 6, cz: 0, width: 18, depth: 3.8 });
  });

  it("bản vẽ AI không có phòng hồ bơi thì không vẽ hồ bơi", () => {
    expect(resolvePoolRect(aiProject([room("g", "Garden", "outdoor", [0, 0, 10, 10])]))).toBeNull();
  });

  it("đất phẳng và cây được đẩy ra ngoài công trình lớn", () => {
    const radius = flatGroundRadius(44, 32);
    expect(radius).toBeGreaterThan(27);
    const group = new THREE.Group();
    buildExteriorLandscape(group, { buildingWidth: 44, buildingLength: 32, pool: null });
    const trees = group.children.filter((c) => c instanceof THREE.Group);
    expect(trees).toHaveLength(16);
    for (const t of trees) expect(Math.hypot(t.position.x, t.position.z)).toBeGreaterThanOrEqual(radius + 3 - 1e-6);
    expect(group.getObjectByName("pool_water")).toBeUndefined();
  });
});

describe("furnitureAssets", () => {
  const sofa: FurniturePlacement = {
    id: "f1", asset_model_id: "sofa_modern_3seat", category: "living",
    position: [2, 0, -3], rotation_deg: 90, scale: [1, 1, 1], glb_url: "/models/furniture/sofa_modern_3seat.glb"
  };

  it("khối giữ chỗ theo kích thước catalog, pivot ở đáy", () => {
    const mesh = createFurniturePlaceholder(sofa);
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    expect(bb.max.x - bb.min.x).toBeCloseTo(2.2, 5);
    expect(bb.min.y).toBeCloseTo(0, 5);
  });

  it("thay khối giữ chỗ bằng mô hình GLB khi nạp xong, đúng vị trí và góc xoay", async () => {
    const fakeScene = new THREE.Group();
    fakeScene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
    const loader = { loadAsync: vi.fn().mockResolvedValue({ scene: fakeScene }) } as any;
    const group = new THREE.Group();

    const result = await placeLayoutFurniture([{ ...sofa, glb_url: "/models/test-ok-1.glb" }], group, { loader });

    expect(result).toEqual({ loaded: 1, placeholders: 0 });
    expect(group.children).toHaveLength(1);
    const model = group.children[0];
    expect(model.name).toBe("furniture_f1");
    expect(model.position.toArray()).toEqual([2, 0, -3]);
    expect(model.rotation.y).toBeCloseTo(Math.PI / 2, 5);
  });

  it("giữ khối giữ chỗ khi không nạp được GLB", async () => {
    const loader = { loadAsync: vi.fn().mockRejectedValue(new Error("404")) } as any;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const group = new THREE.Group();

    const result = await placeLayoutFurniture([{ ...sofa, glb_url: "/models/test-missing.glb" }], group, { loader });

    expect(result).toEqual({ loaded: 0, placeholders: 1 });
    expect(group.children[0].name).toBe("furniture_placeholder_f1");
    warn.mockRestore();
  });

  it("bỏ qua kết quả nạp muộn khi cảnh đã bị dựng lại", async () => {
    const loader = { loadAsync: vi.fn().mockResolvedValue({ scene: new THREE.Group() }) } as any;
    const group = new THREE.Group();
    await placeLayoutFurniture([{ ...sofa, glb_url: "/models/test-stale.glb" }], group, { loader, isActive: () => false });
    expect(group.children[0].name).toBe("furniture_placeholder_f1");
  });

  it("URL nội thất giữ nguyên link tuyệt đối và dùng đường dẫn catalog khi thiếu glb_url", () => {
    expect(resolveFurnitureUrl({ ...sofa, glb_url: "https://cdn.example.com/a.glb" })).toBe("https://cdn.example.com/a.glb");
    expect(resolveFurnitureUrl({ ...sofa, glb_url: "" })).toMatch(/\/models\/furniture\/sofa_modern_3seat\.glb$/);
  });
});

describe("proceduralFurniture (tách khỏi viewer)", () => {
  it("dựng nội thất phòng khách và báo đèn lò sưởi qua ctx", () => {
    const group = new THREE.Group();
    const scene = new THREE.Scene();
    const interiorLights: { light: THREE.Light; baseIntensity: number }[] = [];
    const onFireLight = vi.fn();
    buildProceduralRoomFurniture(
      room("living", "Living", "living", [-4, -3, 4, 3]), 0, 0, 8, 6, group, scene, { interiorLights, onFireLight }
    );
    expect(group.children.length).toBeGreaterThan(5);
    expect(interiorLights.length).toBeGreaterThan(0);
    expect(onFireLight).toHaveBeenCalledTimes(1);
  });
});
