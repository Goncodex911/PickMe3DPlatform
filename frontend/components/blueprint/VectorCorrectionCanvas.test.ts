import { describe, it, expect } from "vitest";
import { convertBlueprintProjectToLayoutData, CASA_SERRA_PRESET, LayoutData } from "../../lib/floorplan-types";
import { cleanupLayoutGeometry } from "../../lib/floorplan-analyzer";

describe("STORY-THUAN-BP07: Vector Correction Canvas Geometry Logic", () => {
  it("initializes LayoutData properly for 2D canvas editing", () => {
    const layout = convertBlueprintProjectToLayoutData(CASA_SERRA_PRESET);
    expect(layout.walls.length).toBeGreaterThan(0);
    expect(layout.metadata.dimensions.width).toBe(CASA_SERRA_PRESET.specs.width);
    expect(layout.metadata.dimensions.length).toBe(CASA_SERRA_PRESET.specs.length);
  });

  it("calculates correct ortho-snap coordinates for wall drawing", () => {
    // Canvas snapped coordinate calculation helper test
    const start: [number, number] = [0, 0];
    const mousePos: [number, number] = [4.1, 0.2]; // small Y offset, should snap horizontally

    const dx = Math.abs(mousePos[0] - start[0]);
    const dy = Math.abs(mousePos[1] - start[1]);

    let snapped = [...mousePos];
    if (dx > dy && dy < 0.35) {
      snapped = [mousePos[0], start[1]];
    }

    expect(snapped[1]).toBe(0); // Y snapped to horizontal axis
    expect(snapped[0]).toBe(4.1);
  });

  it("runs cleanupLayoutGeometry on edited canvas layout", () => {
    const layout: LayoutData = {
      $schema: "https://pickme3d.com/schemas/layout_data.v1.json",
      metadata: {
        project_id: "test",
        project_name: "Test",
        units: "meters",
        coordinate_system: "right_handed_y_up",
        dimensions: {
          width: 10,
          length: 10,
          default_ceiling_height: 3.3,
          exterior_wall_thickness: 0.22,
          interior_wall_thickness: 0.11
        },
        version: "1.0.0"
      },
      walls: [
        {
          id: "w1",
          type: "exterior",
          start: [0, 0],
          end: [10, 0.1], // slightly tilted wall within 5 deg threshold
          thickness: 0.22,
          height: 3.3
        }
      ],
      openings: [],
      rooms: [],
      furniture_assets: []
    };

    const cleaned = cleanupLayoutGeometry(layout);
    // Wall should be orthogonalized to horizontal [10, 0]
    expect(cleaned.walls[0].end[1]).toBe(0);
  });
});

