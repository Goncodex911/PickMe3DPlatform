/**
 * Types & Schema for Architectural 2D to 3D Floor Plan Reconstructor
 * Inspired by Casa Serra (https://sam1983aing.github.io/casa-serra/)
 */

export type ArchitecturalStyle = 
  | "casa_serra" 
  | "scandinavian" 
  | "luxury_marble" 
  | "modern_minimal" 
  | "tropical";

export type FloorMaterialType = 
  | "concrete" 
  | "oak" 
  | "dark_wood" 
  | "marble" 
  | "tile" 
  | "grass" 
  | "gravel";

export type TimeOfDay = "morning" | "noon" | "golden_hour" | "night";

export type Orientation = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface RoomSpec {
  id: string;
  name: string;
  vietnameseName?: string;
  category: "living" | "bedroom" | "kitchen" | "bath" | "outdoor" | "hallway" | "utility" | "office";
  /** [x0, z0, x1, z1] in meters relative to building origin */
  bounds: [number, number, number, number];
  area: number; // m²
  ceilingHeight?: number; // meters (defaults to building ceilingHeight)
  floorMaterial?: FloorMaterialType;
  description: string;
  specs: {
    orientation?: string;
    ventilation?: string;
    lightSource?: string;
    finishNote?: string;
  };
  features?: string[];
}

export interface BuildingSpecs {
  width: number; // meters (e.g. 16m)
  length: number; // meters (e.g. 24m)
  totalArea: number; // m²
  scale: string; // e.g. "1:100", "1:200"
  ceilingHeight: number; // meters (e.g. 3.2m)
  exteriorWallThickness: number; // meters (e.g. 0.20m = 200mm)
  interiorWallThickness: number; // meters (e.g. 0.10m = 100mm)
  orientation: Orientation;
  timeOfDay: TimeOfDay;
  style: ArchitecturalStyle;
  baseFloorMaterial: FloorMaterialType;
}

export interface BlueprintProject {
  id: string;
  name: string;
  code: string; // e.g. "A-101 rev D"
  subtitle: string; // e.g. "Ground floor plan"
  location: string;
  specs: BuildingSpecs;
  rooms: RoomSpec[];
  originalBlueprintUrl?: string;
}

/**
 * PRESET 1: CASA SERRA MASTERPIECE (Accurate 1:1 match with https://sam1983aing.github.io/casa-serra/)
 */
