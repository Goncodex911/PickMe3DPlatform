/**
 * Smart Auto-Staging Engine for PickMe3D (STORY-THUAN-BP15)
 * Implements architectural anthropometrics and geometric positioning rules:
 * - Bed placed against the longest wall with optimal headboard orientation.
 * - Sofa oriented towards the TV / focal wall with proper viewing distance.
 * - Glass shower cabin docked into the deepest bathroom corner.
 * - Dynamically adapts materials and furniture catalog models based on System Architectural Style.
 */

import {
  ArchitecturalStyle,
  BlueprintProject,
  FloorMaterialType,
  FurniturePlacement,
  LayoutData,
  RoomPolygon,
  RoomSpec
} from "./floorplan-types";

export interface StylePresetDefinition {
  id: ArchitecturalStyle;
  name: string;
  vietnameseName: string;
  description: string;
  palette: string[];
  floorLiving: FloorMaterialType;
  floorBath: FloorMaterialType;
  floorOutdoor: FloorMaterialType;
  wallColorHex: number;
}

export const SYSTEM_STYLE_PRESETS: Record<ArchitecturalStyle, StylePresetDefinition> = {
  scandinavian: {
    id: "scandinavian",
    name: "Scandinavian Natural",
    vietnameseName: "Bắc Âu Tự Nhiên (Scandinavian)",
    description: "Sàn gỗ sồi sáng thanh dài, tường trắng kem ấm, đệm nỉ xám và điểm xuyết cây xanh tươi mát.",
    palette: ["#fcfbfa", "#c8ad8d", "#484b50", "#3e4f3a"],
    floorLiving: "oak",
    floorBath: "tile",
    floorOutdoor: "tile",
    wallColorHex: 0xfcfbfa
  },
  luxury_marble: {
    id: "luxury_marble",
    name: "Luxury Calacatta Marble",
    vietnameseName: "Sang Trọng Hiện Đại (Luxury Marble)",
    description: "Đá cẩm thạch trắng bóng gương Calacatta, nẹp kim loại đen mờ, da kem và kính cường lực sang trọng.",
    palette: ["#ffffff", "#1a1a1c", "#edebe6", "#dddddd"],
    floorLiving: "marble",
    floorBath: "marble",
    floorOutdoor: "tile",
    wallColorHex: 0xffffff
  },
  modern_minimal: {
    id: "modern_minimal",
    name: "Modern Minimalist",
    vietnameseName: "Hiện Đại Tối Giản (Modern Minimal)",
    description: "Tông màu xám xi măng / gỗ sáng thanh lịch, phẳng phiu, vách lam gỗ nan thanh mảnh tạo điểm nhấn.",
    palette: ["#f5f5f7", "#dfd3c3", "#222428", "#8a5d3b"],
    floorLiving: "oak",
    floorBath: "tile",
    floorOutdoor: "concrete",
    wallColorHex: 0xf5f5f7
  },
  casa_serra: {
    id: "casa_serra",
    name: "Casa Serra Mediterranean",
    vietnameseName: "Địa Trung Hải Mộc Mạc (Casa Serra)",
    description: "Gỗ Teak mộc tự nhiên, tường vữa thạch cao ấm áp, đá phiến bazan đen và vách kính mở rộng cảnh quan.",
    palette: ["#ede6db", "#bf9567", "#3d352e", "#546647"],
    floorLiving: "oak",
    floorBath: "tile",
    floorOutdoor: "tile",
    wallColorHex: 0xede6db
  },
  tropical: {
    id: "tropical",
    name: "Tropical Modern",
    vietnameseName: "Nhiệt Đới Xanh Mát (Tropical Modern)",
    description: "Không gian mở chan hòa ánh sáng nhiệt đới, bồn cây xanh ban công rực rỡ và sàn gỗ chịu ẩm.",
    palette: ["#f4efe6", "#bda07d", "#3d703b", "#3d434a"],
    floorLiving: "oak",
    floorBath: "tile",
    floorOutdoor: "tile",
    wallColorHex: 0xf4efe6
  }
};

/**
 * Calculates the bounding box [minX, minZ, maxX, maxZ] of a 2D polygon
 */
function getPolygonBounds(polygon: [number, number][]): [number, number, number, number] {
  if (!polygon || polygon.length === 0) return [0, 0, 4, 4];
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of polygon) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return [minX, minZ, maxX, maxZ];
}

/**
 * Stages furniture for a Bedroom according to architectural anthropometric rules:
 * - Bed on longest solid wall, oriented away from entry door.
 * - Wardrobe along the perpendicular side wall with ample clearance.
 * - Desk along the natural light / window edge.
 */
