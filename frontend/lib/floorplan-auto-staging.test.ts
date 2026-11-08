import { describe, it, expect } from "vitest";
import {
  autoStageLayoutData,
  applyStyleToBlueprintProject,
  SYSTEM_STYLE_PRESETS
} from "./floorplan-auto-staging";
import {
  LayoutData,
  RoomPolygon,
  CASA_SERRA_PRESET
} from "./floorplan-types";

describe("STORY-THUAN-BP15: Smart Auto-Staging Engine", () => {
  it("provides complete style preset definitions for all system styles", () => {
    const styles = ["scandinavian", "luxury_marble", "modern_minimal", "casa_serra", "tropical"] as const;
    styles.forEach((style) => {
      const preset = SYSTEM_STYLE_PRESETS[style];
      expect(preset).toBeDefined();
      expect(preset.name).toBeTruthy();
      expect(preset.vietnameseName).toBeTruthy();
      expect(preset.palette.length).toBeGreaterThanOrEqual(4);
      expect(preset.floorLiving).toBeDefined();
      expect(preset.floorBath).toBeDefined();
    });
  });

  it("stages Bedroom furniture according to anthropometric rules", () => {
    // Wide bedroom (5m wide x 3.5m deep)
    const wideBedroom: RoomPolygon = {
      id: "room-bedroom-1",
      name: "Master Bedroom",
      category: "bedroom",
      polygon: [
        [0, 0],
        [5, 0],
        [5, 3.5],
        [0, 3.5]
      ],
      materials: { floor: "oak" }
    };

    const layout: LayoutData = {
      metadata: {
        project_id: "p1",
        project_name: "Test Staging",
        units: "meters",
        coordinate_system: "right_handed_y_up",
        dimensions: {
          width: 5,
          length: 3.5,
          default_ceiling_height: 3.3,
          exterior_wall_thickness: 0.22,
          interior_wall_thickness: 0.11
        }
      },
      rooms: [wideBedroom],
      walls: [],
      openings: [],
      furniture_assets: []
    };

    const staged = autoStageLayoutData(layout, "scandinavian");

    expect(staged.furniture_assets.length).toBeGreaterThanOrEqual(2);
    // Should place linen bed
    const bed = staged.furniture_assets.find((f) => f.asset_model_id === "archviz_bed_double_linen");
    expect(bed).toBeDefined();
    expect(bed?.position[1]).toBe(0); // On floor

    // Should place open wardrobe
    const wardrobe = staged.furniture_assets.find((f) => f.asset_model_id === "archviz_wardrobe_open_walkin");
    expect(wardrobe).toBeDefined();

    // In wide bedroom (>3.6m), should place desk and chair
    const desk = staged.furniture_assets.find((f) => f.asset_model_id === "archviz_desk_office_chair");
    expect(desk).toBeDefined();
  });

  it("stages Living Room with rug, coffee table, L-sofa, and wood slats divider", () => {
    const livingRoom: RoomPolygon = {
      id: "room-living-1",
      name: "Grand Living",
      category: "living",
      polygon: [
        [0, 0],
        [6, 0],
        [6, 5],
        [0, 5]
      ],
      materials: { floor: "oak" }
    };

    const layout: LayoutData = {
      metadata: {
        project_id: "p2",
        project_name: "Living Test",
        units: "meters",
        coordinate_system: "right_handed_y_up",
        dimensions: {
          width: 6,
          length: 5,
          default_ceiling_height: 3.3,
          exterior_wall_thickness: 0.22,
          interior_wall_thickness: 0.11
        }
      },
      rooms: [livingRoom],
      walls: [],
      openings: [],
      furniture_assets: []
    };

    const staged = autoStageLayoutData(layout, "luxury_marble");

    // Room floor material should be updated to luxury_marble's living floor ("marble")
    expect(staged.rooms[0]?.materials?.floor).toBe("marble");

    // Check furniture items
    const modelIds = staged.furniture_assets.map((f) => f.asset_model_id);
    expect(modelIds).toContain("archviz_carpet_round_woven");
    expect(modelIds).toContain("archviz_coffee_table_round_marble");
    expect(modelIds).toContain("archviz_sofa_l_shape");
    // Since width >= 4.5m, wood slats divider should be placed
    expect(modelIds).toContain("archviz_wood_slats_divider");
  });

  it("stages Bathroom with glass shower cabin, wall-hung toilet, and vanity mirror", () => {
    const bathRoom: RoomPolygon = {
      id: "room-bath-1",
      name: "En-suite Bathroom",
      category: "bath",
      polygon: [
        [0, 0],
        [2.5, 0],
        [2.5, 2.5],
        [0, 2.5]
      ],
      materials: { floor: "concrete" }
    };

    const layout: LayoutData = {
      metadata: {
        project_id: "p3",
        project_name: "Bath Test",
        units: "meters",
        coordinate_system: "right_handed_y_up",
        dimensions: {
          width: 2.5,
          length: 2.5,
          default_ceiling_height: 3.3,
          exterior_wall_thickness: 0.22,
          interior_wall_thickness: 0.11
        }
      },
      rooms: [bathRoom],
      walls: [],
      openings: [],
      furniture_assets: []
    };

    const staged = autoStageLayoutData(layout, "modern_minimal");

    // Bath floor material should be "tile"
    expect(staged.rooms[0]?.materials?.floor).toBe("tile");

    const modelIds = staged.furniture_assets.map((f) => f.asset_model_id);
    expect(modelIds).toContain("archviz_shower_cabin_glass");
    expect(modelIds).toContain("archviz_toilet_wall_hung");
    expect(modelIds).toContain("archviz_vanity_double_mirror");
  });

  it("stages Kitchen and Balcony/Outdoor rooms correctly", () => {
    const kitchen: RoomPolygon = {
      id: "room-kitchen",
      name: "Chef Kitchen",
      category: "kitchen",
      polygon: [[0, 0], [4, 0], [4, 3], [0, 3]],
      materials: { floor: "concrete" }
    };
    const balcony: RoomPolygon = {
      id: "room-balcony",
      name: "Sky Balcony",
      category: "outdoor",
      polygon: [[0, 3], [4, 3], [4, 4.5], [0, 4.5]],
      materials: { floor: "concrete" }
    };

    const layout: LayoutData = {
      metadata: {
        project_id: "p4",
        project_name: "Kitchen Balcony",
        units: "meters",
        coordinate_system: "right_handed_y_up",
        dimensions: {
          width: 4,
          length: 4.5,
          default_ceiling_height: 3.3,
          exterior_wall_thickness: 0.22,
          interior_wall_thickness: 0.11
        }
      },
      rooms: [kitchen, balcony],
      walls: [],
      openings: [],
      furniture_assets: []
    };

    const staged = autoStageLayoutData(layout, "tropical");
    const modelIds = staged.furniture_assets.map((f) => f.asset_model_id);

    expect(modelIds).toContain("archviz_kitchen_module_combo");
    expect(modelIds).toContain("archviz_balcony_planter_box");
  });

  it("applies style preset to BlueprintProject correctly", () => {
    const updated = applyStyleToBlueprintProject(CASA_SERRA_PRESET, "luxury_marble");
    expect(updated.specs.style).toBe("luxury_marble");
    
    // Living rooms should have marble floor
    const living = updated.rooms.find((r) => r.category === "living");
    if (living) {
      expect(living.floorMaterial).toBe("marble");
    }
  });
});