export const CASA_SERRA_PRESET: BlueprintProject = {
  id: "casa-serra-original",
  name: "Casa Serra",
  code: "A-101 rev D",
  subtitle: "Ground floor plan",
  location: "Serra de Tramuntana, Mallorca",
  specs: {
    width: 22,
    length: 28,
    totalArea: 340,
    scale: "1:200",
    ceilingHeight: 3.2,
    exteriorWallThickness: 0.25,
    interiorWallThickness: 0.12,
    orientation: "S",
    timeOfDay: "golden_hour",
    style: "casa_serra",
    baseFloorMaterial: "concrete"
  },
  rooms: [
    {
      id: "entrance",
      name: "Entrance",
      vietnameseName: "Sảnh Đón",
      category: "hallway",
      bounds: [-14, -6, -8, 2],
      area: 28,
      ceilingHeight: 3.4,
      floorMaterial: "concrete",
      description: "Sảnh đón tối giản với tường bê tông mộc, cửa kính cao kịch trần đón ánh sáng tự nhiên.",
      specs: {
        orientation: "Hướng Nam",
        ventilation: "Thông gió chéo tự nhiên",
        lightSource: "Giếng trời kính & vách thông tầng",
        finishNote: "Bê tông mài mịn cao cấp, bậu cửa đá tự nhiên"
      },
      features: ["Tủ giày âm tường", "Đôn ngồi chờ", "Đèn rọi điểm nghệ thuật"]
    },
    {
      id: "living",
      name: "Living Room",
      vietnameseName: "Phòng Khách",
      category: "living",
      bounds: [-8, -6, 2, 2],
      area: 64,
      ceilingHeight: 3.6,
      floorMaterial: "concrete",
      description: "Không gian sinh hoạt chính ngập tràn ánh nắng với lò sưởi trung tâm và vách kính mở ra sân trong.",
      specs: {
        orientation: "Hướng Nam - Đông Nam",
        ventilation: "Cửa kính trượt 4 cánh lớn",
        lightSource: "Vách kính hướng nắng 180°",
        finishNote: "Sàn bê tông mài, lò sưởi âm đá thô nguyên khối"
      },
      features: ["Lò sưởi trung tâm", "Sofa dài chữ L", "Bàn trà đá cẩm thạch", "Thảm len dệt thủ công"]
    },
    {
      id: "kitchen",
      name: "Kitchen & Dining",
      vietnameseName: "Bếp & Bàn Ăn",
      category: "kitchen",
      bounds: [2, -6, 12, 2],
      area: 58,
      ceilingHeight: 3.2,
      floorMaterial: "oak",
      description: "Đảo bếp đá tự nhiên kết hợp bàn ăn 8 chỗ phong cách tối giản, liên thông trực tiếp với sân hiên ẩm thực.",
      specs: {
        orientation: "Hướng Đông đón nắng sáng",
        ventilation: "Hút mùi âm trần & cửa sổ thông gió",
        lightSource: "Dải đèn thả tuyến tính & ánh sáng sân vườn",
        finishNote: "Mặt đá hoa cương nguyên tấm, gỗ sồi tự nhiên"
      },
      features: ["Đảo bếp 3.6m", "Bàn ăn gỗ sồi 8 ghế", "Hệ tủ bếp kịch trần"]
    },
    {
      id: "patio",
      name: "Inner Patio",
      vietnameseName: "Sân Trong Thư Giãn",
      category: "outdoor",
      bounds: [-8, -14, 2, -6],
      area: 45,
      ceilingHeight: 4.5,
      floorMaterial: "gravel",
      description: "Sân trong mở với tiểu cảnh cây xanh bản địa và sàn rải sỏi trắng, mang lại vi khí hậu mát lành.",
      specs: {
        orientation: "Trung tâm mở",
        ventilation: "Khoảng mở hút gió trục đứng",
        lightSource: "Ánh sáng trực diện bầu trời",
        finishNote: "Sỏi thạch anh trắng, bồn hoa bê tông đúc"
      },
      features: ["Cây ô liu cổ thụ", "Băng ghế đá nguyên khối", "Đèn hắt tiểu cảnh"]
    },
    {
      id: "gallery",
      name: "Gallery Hall",
      vietnameseName: "Hành Lang Trưng Bày",
      category: "hallway",
      bounds: [2, -14, 6, -6],
      area: 24,
      ceilingHeight: 3.2,
      floorMaterial: "concrete",
      description: "Hành lang kết nối khu sinh hoạt và khu nghỉ tĩnh, bài trí các tác phẩm nghệ thuật điêu khắc.",
      specs: {
        orientation: "Trục Bắc - Nam",
        ventilation: "Cửa chớp đón gió",
        lightSource: "Dải đèn rọi spotlight 3000K",
        finishNote: "Tường sơn hiệu ứng xi măng ấm"
      },
      features: ["Kệ trưng bày tác phẩm", "Tranh treo khổ lớn"]
    },
    {
      id: "bedroom",
      name: "Master Suite",
      vietnameseName: "Phòng Ngủ Master",
      category: "bedroom",
      bounds: [6, -14, 14, -6],
      area: 48,
      ceilingHeight: 3.0,
      floorMaterial: "oak",
      description: "Phòng ngủ lớn biệt lập nhìn ra vườn riêng, sàn gỗ sồi ấm áp và rèm linen thô mộc.",
      specs: {
        orientation: "Hướng Đông - đón bình minh dịu nhẹ",
        ventilation: "Cửa mở trượt ra hiên riêng",
        lightSource: "Cửa sổ góc 2 mặt thoáng",
        finishNote: "Sàn gỗ sồi bản rộng, đầu giường bọc nệm nỉ"
      },
      features: ["Giường King size 2m x 2.2m", "Tab đầu giường đá", "Khu làm việc thư thái"]
    },
    {
      id: "dressing",
      name: "Walk-in Dressing",
      vietnameseName: "Phòng Thay Đồ",
      category: "utility",
      bounds: [6, -20, 10, -14],
      area: 20,
      ceilingHeight: 3.0,
      floorMaterial: "oak",
      description: "Không gian lưu trữ quần áo và phụ kiện thiết kế âm tường tinh tế với hệ đèn led cảm ứng.",
      specs: {
        orientation: "Hướng Bắc",
        ventilation: "Thông gió cơ học âm trần",
        lightSource: "Led ray định hướng 4000K",
        finishNote: "Gỗ ép vân tự nhiên chống ẩm, kính khói mờ"
      },
      features: ["Hệ tủ áo kính mở", "Bàn trang điểm đèn viền", "Gương soi toàn thân"]
    },
    {
      id: "bath",
      name: "Master Bath",
      vietnameseName: "Phòng Tắm Master",
      category: "bath",
      bounds: [10, -20, 14, -14],
      area: 22,
      ceilingHeight: 3.0,
      floorMaterial: "tile",
      description: "Phòng tắm tựa resort cao cấp với bồn tắm oval đặt sàn nhìn ra khoảng xanh riêng tư.",
      specs: {
        orientation: "Hướng Đông",
        ventilation: "Cửa sổ lấy thoáng trên cao",
        lightSource: "Kính giếng trời phía trên bồn tắm",
        finishNote: "Đá cẩm thạch Calacatta chống trơn trượt"
      },
      features: ["Bồn tắm Oval freestanding", "Sen tắm mưa âm trần", "Bàn lavabo đôi"]
    },
    {
      id: "garden",
      name: "Zen Garden",
      vietnameseName: "Khu Vườn Cảnh Quan",
      category: "outdoor",
      bounds: [-14, -20, 6, -14],
      area: 65,
      ceilingHeight: 5.0,
      floorMaterial: "grass",
      description: "Khu vườn cảnh quan phía sau bao bọc ngôi nhà bằng thảm cỏ xanh mướt và hàng rào cây xanh tự nhiên.",
      specs: {
        orientation: "Bao quanh hướng Tây - Bắc",
        ventilation: "Không gian gió mở tự nhiên",
        lightSource: "Nắng tự nhiên ngoài trời",
        finishNote: "Cỏ nhung nhật, phiến đá bước dạo tự nhiên"
      },
      features: ["Thảm cỏ xanh", "Lối đi lát đá phiến", "Ghế thư giãn ngoài trời"]
    }
  ]
};