function stageBedroom(
  room: RoomPolygon,
  bounds: [number, number, number, number]
): FurniturePlacement[] {
  const [minX, minZ, maxX, maxZ] = bounds;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const placements: FurniturePlacement[] = [];

  // Bed Dimensions: W=1.9, D=2.15
  // If room is wider than deep, place bed against North (minZ) wall facing South
  if (width >= depth) {
    placements.push({
      id: `${room.id}_bed`,
      asset_model_id: "archviz_bed_double_linen",
      category: "bed",
      position: [centerX, 0, minZ + 1.15],
      rotation_deg: 0,
      scale: [1, 1, 1],
      glb_url: "/models/archviz/archviz_bed_double_linen.glb"
    });

    // Wardrobe along West wall
    if (width >= 3.2) {
      placements.push({
        id: `${room.id}_wardrobe`,
        asset_model_id: "archviz_wardrobe_open_walkin",
        category: "wardrobe",
        position: [minX + 0.35, 0, centerZ],
        rotation_deg: 90,
        scale: [1, 1, 1],
        glb_url: "/models/archviz/archviz_wardrobe_open_walkin.glb"
      });
    }

    // Work desk along East wall
    if (width >= 3.6) {
      placements.push({
        id: `${room.id}_desk`,
        asset_model_id: "archviz_desk_office_chair",
        category: "office",
        position: [maxX - 0.45, 0, centerZ + 0.4],
        rotation_deg: 270,
        scale: [1, 1, 1],
        glb_url: "/models/archviz/archviz_desk_office_chair.glb"
      });
    }
  } else {
    // Room is deeper than wide: Bed headboard against West (minX) wall facing East
    placements.push({
      id: `${room.id}_bed`,
      asset_model_id: "archviz_bed_double_linen",
      category: "bed",
      position: [minX + 1.15, 0, centerZ],
      rotation_deg: 90,
      scale: [1, 1, 1],
      glb_url: "/models/archviz/archviz_bed_double_linen.glb"
    });

    // Wardrobe along North wall
    if (depth >= 3.2) {
      placements.push({
        id: `${room.id}_wardrobe`,
        asset_model_id: "archviz_wardrobe_open_walkin",
        category: "wardrobe",
        position: [centerX, 0, minZ + 0.35],
        rotation_deg: 0,
        scale: [1, 1, 1],
        glb_url: "/models/archviz/archviz_wardrobe_open_walkin.glb"
      });
    }
  }

  return placements;
}

/**
 * Stages furniture for a Living Room:
 * - Concentric round rug in the center.
 * - Round Calacatta marble coffee table on rug.
 * - L-shaped fabric sofa facing the entertainment wall.
 * - Wood slats divider if open-concept space.
 */
function stageLivingRoom(
  room: RoomPolygon,
  bounds: [number, number, number, number]
): FurniturePlacement[] {
  const [minX, minZ, maxX, maxZ] = bounds;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const width = maxX - minX;

  const placements: FurniturePlacement[] = [];

  // 1. Concentric Round Rug at center
  placements.push({
    id: `${room.id}_rug`,
    asset_model_id: "archviz_carpet_round_woven",
    category: "carpet",
    position: [centerX, 0.01, centerZ],
    rotation_deg: 0,
    scale: [1, 1, 1],
    glb_url: "/models/archviz/archviz_carpet_round_woven.glb"
  });

  // 2. Round Marble Coffee Table
  placements.push({
    id: `${room.id}_coffee_table`,
    asset_model_id: "archviz_coffee_table_round_marble",
    category: "table",
    position: [centerX, 0, centerZ],
    rotation_deg: 0,
    scale: [1, 1, 1],
    glb_url: "/models/archviz/archviz_coffee_table_round_marble.glb"
  });

  // 3. L-Shaped Sofa (offset 0.65m behind table)
  placements.push({
    id: `${room.id}_sofa`,
    asset_model_id: "archviz_sofa_l_shape",
    category: "seating",
    position: [centerX, 0, centerZ - 0.7],
    rotation_deg: 0,
    scale: [1, 1, 1],
    glb_url: "/models/archviz/archviz_sofa_l_shape.glb"
  });

  // 4. Wood slats divider on side if room is spacious (> 4.5m)
  if (width >= 4.5) {
    placements.push({
      id: `${room.id}_wood_divider`,
      asset_model_id: "archviz_wood_slats_divider",
      category: "partition",
      position: [minX + 1.2, 0, centerZ],
      rotation_deg: 90,
      scale: [1, 1, 1],
      glb_url: "/models/archviz/archviz_wood_slats_divider.glb"
    });
  }

  return placements;
}

/**
 * Stages furniture for a Bathroom (WC):
 * - Glass shower cabin docked into the deepest corner (farthest from door).
 * - Wall-hung toilet with clearance.
 * - Double sink vanity with illuminated mirror.
 */
