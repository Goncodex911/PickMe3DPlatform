import { describe, it, expect } from "vitest";
import {
  orthogonalizeWall,
  snapWallEndpoints,
  mergeCollinearWalls,
  snapOpeningsToWalls,
  cleanupLayoutGeometry
} from "./floorplan-analyzer";
import {
  normalizedToMeters,
  buildLayoutFromParsedAI
} from "./floorplan-ai-scanner";
import { WallSegment, OpeningSpec, LayoutData } from "./floorplan-types";

describe("STORY-THUAN-BP03: AI Vision Parser & Coordinate Normalization", () => {
  it("should map normalized coordinates [0..1] to world meters centered at (0, 0)", () => {
    const width = 12.0;
    const length = 16.0;

    // Top-left
    expect(normalizedToMeters([0.0, 0.0], width, length)).toEqual([-6.0, -8.0]);
    // Center
    expect(normalizedToMeters([0.5, 0.5], width, length)).toEqual([0.0, 0.0]);
    // Bottom-right
    expect(normalizedToMeters([1.0, 1.0], width, length)).toEqual([6.0, 8.0]);
  });

  it("should build structured LayoutData and legacy BlueprintProject from parsed AI payload", () => {
    const mockAIPayload = {
      metadata: {
        project_name: "Modern Minimalist Loft",
        dimensions: {
          width: 10.0,
          length: 14.0,
          ceiling_height: 3.2,
          exterior_wall_thickness: 0.22,
          interior_wall_thickness: 0.11
        }
      },
      walls: [
        { id: "w_ext_n", type: "exterior", start: [0.0, 0.0], end: [1.0, 0.0], openings: ["win_front"] },
        { id: "w_ext_e", type: "exterior", start: [1.0, 0.0], end: [1.0, 1.0], openings: [] },
        { id: "w_ext_s", type: "exterior", start: [1.0, 1.0], end: [0.0, 1.0], openings: ["door_main"] },
        { id: "w_ext_w", type: "exterior", start: [0.0, 1.0], end: [0.0, 0.0], openings: [] }
      ],
      openings: [
        { id: "door_main", type: "door", wall_id: "w_ext_s", center: [0.5, 1.0], width_m: 1.4, height_m: 2.2, sill_height_m: 0.0 },
        { id: "win_front", type: "window", wall_id: "w_ext_n", center: [0.5, 0.0], width_m: 1.8, height_m: 1.5, sill_height_m: 0.9 }
      ],
      rooms: [
        {
          id: "room_living",
          name: "Living Room",
          vietnamese_name: "Phòng Khách",
          category: "living",
          polygon: [[0.0, 0.0], [0.5, 0.0], [0.5, 1.0], [0.0, 1.0]],
          area_m2: 35.0,
          floor_material: "concrete"
        }
      ],
      furniture_assets: [
        { id: "f_sofa", asset_model_id: "sofa_modern_3seat", category: "living", position: [0.25, 0.5], rotation_deg: 0 }
      ]
    };

    const { layoutData, project } = buildLayoutFromParsedAI(mockAIPayload, { targetWidth: 10, targetLength: 14 });

    expect(layoutData.metadata.dimensions.width).toBe(10);
    expect(layoutData.metadata.dimensions.length).toBe(14);
    expect(layoutData.walls.length).toBe(4);
    expect(layoutData.openings.length).toBe(2);
    expect(layoutData.rooms.length).toBe(1);
    expect(layoutData.furniture_assets.length).toBe(1);

    expect(project.specs.width).toBe(10);
    expect(project.rooms.length).toBe(1);
  });
});

