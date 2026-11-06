import { describe, it, expect } from "vitest";
import {
  validateLayoutData,
  convertBlueprintProjectToLayoutData,
  CASA_SERRA_PRESET,
  LayoutData,
  WallSegmentZodSchema,
  OpeningSpecZodSchema,
  RoomPolygonZodSchema
} from "./floorplan-types";
import fs from "fs";
import path from "path";

describe("STORY-THUAN-BP01: LayoutData Schema and Validator", () => {
  it("should validate layout_data_demo_villa.json successfully", () => {
    const filePath = path.resolve(__dirname, "../public/data/layout_data_demo_villa.json");
    const rawData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const result = validateLayoutData(rawData);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.metadata.project_id).toBe("villa_modern_oasis_01");
    expect(result.data?.walls.length).toBeGreaterThan(4);
    expect(result.data?.openings.length).toBeGreaterThan(4);
    expect(result.data?.rooms.length).toBe(4);
    expect(result.data?.furniture_assets.length).toBe(5);
  });

  it("should validate layout_data_demo_apartment.json successfully", () => {
    const filePath = path.resolve(__dirname, "../public/data/layout_data_demo_apartment.json");
    const rawData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const result = validateLayoutData(rawData);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.metadata.project_id).toBe("apartment_skyline_2br");
    expect(result.data?.walls.length).toBeGreaterThan(4);
    expect(result.data?.openings.length).toBeGreaterThan(3);
    expect(result.data?.rooms.length).toBe(4);
  });

  it("should convert legacy BlueprintProject to modern LayoutData and pass validation", () => {
    const layout = convertBlueprintProjectToLayoutData(CASA_SERRA_PRESET);
    expect(layout.metadata.project_name).toBe(CASA_SERRA_PRESET.name);
    expect(layout.walls.length).toBeGreaterThanOrEqual(4);
    expect(layout.rooms.length).toBe(CASA_SERRA_PRESET.rooms.length);

    const validation = validateLayoutData(layout);
    expect(validation.success).toBe(true);
  });

  it("should reject invalid walls with length less than 5cm", () => {
    const invalidWall = {
      id: "wall_too_short",
      type: "interior",
      start: [1.0, 1.0],
      end: [1.0, 1.01], // only 1cm long
      thickness: 0.11,
      height: 3.3
    };

    const parseResult = WallSegmentZodSchema.safeParse(invalidWall);
    expect(parseResult.success).toBe(false);
  });

  it("should reject opening with negative sill height", () => {
    const invalidOpening = {
      id: "op_invalid",
      type: "window",
      center: [0, 0],
      width: 1.0,
      height: 1.5,
      sill_height: -0.5 // negative
    };

    const parseResult = OpeningSpecZodSchema.safeParse(invalidOpening);
    expect(parseResult.success).toBe(false);
  });

  it("should reject room polygon with fewer than 3 vertices", () => {
    const invalidRoom = {
      id: "room_invalid",
      name: "Bad Room",
      category: "living",
      polygon: [
        [0, 0],
        [1, 1]
      ] // only 2 vertices
    };

    const parseResult = RoomPolygonZodSchema.safeParse(invalidRoom);
    expect(parseResult.success).toBe(false);
  });
});