/**
 * PRESET 2: NHÀ PHỐ VIỆT NAM HIỆN ĐẠI (5m x 20m - 100 m² sàn trệt)
 */
export const TOWNHOUSE_PRESET: BlueprintProject = {
  id: "modern-townhouse-5x20",
  name: "Modern Townhouse 5x20",
  code: "VN-520 rev A",
  subtitle: "Mặt bằng trệt nhà phố hiện đại",
  location: "Khu đô thị mới, TP. Hồ Chí Minh",
  specs: {
    width: 5,
    length: 20,
    totalArea: 100,
    scale: "1:100",
    ceilingHeight: 3.6,
    exteriorWallThickness: 0.20,
    interiorWallThickness: 0.10,
    orientation: "SE",
    timeOfDay: "noon",
    style: "modern_minimal",
    baseFloorMaterial: "marble"
  },
  rooms: [
    {
      id: "front-porch",
      name: "Front Yard & Parking",
      vietnameseName: "Sân Trước & Để Xe",
      category: "outdoor",
      bounds: [-2.5, 7, 2.5, 10],
      area: 15,
      ceilingHeight: 3.6,
      floorMaterial: "concrete",
      description: "Khoảng lùi sân trước trồng cây xanh, để xe máy và ô tô thuận tiện.",
      specs: { orientation: "Đông Nam", ventilation: "Ngoài trời", lightSource: "Tự nhiên" }
    },
    {
      id: "living-room",
      name: "Living Area",
      vietnameseName: "Phòng Khách Liên Thông",
      category: "living",
      bounds: [-2.5, 2, 2.5, 7],
      area: 25,
      ceilingHeight: 3.8,
      floorMaterial: "marble",
      description: "Phòng khách sang trọng với trần cao 3.8m, sofa hiện đại và kệ tivi ốp đá đối vân.",
      specs: { orientation: "Đông Nam", ventilation: "Cửa chính 4 cánh nhôm kính", lightSource: "Ánh sáng mặt tiền" }
    },
    {
      id: "atrium",
      name: "Lightwell & Stair",
      vietnameseName: "Giếng Trời & Cầu Thang",
      category: "hallway",
      bounds: [-2.5, -1, 2.5, 2],
      area: 15,
      ceilingHeight: 6.0,
      floorMaterial: "gravel",
      description: "Trái tim của ngôi nhà với giếng trời thông tầng đón gió và ánh sáng tự nhiên thẳng từ mái.",
      specs: { orientation: "Trung tâm", ventilation: "Trục thông gió đứng", lightSource: "Mái kính lấy sáng" }
    },
    {
      id: "dining-kitchen",
      name: "Kitchen & Dining",
      vietnameseName: "Bếp & Bàn Ăn Gia Đình",
      category: "kitchen",
      bounds: [-2.5, -7, 2.5, -1],
      area: 30,
      ceilingHeight: 3.4,
      floorMaterial: "tile",
      description: "Bếp chữ L hiện đại kèm bàn ăn 6 người, liên thông với khoảng sân sau thoáng đãng.",
      specs: { orientation: "Tây Bắc", ventilation: "Hút mùi & cửa sổ sân sau", lightSource: "Giếng trời + đèn thả" }
    },
    {
      id: "backyard-wc",
      name: "Backyard & Powder Room",
      vietnameseName: "Sân Sau & WC Tầng Trệt",
      category: "bath",
      bounds: [-2.5, -10, 2.5, -7],
      area: 15,
      ceilingHeight: 3.0,
      floorMaterial: "tile",
      description: "Sân sau đón gió đối lưu và khu vệ sinh tiện ích cho khách.",
      specs: { orientation: "Tây Bắc", ventilation: "Thông gió tự nhiên", lightSource: "Sân sau" }
    }
  ]
};