describe("STORY-THUAN-BP04: Vector Cleanup Algorithms", () => {
  describe("1. Orthogonalization", () => {
    it("should snap slightly slanted wall (angle 2.5°) to exact horizontal axis (0°)", () => {
      // Slanted wall: length ~ 5m, dz = 0.22m => angle ~ 2.5° (< 5°)
      const slantedWall: WallSegment = {
        id: "w_slanted_h",
        type: "exterior",
        start: [0.0, 0.0],
        end: [5.0, 0.22],
        thickness: 0.22,
        height: 3.3
      };

      const cleaned = orthogonalizeWall(slantedWall, 5.0);
      expect(cleaned.end[1]).toBe(0.0); // Z should be snapped to match start Z
      expect(cleaned.end[0]).toBeCloseTo(Math.hypot(5.0, 0.22), 2);
    });

    it("should snap slightly slanted wall (angle 88°) to exact vertical axis (90°)", () => {
      // Slanted vertical wall: dx = 0.15m, dz = 4.0m => angle ~ 87.8° (< 5° from 90°)
      const slantedWall: WallSegment = {
        id: "w_slanted_v",
        type: "interior",
        start: [2.0, 1.0],
        end: [2.15, 5.0],
        thickness: 0.11,
        height: 3.3
      };

      const cleaned = orthogonalizeWall(slantedWall, 5.0);
      expect(cleaned.end[0]).toBe(2.0); // X should be snapped to match start X
      expect(cleaned.end[1]).toBeCloseTo(1.0 + Math.hypot(0.15, 4.0), 2);
    });

    it("should preserve intentional diagonal walls (e.g. 45° angle)", () => {
      const diagonalWall: WallSegment = {
        id: "w_diag",
        type: "interior",
        start: [0.0, 0.0],
        end: [3.0, 3.0],
        thickness: 0.11,
        height: 3.3
      };

      const cleaned = orthogonalizeWall(diagonalWall, 5.0);
      expect(cleaned.end[0]).toBe(3.0);
      expect(cleaned.end[1]).toBe(3.0);
    });
  });

  describe("2. Wall Snapping", () => {
    it("should snap two wall endpoints within 15cm to a shared vertex", () => {
      const walls: WallSegment[] = [
        {
          id: "w1",
          type: "exterior",
          start: [-5.0, -5.0],
          end: [5.0, -5.0],
          thickness: 0.22,
          height: 3.3
        },
        {
          id: "w2",
          type: "exterior",
          // Gap of 0.08m (8cm < 15cm) from w1.end [5.0, -5.0]
          start: [5.08, -5.0],
          end: [5.08, 5.0],
          thickness: 0.22,
          height: 3.3
        }
      ];

      const snapped = snapWallEndpoints(walls, 0.15);
      expect(snapped[0].end[0]).toBe(snapped[1].start[0]);
      expect(snapped[0].end[1]).toBe(snapped[1].start[1]);
      expect(snapped[0].end[0]).toBeCloseTo(5.04, 2);
    });

    it("should not snap endpoints separated by more than 15cm", () => {
      const walls: WallSegment[] = [
        {
          id: "w1",
          type: "exterior",
          start: [0.0, 0.0],
          end: [5.0, 0.0],
          thickness: 0.22,
          height: 3.3
        },
        {
          id: "w2",
          type: "exterior",
          start: [5.5, 0.0], // 50cm gap
          end: [10.0, 0.0],
          thickness: 0.22,
          height: 3.3
        }
      ];

      const snapped = snapWallEndpoints(walls, 0.15);
      expect(snapped[0].end[0]).toBe(5.0);
      expect(snapped[1].start[0]).toBe(5.5);
    });
  });

  describe("3. Collinear Wall Merging", () => {
    it("should merge two continuous collinear walls into one single segment", () => {
      const walls: WallSegment[] = [
        {
          id: "w_seg1",
          type: "interior",
          start: [0.0, 0.0],
          end: [3.0, 0.0],
          thickness: 0.11,
          height: 3.3,
          openings: ["door_1"]
        },
        {
          id: "w_seg2",
          type: "interior",
          // Touching w_seg1 with 2cm gap
          start: [3.02, 0.0],
          end: [6.0, 0.0],
          thickness: 0.11,
          height: 3.3,
          openings: ["win_1"]
        }
      ];

      const merged = mergeCollinearWalls(walls, 1.0, 0.05);
      expect(merged.length).toBe(1);
      expect(merged[0].start[0]).toBe(0.0);
      expect(merged[0].end[0]).toBe(6.0);
      expect(merged[0].openings).toContain("door_1");
      expect(merged[0].openings).toContain("win_1");
    });
  });

  describe("4. Snap Openings to Walls", () => {
    it("should project an opening orthogonally onto the centerline of its wall", () => {
      const wall: WallSegment = {
        id: "w_ref",
        type: "exterior",
        start: [0.0, 0.0],
        end: [6.0, 0.0],
        thickness: 0.22,
        height: 3.3,
        openings: []
      };

      const opening: OpeningSpec = {
        id: "op_misaligned",
        type: "door",
        wall_id: "w_ref",
        center: [3.0, 0.12], // offset by 12cm off the wall centerline Z=0
        width: 1.0,
        height: 2.2,
        sill_height: 0.0
      };

      const snapped = snapOpeningsToWalls([opening], [wall]);
      expect(snapped[0].center[0]).toBe(3.0);
      expect(snapped[0].center[1]).toBe(0.0); // Z projected to centerline
      expect(snapped[0].rotation_deg).toBe(0.0); // aligned to wall orientation
      expect(wall.openings).toContain("op_misaligned");
    });
  });

  describe("5. Full Cleanup Pipeline", () => {
    it("should execute cleanupLayoutGeometry end-to-end", () => {
      const rawLayout: LayoutData = {
        metadata: {
          project_id: "test-proj",
          project_name: "Test Project",
          units: "meters",
          coordinate_system: "right_handed_y_up",
          dimensions: {
            width: 10,
            length: 10,
            default_ceiling_height: 3.3,
            exterior_wall_thickness: 0.22,
            interior_wall_thickness: 0.11
          }
        },
        walls: [
          // Slightly slanted horizontal wall
          { id: "w1", type: "exterior", start: [0, 0], end: [5, 0.15], thickness: 0.22, height: 3.3, openings: [] },
          // Adjoining wall with small gap
          { id: "w2", type: "exterior", start: [5.08, 0], end: [5.08, 5], thickness: 0.22, height: 3.3, openings: [] }
        ],
        openings: [
          { id: "op1", type: "door", center: [2.5, 0.08], width: 1.0, height: 2.2, sill_height: 0 }
        ],
        rooms: [],
        furniture_assets: []
      };

      const cleaned = cleanupLayoutGeometry(rawLayout);
      expect(cleaned.walls.length).toBeGreaterThan(0);
      expect(cleaned.openings[0].center[1]).toBe(0.0);
    });
  });
});

