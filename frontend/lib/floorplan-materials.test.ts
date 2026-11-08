import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createPhotorealisticMaterialLibrary } from "./floorplan-materials";
import { createDefaultArchitecturalMaterials, generateRoomFloorMesh } from "./floorplan-mesh-generator";
import { RoomPolygon } from "./floorplan-types";

describe("STORY-THUAN-BP11: Photorealistic PBR Material System", () => {
  it("creates complete PBR material library with all required materials", () => {
    const lib = createPhotorealisticMaterialLibrary("scandinavian");
    expect(lib.oakParquetFloor).toBeDefined();
    expect(lib.marbleTileFloor).toBeDefined();
    expect(lib.balconySlateFloor).toBeDefined();
    expect(lib.warmWhiteWall).toBeDefined();
    expect(lib.glassShowerClear).toBeDefined();
    expect(lib.metalDarkBrushed).toBeDefined();
    expect(lib.blackGraniteCounter).toBeDefined();
  });

  it("configures transparent glass shower with physical transmission (transmission: 0.95, roughness: 0.05, ior: 1.5)", () => {
    const lib = createPhotorealisticMaterialLibrary("scandinavian");
    const glass = lib.glassShowerClear;

    expect(glass).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(glass.transparent).toBe(true);
    expect(glass.transmission).toBe(0.95);
    expect(glass.roughness).toBe(0.05);
    expect(glass.ior).toBe(1.5);
  });

  it("verifies 4 PBR texture sets have map, normalMap, and roughnessMap attached", () => {
    const lib = createPhotorealisticMaterialLibrary("scandinavian");

    // 1. Oak parquet
    expect(lib.oakParquetFloor.map).toBeDefined();
    expect(lib.oakParquetFloor.normalMap).toBeDefined();
    expect(lib.oakParquetFloor.roughnessMap).toBeDefined();

    // 2. Marble tile
    expect(lib.marbleTileFloor.map).toBeDefined();
    expect(lib.marbleTileFloor.normalMap).toBeDefined();
    expect(lib.marbleTileFloor.roughnessMap).toBeDefined();

    // 3. Slate balcony
    expect(lib.balconySlateFloor.map).toBeDefined();
    expect(lib.balconySlateFloor.normalMap).toBeDefined();
    expect(lib.balconySlateFloor.roughnessMap).toBeDefined();

    // 4. Plaster wall
    expect(lib.warmWhiteWall.map).toBeDefined();
    expect(lib.warmWhiteWall.normalMap).toBeDefined();
    expect(lib.warmWhiteWall.roughnessMap).toBeDefined();
  });

  it("adapts colors according to architectural style", () => {
    const scandiLib = createPhotorealisticMaterialLibrary("scandinavian");
    const luxuryLib = createPhotorealisticMaterialLibrary("luxury_marble");
    const minimalLib = createPhotorealisticMaterialLibrary("modern_minimal");

    expect(scandiLib.oakParquetFloor.color.getHex()).not.toBe(minimalLib.oakParquetFloor.color.getHex());
    expect(luxuryLib.marbleTileFloor.roughness).toBeLessThan(0.25);
  });

  it("Task 6.1.2: generateRoomFloorMesh applies world-space UV coordinates (1m = 2 repeats)", () => {
    const materials = createDefaultArchitecturalMaterials("scandinavian");
    const room: RoomPolygon = {
      id: "room_living",
      name: "Living Room",
      category: "living",
      polygon: [
        [0, 0],
        [4, 0],
        [4, 5],
        [0, 5]
      ],
      materials: {
        floor: "oak"
      }
    };

    const floorMesh = generateRoomFloorMesh(room, materials, 2.0);
    expect(floorMesh).toBeDefined();
    expect(floorMesh.geometry).toBeDefined();

    const uvAttr = floorMesh.geometry.getAttribute("uv");
    expect(uvAttr).toBeDefined();
    expect(uvAttr.count).toBeGreaterThan(0);

    // Verify UV values scale with world coordinates (4m -> uv 8, 5m -> uv 10)
    let maxU = 0;
    let maxV = 0;
    for (let i = 0; i < uvAttr.count; i++) {
      maxU = Math.max(maxU, uvAttr.getX(i));
      maxV = Math.max(maxV, uvAttr.getY(i));
    }
    expect(maxU).toBeCloseTo(8.0, 1);
    expect(maxV).toBeCloseTo(10.0, 1);
  });
});
