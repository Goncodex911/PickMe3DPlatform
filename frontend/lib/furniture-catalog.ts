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
  },
  // STORY-THUAN-BP14: 12 High-Fidelity ArchViz 3D Assets
  {
    id: "archviz_bed_double_linen",
    name: "ArchViz Double Bed with Wrinkled Linen",
    vietnamese_name: "Giường Đôi Ga Nhăn & Gối Xếp Lớp",
    category: "bedroom",
    dimensions: { width: 1.9, height: 0.85, depth: 2.15 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_bed_double_linen.glb",
    thumbnail_icon: "bed",
    default_room_categories: ["bedroom"]
  },
  {
    id: "archviz_wood_slats_divider",
    name: "Vertical Wood Slats Room Divider",
    vietnamese_name: "Vách Lam Gỗ Nan Dọc Phân Chia Không Gian",
    category: "living",
    dimensions: { width: 2.1, height: 2.4, depth: 0.12 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_wood_slats_divider.glb",
    thumbnail_icon: "splitscreen",
    default_room_categories: ["living", "bedroom", "hallway"]
  },
  {
    id: "archviz_sofa_l_shape",
    name: "L-Shaped Fabric Sectional Sofa",
    vietnamese_name: "Sofa Nỉ Chữ L Bọc Đệm Êm Ái Kèm Gối Tựa",
    category: "living",
    dimensions: { width: 2.6, height: 0.8, depth: 1.8 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_sofa_l_shape.glb",
    thumbnail_icon: "weekend",
    default_room_categories: ["living"]
  },
  {
    id: "archviz_coffee_table_round_marble",
    name: "Round Calacatta Marble Coffee Table",
    vietnamese_name: "Bàn Trà Tròn Mặt Đá Marble Calacatta",
    category: "living",
    dimensions: { width: 0.96, height: 0.38, depth: 0.96 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_coffee_table_round_marble.glb",
    thumbnail_icon: "table_restaurant",
    default_room_categories: ["living"]
  },
  {
    id: "archviz_shower_cabin_glass",
    name: "90° Glass Shower Cabin with Rain Column",
    vietnamese_name: "Vách Tắm Kính Góc 90° Kèm Sen Cây Chrome",
    category: "bath",
    dimensions: { width: 1.1, height: 2.0, depth: 1.1 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_shower_cabin_glass.glb",
    thumbnail_icon: "shower",
    default_room_categories: ["bath"]
  },
  {
    id: "archviz_vanity_double_mirror",
    name: "Double Sink Vanity with Backlit LED Mirror",
    vietnamese_name: "Tủ Lavabo Đôi Mặt Đá Kèm Gương LED",
    category: "bath",
    dimensions: { width: 1.4, height: 1.9, depth: 0.55 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_vanity_double_mirror.glb",
    thumbnail_icon: "wash",
    default_room_categories: ["bath"]
  },
  {
    id: "archviz_toilet_wall_hung",
    name: "Modern Wall-Hung Ceramic Toilet",
    vietnamese_name: "Bồn Cầu Liền Khối Sứ Treo Tường",
    category: "bath",
    dimensions: { width: 0.4, height: 0.85, depth: 0.55 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_toilet_wall_hung.glb",
    thumbnail_icon: "wc",
    default_room_categories: ["bath"]
  },
  {
    id: "archviz_kitchen_module_combo",
    name: "Complete Kitchen Module with Cooktop, Sink & Fridge",
    vietnamese_name: "Cụm Bếp Liền Khối (Bồn Rửa + Bếp Từ + Tủ Lạnh)",
    category: "kitchen",
    dimensions: { width: 2.6, height: 1.9, depth: 0.65 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_kitchen_module_combo.glb",
    thumbnail_icon: "kitchen",
    default_room_categories: ["kitchen"]
  },
  {
    id: "archviz_desk_office_chair",
    name: "Work Desk with Ergonomic Swivel Chair & Laptop",
    vietnamese_name: "Bàn Làm Việc Gỗ Dài Kèm Ghế Xoay & Laptop",
    category: "office",
    dimensions: { width: 1.4, height: 0.85, depth: 0.65 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_desk_office_chair.glb",
    thumbnail_icon: "desk",
    default_room_categories: ["bedroom", "office", "living"]
  },
  {
    id: "archviz_wardrobe_open_walkin",
    name: "Modern Open Walk-in Wardrobe System",
    vietnamese_name: "Hệ Tủ Quần Áo Mở Hiện Đại Kèm Móc Treo",
    category: "bedroom",
    dimensions: { width: 1.6, height: 2.2, depth: 0.55 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_wardrobe_open_walkin.glb",
    thumbnail_icon: "checkroom",
    default_room_categories: ["bedroom"]
  },
  {
    id: "archviz_balcony_planter_box",
    name: "Balcony Flower Planter Box with Lush Botanicals",
    vietnamese_name: "Bồn Cây Hoa Ban Công Sắc Màu Tự Nhiên",
    category: "living",
    dimensions: { width: 1.2, height: 0.65, depth: 0.35 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_balcony_planter_box.glb",
    thumbnail_icon: "yard",
    default_room_categories: ["living", "outdoor"]
  },
  {
    id: "archviz_carpet_round_woven",
    name: "Concentric Round Woven Fiber Rug",
    vietnamese_name: "Thảm Dệt Sợi Tròn Đan Thủ Công",
    category: "living",
    dimensions: { width: 2.3, height: 0.02, depth: 2.3 },
    pivot_point: [0.0, 0.0, 0.0],
    pivot_alignment: "bottom_center",
    glb_url: "/models/archviz/archviz_carpet_round_woven.glb",
    thumbnail_icon: "crop_din",
    default_room_categories: ["living", "bedroom"]
  }
];

export function getFurnitureAssetById(id: string): FurnitureAssetMeta | undefined {
  return FURNITURE_CATALOG.find((asset) => asset.id === id);
}

export function getFurnitureAssetsByCategory(category: string): FurnitureAssetMeta[] {
  return FURNITURE_CATALOG.filter((asset) => asset.category === category);
}