/**
 * PRESET 3: CĂN HỘ CHUNG CƯ CAO CẤP (2PN 75 m²)
 */
export const APARTMENT_PRESET: BlueprintProject = {
  id: "luxury-apartment-2br",
  name: "Urban Horizon 2BR",
  code: "APT-75 rev B",
  subtitle: "Căn hộ cao cấp 2 Phòng Ngủ",
  location: "Tòa tháp Landmark, Hà Nội",
  specs: {
    width: 8.5,
    length: 9.0,
    totalArea: 75,
    scale: "1:50",
    ceilingHeight: 2.8,
    exteriorWallThickness: 0.20,
    interiorWallThickness: 0.10,
    orientation: "E",
    timeOfDay: "morning",
    style: "scandinavian",
    baseFloorMaterial: "oak"
  },
  rooms: [
    {
      id: "foyer-kitchen",
      name: "Foyer & Open Kitchen",
      vietnameseName: "Sảnh Vào & Bếp Mở",
      category: "kitchen",
      bounds: [-4, 1, 0, 4.5],
      area: 16,
      ceilingHeight: 2.6,
      floorMaterial: "tile",
      description: "Bếp đảo mở liền kề tủ giày âm tường thông minh.",
      specs: { orientation: "Hướng Tây", ventilation: "Hệ thống hút mùi căn hộ", lightSource: "Đèn trần nam châm" }
    },
    {
      id: "living-balcony",
      name: "Living & Panoramic Logia",
      vietnameseName: "Phòng Khách & Ban Công View",
      category: "living",
      bounds: [0, 0, 4.25, 4.5],
      area: 22,
      ceilingHeight: 2.8,
      floorMaterial: "oak",
      description: "Phòng khách nối dài ra ban công kính nhìn ngắm toàn cảnh thành phố.",
      specs: { orientation: "Hướng Đông đón bình minh", ventilation: "Cửa lùa ban công", lightSource: "Ánh sáng tự nhiên 100%" }
    },
    {
      id: "master-bedroom",
      name: "Master Bedroom & En-suite",
      vietnameseName: "Phòng Ngủ Master & WC Khép Kín",
      category: "bedroom",
      bounds: [0, -4.5, 4.25, 0],
      area: 20,
      ceilingHeight: 2.8,
      floorMaterial: "oak",
      description: "Phòng ngủ lớn có cửa sổ kính rộng, giường King và phòng tắm khép kín.",
      specs: { orientation: "Hướng Đông", ventilation: "Cửa sổ kính lật", lightSource: "View thành phố" }
    },
    {
      id: "secondary-bedroom",
      name: "Secondary Bedroom",
      vietnameseName: "Phòng Ngủ Phụ / Phòng Làm Việc",
      category: "bedroom",
      bounds: [-4, -4.5, 0, -1],
      area: 13,
      ceilingHeight: 2.8,
      floorMaterial: "oak",
      description: "Phòng ngủ đa năng cho con hoặc làm việc tập trung.",
      specs: { orientation: "Hướng Bắc", ventilation: "Khe thoáng giếng trời", lightSource: "Cửa sổ kính" }
    },
    {
      id: "guest-bath",
      name: "Guest Bathroom",
      vietnameseName: "Phòng Vệ Sinh Chung",
      category: "bath",
      bounds: [-4, -1, 0, 1],
      area: 4,
      ceilingHeight: 2.5,
      floorMaterial: "tile",
      description: "Vệ sinh chung với vách tắm kính đứng.",
      specs: { orientation: "Trung tâm", ventilation: "Hút mùi tự động", lightSource: "Đèn âm trần" }
    }
  ]
};

export const ALL_PRESETS: BlueprintProject[] = [
  CASA_SERRA_PRESET,
  TOWNHOUSE_PRESET,
  APARTMENT_PRESET
];
