import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import * as THREE from "three";
import { validateLayoutData, LayoutData } from "./floorplan-types";
import { cleanupLayoutGeometry } from "./floorplan-analyzer";
import { generateWallSegmentMeshes, generateRoomFloorMesh } from "./floorplan-mesh-generator";

describe("STORY-THUAN-BP09: Geometric Test Suite & 10 Benchmark Architectural Blueprints", () => {
  const benchmarkDir = path.resolve(__dirname, "../public/data/benchmarks");
  const benchmarkFiles = fs
    .readdirSync(benchmarkDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  it("Task 5.1.1: contains exactly 10 distinct architectural benchmark files", () => {
    expect(benchmarkFiles.length).toBe(10);
  });

  benchmarkFiles.forEach((file, index) => {
    it(`Benchmark #${index + 1} (${file}): validates, cleans and extrudes 3D mesh without errors`, () => {
      const filePath = path.join(benchmarkDir, file);
      const rawContent = fs.readFileSync(filePath, "utf-8");
      const layout: LayoutData = JSON.parse(rawContent);

      // 1. Schema Validation
      const validation = validateLayoutData(layout);
      if (!validation.success) {
        console.error(`Validation failed for ${file}:`, validation.errors);
      }
      expect(validation.success).toBe(true);
      expect(validation.data).toBeDefined();

      // 2. Vector Cleanup (Orthogonalization, Snapping, Collinear Merge)
      const cleaned = cleanupLayoutGeometry(layout);
      expect(cleaned.walls.length).toBeGreaterThanOrEqual(4);
      expect(cleaned.rooms.length).toBeGreaterThanOrEqual(1);

      // 3. Segmented Wall Extrusion into 3D Box Meshes
      let totalWallParts = 0;
      cleaned.walls.forEach((wall) => {
        const wallOpenings = cleaned.openings.filter((o) => o.wall_id === wall.id);
        const wallGroup = generateWallSegmentMeshes(wall, wallOpenings);
        expect(wallGroup).toBeDefined();
        expect(wallGroup.children.length).toBeGreaterThan(0);
        totalWallParts += wallGroup.children.length;

        // Verify valid geometric dimensions & coordinates
        wallGroup.children.forEach((child) => {
          expect(Number.isFinite(child.position.x)).toBe(true);
          expect(Number.isFinite(child.position.y)).toBe(true);
          expect(Number.isFinite(child.position.z)).toBe(true);
        });
      });
      expect(totalWallParts).toBeGreaterThanOrEqual(cleaned.walls.length);

      // 4. Room Floor Extrusion
      cleaned.rooms.forEach((room) => {
        const floorMesh = generateRoomFloorMesh(room);
        expect(floorMesh).toBeDefined();
        const floorGeo = floorMesh.geometry as THREE.BufferGeometry;
        const posAttr = floorGeo.getAttribute("position");
        expect(posAttr).toBeDefined();
        expect(posAttr.count).toBeGreaterThan(0);

        // Verify no NaN or Inf
        for (let i = 0; i < posAttr.count; i++) {
          expect(Number.isFinite(posAttr.getX(i))).toBe(true);
          expect(Number.isFinite(posAttr.getY(i))).toBe(true);
          expect(Number.isFinite(posAttr.getZ(i))).toBe(true);
        }
      });
    });
  });

  it("Task 5.1.1 (Performance): full pipeline execution across all 10 benchmarks completes in < 3000ms", () => {
    const startTime = performance.now();

    for (const file of benchmarkFiles) {
      const filePath = path.join(benchmarkDir, file);
      const layout: LayoutData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const cleaned = cleanupLayoutGeometry(layout);
      cleaned.walls.forEach((w) => {
        const wOpenings = cleaned.openings.filter((o) => o.wall_id === w.id);
        generateWallSegmentMeshes(w, wOpenings);
      });
      cleaned.rooms.forEach((r) => {
        generateRoomFloorMesh(r);
      });
    }

    const duration = performance.now() - startTime;
    // Acceptance criteria: entire batch processing is blazing fast (< 3000ms)
    expect(duration).toBeLessThan(3000);
  });
});