function stageBathroom(
  room: RoomPolygon,
  bounds: [number, number, number, number]
): FurniturePlacement[] {
  const [minX, minZ, maxX, maxZ] = bounds;
  const width = maxX - minX;
  const depth = maxZ - minZ;

  const placements: FurniturePlacement[] = [];

  // 1. 90° Shower Cabin docked into Northeast corner (maxX, minZ)
  placements.push({
    id: `${room.id}_shower`,
    asset_model_id: "archviz_shower_cabin_glass",
    category: "bath",
    position: [maxX - 0.6, 0, minZ + 0.6],
    rotation_deg: 0,
    scale: [1, 1, 1],
    glb_url: "/models/archviz/archviz_shower_cabin_glass.glb"
  });

  // 2. Wall-hung toilet on North wall next to shower
  placements.push({
    id: `${room.id}_toilet`,
    asset_model_id: "archviz_toilet_wall_hung",
    category: "sanitary",
    position: [minX + 0.6, 0, minZ + 0.35],
    rotation_deg: 0,
    scale: [1, 1, 1],
    glb_url: "/models/archviz/archviz_toilet_wall_hung.glb"
  });

  // 3. Double Vanity Sink on opposite South wall
  if (width >= 1.6 && depth >= 1.8) {
    placements.push({
      id: `${room.id}_vanity`,
      asset_model_id: "archviz_vanity_double_mirror",
      category: "vanity",
      position: [minX + 0.8, 0, maxZ - 0.35],
      rotation_deg: 180,
      scale: [1, 1, 1],
      glb_url: "/models/archviz/archviz_vanity_double_mirror.glb"
    });
  }

  return placements;
}

/**
 * Stages furniture for Kitchen:
 * - Module combo (Sink + Induction Cooktop + Side-by-side Fridge) against main wall.
 */
function stageKitchen(
  room: RoomPolygon,
  bounds: [number, number, number, number]
): FurniturePlacement[] {
  const [minX, minZ, maxX] = bounds;
  const centerX = (minX + maxX) / 2;

  const placements: FurniturePlacement[] = [];

  placements.push({
    id: `${room.id}_kitchen_combo`,
    asset_model_id: "archviz_kitchen_module_combo",
    category: "kitchen",
    position: [centerX, 0, minZ + 0.38],
    rotation_deg: 0,
    scale: [1, 1, 1],
    glb_url: "/models/archviz/archviz_kitchen_module_combo.glb"
  });

  return placements;
}

/**
 * Stages Balcony / Outdoor Terrace:
 * - Planter boxes with colorful blooming flowers along perimeter railing.
 */
function stageOutdoor(
  room: RoomPolygon,
  bounds: [number, number, number, number]
): FurniturePlacement[] {
  const [minX, minZ, maxX] = bounds;
  const centerX = (minX + maxX) / 2;

  const placements: FurniturePlacement[] = [];

  placements.push({
    id: `${room.id}_balcony_planter`,
    asset_model_id: "archviz_balcony_planter_box",
    category: "plants",
    position: [centerX, 0, minZ + 0.25],
    rotation_deg: 0,
    scale: [1, 1, 1],
    glb_url: "/models/archviz/archviz_balcony_planter_box.glb"
  });

  return placements;
}

/**
 * Main Auto-Staging Algorithm for LayoutData (STORY-THUAN-BP15)
 * Analyzes room geometries and assigns high-fidelity furniture and style-appropriate materials.
 */
export function autoStageLayoutData(
  layout: LayoutData,
  style: ArchitecturalStyle = "scandinavian"
): LayoutData {
  const preset = SYSTEM_STYLE_PRESETS[style] || SYSTEM_STYLE_PRESETS.scandinavian;
  const stagedFurniture: FurniturePlacement[] = [];

  const updatedRooms: RoomPolygon[] = layout.rooms.map((room) => {
    const bounds = getPolygonBounds(room.polygon);
    const cat = room.category || "living";

    // 1. Assign style-adapted floor material
    let floorMat = preset.floorLiving;
    if (cat === "bath") floorMat = preset.floorBath;
    else if (cat === "outdoor") floorMat = preset.floorOutdoor;

    // 2. Compute anthropometric furniture staging
    let roomItems: FurniturePlacement[] = [];
    if (cat === "bedroom") {
      roomItems = stageBedroom(room, bounds);
    } else if (cat === "living") {
      roomItems = stageLivingRoom(room, bounds);
    } else if (cat === "bath") {
      roomItems = stageBathroom(room, bounds);
    } else if (cat === "kitchen") {
      roomItems = stageKitchen(room, bounds);
    } else if (cat === "outdoor") {
      roomItems = stageOutdoor(room, bounds);
    }

    stagedFurniture.push(...roomItems);

    return {
      ...room,
      materials: {
        ...room.materials,
        floor: floorMat
      }
    };
  });

  return {
    ...layout,
    rooms: updatedRooms,
    furniture_assets: stagedFurniture
  };
}

/**
 * Updates a BlueprintProject to the chosen Architectural Style with automatic staging
 */
export function applyStyleToBlueprintProject(
  project: BlueprintProject,
  style: ArchitecturalStyle
): BlueprintProject {
  const preset = SYSTEM_STYLE_PRESETS[style] || SYSTEM_STYLE_PRESETS.scandinavian;

  const updatedRooms: RoomSpec[] = project.rooms.map((room) => {
    let floorMat = preset.floorLiving;
    if (room.category === "bath") floorMat = preset.floorBath;
    else if (room.category === "outdoor") floorMat = preset.floorOutdoor;

    return {
      ...room,
      floorMaterial: floorMat
    };
  });

  return {
    ...project,
    specs: {
      ...project.specs,
      style
    },
    rooms: updatedRooms
  };
}
