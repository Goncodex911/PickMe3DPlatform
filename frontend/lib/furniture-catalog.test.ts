import { describe, it, expect } from "vitest";
import { FURNITURE_CATALOG, getFurnitureAssetById, getFurnitureAssetsByCategory } from "./furniture-catalog";
import fs from "fs";
import path from "path";

describe("STORY-THUAN-BP02: 3D Asset Furniture Library & Catalog", () => {
  const modelsDir = path.resolve(__dirname, "../public/models/furniture");
  const catalogJsonPath = path.join(modelsDir, "furniture-catalog.json");

  it("should have 20 standardized assets in the catalog (8 core + 12 archviz)", () => {
    expect(FURNITURE_CATALOG.length).toBe(20);
  });

  it("should have a valid furniture-catalog.json file matching the metadata", () => {
    expect(fs.existsSync(catalogJsonPath)).toBe(true);
    const jsonContent = JSON.parse(fs.readFileSync(catalogJsonPath, "utf-8"));
    expect(jsonContent.assets.length).toBe(20);
  });

  it("should verify every asset has a valid .glb file with magic header 'glTF'", () => {
    for (const asset of FURNITURE_CATALOG) {
      const glbPath = path.resolve(__dirname, `../public${asset.glb_url}`);
      expect(fs.existsSync(glbPath)).toBe(true);

      const buffer = fs.readFileSync(glbPath);
      // GLB files must be under 1.5 MB (1,572,864 bytes)
      expect(buffer.byteLength).toBeLessThan(1.5 * 1024 * 1024);
      expect(buffer.byteLength).toBeGreaterThan(1024); // at least 1KB

      // Magic header for glTF binary is 0x46546C67 ("glTF")
      const magic = buffer.toString("utf-8", 0, 4);
      expect(magic).toBe("glTF");
    }
  });

  it("should enforce bottom-center pivot point (0, 0, 0) for all assets", () => {
    for (const asset of FURNITURE_CATALOG) {
      expect(asset.pivot_point).toEqual([0.0, 0.0, 0.0]);
      expect(asset.pivot_alignment).toBe("bottom_center");
      expect(asset.dimensions.width).toBeGreaterThan(0);
      expect(asset.dimensions.height).toBeGreaterThan(0);
      expect(asset.dimensions.depth).toBeGreaterThan(0);
    }
  });

  it("should support looking up assets by id and filtering by category", () => {
    const sofa = getFurnitureAssetById("sofa_modern_3seat");
    expect(sofa).toBeDefined();
    expect(sofa?.vietnamese_name).toContain("Sofa");

    const bathAssets = getFurnitureAssetsByCategory("bath");
    expect(bathAssets.length).toBeGreaterThanOrEqual(2);
    expect(bathAssets.some((a) => a.id === "toilet_wall_hung")).toBe(true);
    expect(bathAssets.some((a) => a.id === "sink_cabinet_bath")).toBe(true);
    expect(bathAssets.some((a) => a.id === "archviz_shower_cabin_glass")).toBe(true);
  });
});

