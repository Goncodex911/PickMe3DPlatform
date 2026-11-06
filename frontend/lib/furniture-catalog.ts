/**
 * 3D Furniture & Openings Asset Catalog
 * Standardized assets for PickMe3D 2D-to-3D Floorplan Reconstructor
 */

export interface AssetDimensions {
  width: number; // m (X)
  height: number; // m (Y)
  depth: number; // m (Z)
}

export interface FurnitureAssetMeta {
  id: string;
  name: string;
  vietnamese_name: string;
  category: "bedroom" | "living" | "kitchen" | "bath" | "opening" | "office";
  dimensions: AssetDimensions;
  pivot_point: [number, number, number];
  pivot_alignment: "bottom_center";
  glb_url: string;
  thumbnail_icon: string;
  default_room_categories: string[];
}

export const FURNITURE_CATALOG: FurnitureAssetMeta[] = [
  {
    id: "bed_queen_modern",
    name: "Modern Queen Bed",
    vietnamese_name: "Giường Đôi Hiện Đại (Queen Size)",
    category: "bedroom",
    dimensions: { width: 1.8, height: 0.9, depth: 2.0 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/furniture/bed_queen_modern.glb",
    thumbnail_icon: "bed",
    default_room_categories: ["bedroom"]
  },
  {
    id: "sofa_modern_3seat",
    name: "Modern 3-Seat Sofa",
    vietnamese_name: "Sofa Văng Hiện Đại 3 Chỗ",
    category: "living",
    dimensions: { width: 2.2, height: 0.8, depth: 0.9 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/furniture/sofa_modern_3seat.glb",
    thumbnail_icon: "weekend",
    default_room_categories: ["living", "office"]
  },
  {
    id: "dining_table_6chairs",
    name: "Dining Table with 6 Chairs",
    vietnamese_name: "Bộ Bàn Ăn Gỗ Sồi 6 Ghế",
    category: "kitchen",
    dimensions: { width: 1.6, height: 0.75, depth: 0.9 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/furniture/dining_table_6chairs.glb",
    thumbnail_icon: "table_restaurant",
    default_room_categories: ["kitchen", "living"]
  },
  {
    id: "toilet_wall_hung",
    name: "Wall-Hung Modern Toilet",
    vietnamese_name: "Bồn Cầu Treo Tường Hiện Đại",
    category: "bath",
    dimensions: { width: 0.45, height: 0.9, depth: 0.6 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/furniture/toilet_wall_hung.glb",
    thumbnail_icon: "wc",
    default_room_categories: ["bath"]
  },
  {
    id: "sink_cabinet_bath",
    name: "Bathroom Vanity Sink & Mirror",
    vietnamese_name: "Tủ Lavabo Kèm Gương Soi",
    category: "bath",
    dimensions: { width: 0.82, height: 1.8, depth: 0.52 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/furniture/sink_cabinet_bath.glb",
    thumbnail_icon: "wash",
    default_room_categories: ["bath"]
  },
  {
    id: "kitchen_counter_island",
    name: "Kitchen Counter Island with Cooktop",
    vietnamese_name: "Đảo Bếp Mặt Đá Kèm Bếp Từ & Chậu Rửa",
    category: "kitchen",
    dimensions: { width: 2.4, height: 0.88, depth: 0.8 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/furniture/kitchen_counter_island.glb",
    thumbnail_icon: "countertops",
    default_room_categories: ["kitchen"]
  },
  {
    id: "door_single_wood",
    name: "Single Interior Wood Door",
    vietnamese_name: "Cửa Gỗ Thông Phòng 1 Cánh",
    category: "opening",
    dimensions: { width: 0.96, height: 2.2, depth: 0.15 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/furniture/door_single_wood.glb",
    thumbnail_icon: "door_front",
    default_room_categories: ["bedroom", "bath", "hallway", "office", "living"]
  },
  {
    id: "window_sliding_2pane",
    name: "Sliding Glass Window (2-Pane)",
    vietnamese_name: "Cửa Sổ Nhôm Kính Lùa 2 Cánh",
    category: "opening",
    dimensions: { width: 1.6, height: 1.5, depth: 0.1 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/furniture/window_sliding_2pane.glb",
    thumbnail_icon: "window",
    default_room_categories: ["living", "bedroom", "kitchen", "bath", "office"]
  }
];

export function getFurnitureAssetById(id: string): FurnitureAssetMeta | undefined {
  return FURNITURE_CATALOG.find((asset) => asset.id === id);
}

export function getFurnitureAssetsByCategory(category: string): FurnitureAssetMeta[] {
  return FURNITURE_CATALOG.filter((asset) => asset.category === category);
}

