// Script to generate 10 comprehensive architectural benchmark JSON files
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../public/data/benchmarks');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const benchmarks = [
  // 1. Villa Modern Oasis
  {
    id: "01_villa_modern_oasis",
    name: "Modern Villa Oasis with Pool",
    desc: "Luxury 14x12m villa with sunken living lounge, open kitchen, master bedroom and courtyard patio.",
    w: 14.0, l: 12.0, h: 3.4,
    walls: [
      { id: "w_ext_n", type: "exterior", start: [-7, -6], end: [7, -6], thickness: 0.22, height: 3.4 },
      { id: "w_ext_e", type: "exterior", start: [7, -6], end: [7, 6], thickness: 0.22, height: 3.4 },
      { id: "w_ext_s", type: "exterior", start: [7, 6], end: [-7, 6], thickness: 0.22, height: 3.4 },
      { id: "w_ext_w", type: "exterior", start: [-7, 6], end: [-7, -6], thickness: 0.22, height: 3.4 },
      { id: "w_int_div_x", type: "interior", start: [0, -6], end: [0, 6], thickness: 0.11, height: 3.4 },
      { id: "w_int_div_z1", type: "interior", start: [-7, 0], end: [0, 0], thickness: 0.11, height: 3.4 },
      { id: "w_int_div_z2", type: "interior", start: [0, 1], end: [7, 1], thickness: 0.11, height: 3.4 }
    ],
    openings: [
      { id: "op_main_door", type: "door", wall_id: "w_ext_s", center: [-3.5, 6], width: 1.8, height: 2.4, sill_height: 0, door_type: "double_glass_swing" },
      { id: "op_living_win", type: "window", wall_id: "w_ext_w", center: [-7, -3], width: 2.4, height: 1.6, sill_height: 0.8, window_type: "fixed_picture" },
      { id: "op_bed_win", type: "window", wall_id: "w_ext_e", center: [7, -2.5], width: 2.0, height: 1.4, sill_height: 0.9, window_type: "sliding_glass" },
      { id: "op_patio_portal", type: "door", wall_id: "w_ext_n", center: [3.5, -6], width: 3.0, height: 2.6, sill_height: 0, door_type: "pocket_sliding" }
    ],
    rooms: [
      { id: "room_living", name: "Living Lounge", vietnamese_name: "Phòng Khách", category: "living", polygon: [[-7, 0], [0, 0], [0, 6], [-7, 6]], area_m2: 42, ceiling_height: 3.4, materials: { floor: "marble", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "room_kitchen", name: "Kitchen & Bar", vietnamese_name: "Bếp & Quầy Bar", category: "kitchen", polygon: [[0, 1], [7, 1], [7, 6], [0, 6]], area_m2: 35, ceiling_height: 3.4, materials: { floor: "concrete", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "room_master_bed", name: "Master Bedroom", vietnamese_name: "Phòng Ngủ Master", category: "bedroom", polygon: [[0, -6], [7, -6], [7, 1], [0, 1]], area_m2: 49, ceiling_height: 3.4, materials: { floor: "oak", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "room_patio", name: "Inner Olive Patio", vietnamese_name: "Sân Trong Ô-liu", category: "outdoor", polygon: [[-7, -6], [0, -6], [0, 0], [-7, 0]], area_m2: 42, ceiling_height: 3.4, materials: { floor: "travertine", ceiling: "open_sky", walls: "warm_white" } }
    ],
    furniture: [
      { id: "f_sofa", asset_model_id: "furn_sofa_l_shape", category: "living", position: [-3.5, 0, 3], rotation_deg: 0 }
    ]
  },

  // 2. Apartment Skyline 2BR
  {
    id: "02_apartment_skyline_2br",
    name: "Skyline 2BR Apartment",
    desc: "Compact 10.5x8.4m high-rise 2-bedroom condominium with balcony.",
    w: 10.5, l: 8.4, h: 2.8,
    walls: [
      { id: "w_ext_n", type: "exterior", start: [-5.25, -4.2], end: [5.25, -4.2], thickness: 0.2, height: 2.8 },
      { id: "w_ext_e", type: "exterior", start: [5.25, -4.2], end: [5.25, 4.2], thickness: 0.2, height: 2.8 },
      { id: "w_ext_s", type: "exterior", start: [5.25, 4.2], end: [-5.25, 4.2], thickness: 0.2, height: 2.8 },
      { id: "w_ext_w", type: "exterior", start: [-5.25, 4.2], end: [-5.25, -4.2], thickness: 0.2, height: 2.8 },
      { id: "w_int_1", type: "interior", start: [-0.5, -4.2], end: [-0.5, 4.2], thickness: 0.1, height: 2.8 },
      { id: "w_int_2", type: "interior", start: [-0.5, 0], end: [5.25, 0], thickness: 0.1, height: 2.8 }
    ],
    openings: [
      { id: "op_apt_door", type: "door", wall_id: "w_ext_w", center: [-5.25, 0], width: 1.0, height: 2.2, sill_height: 0, door_type: "single_wood_swing" },
      { id: "op_balcony_slider", type: "door", wall_id: "w_ext_n", center: [-2.8, -4.2], width: 2.2, height: 2.4, sill_height: 0, door_type: "sliding_glass" },
      { id: "op_bed1_win", type: "window", wall_id: "w_ext_e", center: [5.25, -2.1], width: 1.6, height: 1.4, sill_height: 0.9, window_type: "sliding_glass" },
      { id: "op_bed2_win", type: "window", wall_id: "w_ext_e", center: [5.25, 2.1], width: 1.6, height: 1.4, sill_height: 0.9, window_type: "sliding_glass" }
    ],
    rooms: [
      { id: "room_living_din", name: "Living & Dining", vietnamese_name: "Khách & Bếp Ăn", category: "living", polygon: [[-5.25, -4.2], [-0.5, -4.2], [-0.5, 4.2], [-5.25, 4.2]], area_m2: 39.9, ceiling_height: 2.8, materials: { floor: "concrete", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "room_bed_master", name: "Master Bedroom", vietnamese_name: "Phòng Ngủ Lớn", category: "bedroom", polygon: [[-0.5, -4.2], [5.25, -4.2], [5.25, 0], [-0.5, 0]], area_m2: 24.1, ceiling_height: 2.8, materials: { floor: "oak", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "room_bed_small", name: "Second Bedroom", vietnamese_name: "Phòng Ngủ Nhỏ", category: "bedroom", polygon: [[-0.5, 0], [5.25, 0], [5.25, 4.2], [-0.5, 4.2]], area_m2: 24.1, ceiling_height: 2.8, materials: { floor: "oak", ceiling: "plaster_white", walls: "warm_white" } }
    ],
    furniture: []
  },

  // 3. Townhouse Tube House (Nhà Ống)
  {
    id: "03_townhouse_tube_house",
    name: "Urban Tube Townhouse 4.5x18m",
    desc: "Narrow and deep Vietnamese urban townhouse with lightwell and linear room sequence.",
    w: 4.5, l: 18.0, h: 3.6,
    walls: [
      { id: "w_ext_n", type: "exterior", start: [-2.25, -9], end: [2.25, -9], thickness: 0.22, height: 3.6 },
      { id: "w_ext_e", type: "exterior", start: [2.25, -9], end: [2.25, 9], thickness: 0.22, height: 3.6 },
      { id: "w_ext_s", type: "exterior", start: [2.25, 9], end: [-2.25, 9], thickness: 0.22, height: 3.6 },
      { id: "w_ext_w", type: "exterior", start: [-2.25, 9], end: [-2.25, -9], thickness: 0.22, height: 3.6 },
      { id: "w_int_1", type: "interior", start: [-2.25, -3], end: [2.25, -3], thickness: 0.11, height: 3.6 },
      { id: "w_int_2", type: "interior", start: [-2.25, 2], end: [2.25, 2], thickness: 0.11, height: 3.6 },
      { id: "w_int_3", type: "interior", start: [-2.25, 6], end: [2.25, 6], thickness: 0.11, height: 3.6 }
    ],
    openings: [
      { id: "op_gate", type: "door", wall_id: "w_ext_s", center: [0, 9], width: 2.4, height: 2.8, sill_height: 0, door_type: "double_glass_swing" },
      { id: "op_back_win", type: "window", wall_id: "w_ext_n", center: [0, -9], width: 1.8, height: 1.6, sill_height: 0.9, window_type: "sliding_glass" }
    ],
    rooms: [
      { id: "r_front_living", name: "Front Living Room", vietnamese_name: "Phòng Khách Mặt Tiền", category: "living", polygon: [[-2.25, 6], [2.25, 6], [2.25, 9], [-2.25, 9]], area_m2: 13.5, ceiling_height: 3.6, materials: { floor: "marble", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_stair_kitchen", name: "Dining & Stair Atrium", vietnamese_name: "Bếp Ăn & Cầu Thang Giếng Trời", category: "kitchen", polygon: [[-2.25, 2], [2.25, 2], [2.25, 6], [-2.25, 6]], area_m2: 18.0, ceiling_height: 3.6, materials: { floor: "concrete", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_bed_ground", name: "Ground Bedroom", vietnamese_name: "Phòng Ngủ Tầng Trệt", category: "bedroom", polygon: [[-2.25, -3], [2.25, -3], [2.25, 2], [-2.25, 2]], area_m2: 22.5, ceiling_height: 3.4, materials: { floor: "oak", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_backyard", name: "Rear Lightwell & Laundry", vietnamese_name: "Sân Sau & Giặt Phơi", category: "outdoor", polygon: [[-2.25, -9], [2.25, -9], [2.25, -3], [-2.25, -3]], area_m2: 27.0, ceiling_height: 3.6, materials: { floor: "gravel", ceiling: "open_sky", walls: "warm_white" } }
    ],
    furniture: []
  },

  // 4. Penthouse Duplex
  {
    id: "04_penthouse_duplex",
    name: "Grand Horizon Penthouse Duplex",
    desc: "18x16m double-height luxury penthouse with panoramic glass facade and mezzanine void.",
    w: 18.0, l: 16.0, h: 5.8,
    walls: [
      { id: "w_ext_n", type: "exterior", start: [-9, -8], end: [9, -8], thickness: 0.25, height: 5.8 },
      { id: "w_ext_e", type: "exterior", start: [9, -8], end: [9, 8], thickness: 0.25, height: 5.8 },
      { id: "w_ext_s", type: "exterior", start: [9, 8], end: [-9, 8], thickness: 0.25, height: 5.8 },
      { id: "w_ext_w", type: "exterior", start: [-9, 8], end: [-9, -8], thickness: 0.25, height: 5.8 },
      { id: "w_int_1", type: "interior", start: [-1, -8], end: [-1, 8], thickness: 0.15, height: 3.2 },
      { id: "w_int_2", type: "interior", start: [-9, 0], end: [-1, 0], thickness: 0.12, height: 3.2 }
    ],
    openings: [
      { id: "op_facade_curtain", type: "window", wall_id: "w_ext_s", center: [4, 8], width: 7.0, height: 5.0, sill_height: 0.2, window_type: "fixed_picture" },
      { id: "op_terrace_door", type: "door", wall_id: "w_ext_e", center: [9, 4], width: 3.2, height: 3.0, sill_height: 0, door_type: "pocket_sliding" }
    ],
    rooms: [
      { id: "r_grand_salon", name: "Double-Height Grand Salon", vietnamese_name: "Đại Sảnh Thông Tầng", category: "living", polygon: [[-1, -8], [9, -8], [9, 8], [-1, 8]], area_m2: 160.0, ceiling_height: 5.8, materials: { floor: "marble", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_cigar_lounge", name: "Private Library & Cigar Lounge", vietnamese_name: "Phòng Đọc Sách & Cigar", category: "living", polygon: [[-9, 0], [-1, 0], [-1, 8], [-9, 8]], area_m2: 64.0, ceiling_height: 3.2, materials: { floor: "oak", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_gourmet_kitchen", name: "Chef Kitchen & Wine Cellar", vietnamese_name: "Bếp Bếp Trưởng & Hầm Rượu", category: "kitchen", polygon: [[-9, -8], [-1, -8], [-1, 0], [-9, 0]], area_m2: 64.0, ceiling_height: 3.2, materials: { floor: "concrete", ceiling: "plaster_white", walls: "warm_white" } }
    ],
    furniture: []
  },

  // 5. Studio Minimalist (42m2)
  {
    id: "05_studio_minimalist",
    name: "Minimalist Open-Concept Studio",
    desc: "Compact 6.0x7.0m loft apartment with seamless flowing spaces and enclosed bath.",
    w: 6.0, l: 7.0, h: 3.0,
    walls: [
      { id: "w_ext_n", type: "exterior", start: [-3, -3.5], end: [3, -3.5], thickness: 0.2, height: 3.0 },
      { id: "w_ext_e", type: "exterior", start: [3, -3.5], end: [3, 3.5], thickness: 0.2, height: 3.0 },
      { id: "w_ext_s", type: "exterior", start: [3, 3.5], end: [-3, 3.5], thickness: 0.2, height: 3.0 },
      { id: "w_ext_w", type: "exterior", start: [-3, 3.5], end: [-3, -3.5], thickness: 0.2, height: 3.0 },
      { id: "w_bath_1", type: "interior", start: [1, 1.5], end: [3, 1.5], thickness: 0.1, height: 3.0 },
      { id: "w_bath_2", type: "interior", start: [1, 1.5], end: [1, 3.5], thickness: 0.1, height: 3.0 }
    ],
    openings: [
      { id: "op_entry", type: "door", wall_id: "w_ext_s", center: [-1.5, 3.5], width: 1.0, height: 2.2, sill_height: 0, door_type: "single_wood_swing" },
      { id: "op_studio_win", type: "window", wall_id: "w_ext_n", center: [0, -3.5], width: 3.2, height: 1.8, sill_height: 0.7, window_type: "sliding_glass" },
      { id: "op_bath_door", type: "door", wall_id: "w_bath_2", center: [1, 2.5], width: 0.85, height: 2.1, sill_height: 0, door_type: "single_wood_swing" }
    ],
    rooms: [
      { id: "r_studio_main", name: "Open Studio Living & Sleeping", vietnamese_name: "Không Gian Mở Khách - Ngủ", category: "living", polygon: [[-3, -3.5], [3, -3.5], [3, 1.5], [1, 1.5], [1, 3.5], [-3, 3.5]], area_m2: 38.0, ceiling_height: 3.0, materials: { floor: "concrete", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_studio_bath", name: "Ensuite Bathroom", vietnamese_name: "Phòng Tắm Khép Kín", category: "bath", polygon: [[1, 1.5], [3, 1.5], [3, 3.5], [1, 3.5]], area_m2: 4.0, ceiling_height: 2.8, materials: { floor: "tile", ceiling: "plaster_white", walls: "warm_white" } }
    ],
    furniture: []
  },

  // 6. L-Shaped Countryside Villa
  {
    id: "06_l_shaped_countryside",
    name: "L-Shaped Countryside Retreat",
    desc: "15x12m L-shaped footprint enclosing a sun-drenched wooden deck.",
    w: 15.0, l: 12.0, h: 3.2,
    walls: [
      { id: "w_ext_n", type: "exterior", start: [-7.5, -6], end: [7.5, -6], thickness: 0.22, height: 3.2 },
      { id: "w_ext_e1", type: "exterior", start: [7.5, -6], end: [7.5, 0], thickness: 0.22, height: 3.2 },
      { id: "w_ext_inner_s", type: "exterior", start: [7.5, 0], end: [0, 0], thickness: 0.22, height: 3.2 },
      { id: "w_ext_inner_e", type: "exterior", start: [0, 0], end: [0, 6], thickness: 0.22, height: 3.2 },
      { id: "w_ext_s", type: "exterior", start: [0, 6], end: [-7.5, 6], thickness: 0.22, height: 3.2 },
      { id: "w_ext_w", type: "exterior", start: [-7.5, 6], end: [-7.5, -6], thickness: 0.22, height: 3.2 },
      { id: "w_int_wing", type: "interior", start: [-2, -6], end: [-2, 0], thickness: 0.11, height: 3.2 }
    ],
    openings: [
      { id: "op_terrace_slider", type: "door", wall_id: "w_ext_inner_s", center: [3.5, 0], width: 2.6, height: 2.4, sill_height: 0, door_type: "pocket_sliding" },
      { id: "op_west_bed_win", type: "window", wall_id: "w_ext_w", center: [-7.5, 0], width: 2.0, height: 1.4, sill_height: 0.9, window_type: "sliding_glass" }
    ],
    rooms: [
      { id: "r_l_living", name: "Veranda Living Lounge", vietnamese_name: "Phòng Khách Hướng Hiên", category: "living", polygon: [[-2, -6], [7.5, -6], [7.5, 0], [-2, 0]], area_m2: 57.0, ceiling_height: 3.2, materials: { floor: "oak", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_l_bed_wing", name: "Guest Bedroom Wing", vietnamese_name: "Gian Ngủ Khách", category: "bedroom", polygon: [[-7.5, -6], [-2, -6], [-2, 0], [-7.5, 0]], area_m2: 33.0, ceiling_height: 3.2, materials: { floor: "oak", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_l_master_wing", name: "South Wing Master Suite", vietnamese_name: "Gian Ngủ Phía Nam", category: "bedroom", polygon: [[-7.5, 0], [0, 0], [0, 6], [-7.5, 6]], area_m2: 45.0, ceiling_height: 3.2, materials: { floor: "oak", ceiling: "plaster_white", walls: "warm_white" } }
    ],
    furniture: []
  },

  // 7. CAD Thin Lines Complex (Bản vẽ CAD kỹ thuật nét mảnh)
  {
    id: "07_cad_thin_lines_complex",
    name: "Architectural CAD Multi-Bay Blueprint",
    desc: "16x14m structural CAD drawing featuring dense column grids and load-bearing partitions.",
    w: 16.0, l: 14.0, h: 3.3,
    walls: [
      { id: "w_ext_n", type: "exterior", start: [-8, -7], end: [8, -7], thickness: 0.22, height: 3.3 },
      { id: "w_ext_e", type: "exterior", start: [8, -7], end: [8, 7], thickness: 0.22, height: 3.3 },
      { id: "w_ext_s", type: "exterior", start: [8, 7], end: [-8, 7], thickness: 0.22, height: 3.3 },
      { id: "w_ext_w", type: "exterior", start: [-8, 7], end: [-8, -7], thickness: 0.22, height: 3.3 },
      { id: "w_col_grid_1", type: "interior", start: [-3, -7], end: [-3, 7], thickness: 0.15, height: 3.3 },
      { id: "w_col_grid_2", type: "interior", start: [3, -7], end: [3, 7], thickness: 0.15, height: 3.3 },
      { id: "w_col_grid_h", type: "interior", start: [-8, 0], end: [8, 0], thickness: 0.15, height: 3.3 }
    ],
    openings: [
      { id: "op_cad_entry", type: "door", wall_id: "w_ext_s", center: [0, 7], width: 2.0, height: 2.4, sill_height: 0, door_type: "double_glass_swing" },
      { id: "op_cad_w1", type: "window", wall_id: "w_ext_n", center: [-5.5, -7], width: 1.8, height: 1.5, sill_height: 0.9, window_type: "sliding_glass" },
      { id: "op_cad_w2", type: "window", wall_id: "w_ext_n", center: [5.5, -7], width: 1.8, height: 1.5, sill_height: 0.9, window_type: "sliding_glass" }
    ],
    rooms: [
      { id: "r_cad_nw", name: "North-West Office", vietnamese_name: "Văn Phòng Phía Bắc", category: "office", polygon: [[-8, -7], [-3, -7], [-3, 0], [-8, 0]], area_m2: 35.0, ceiling_height: 3.3, materials: { floor: "concrete", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_cad_ne", name: "North-East Suite", vietnamese_name: "Phòng Họp Đông Bắc", category: "office", polygon: [[3, -7], [8, -7], [8, 0], [3, 0]], area_m2: 35.0, ceiling_height: 3.3, materials: { floor: "concrete", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_cad_center", name: "Central Conference Hall", vietnamese_name: "Hội Trường Trung Tâm", category: "living", polygon: [[-3, -7], [3, -7], [3, 7], [-3, 7]], area_m2: 84.0, ceiling_height: 3.3, materials: { floor: "marble", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_cad_sw", name: "South-West Lab", vietnamese_name: "Phòng Lab Tây Nam", category: "office", polygon: [[-8, 0], [-3, 0], [-3, 7], [-8, 7]], area_m2: 35.0, ceiling_height: 3.3, materials: { floor: "tile", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_cad_se", name: "South-East Reception", vietnamese_name: "Lễ Tân Đông Nam", category: "hallway", polygon: [[3, 0], [8, 0], [8, 7], [3, 7]], area_m2: 35.0, ceiling_height: 3.3, materials: { floor: "marble", ceiling: "plaster_white", walls: "warm_white" } }
    ],
    furniture: []
  },

  // 8. Hand Drawn Sketch (Phác thảo vẽ tay có độ xiên nhỏ để test orthogonalization)
  {
    id: "08_hand_drawn_sketch",
    name: "Architect Hand-Drawn Sketch (Near-Ortho)",
    desc: "12x10m hand sketch with natural hand jitter (approx 2-3 deg slant) testing automatic ortho-snap.",
    w: 12.0, l: 10.0, h: 3.3,
    walls: [
      // Northern wall slightly tilted by 0.12m across 12m length (~0.5 deg)
      { id: "w_ext_n", type: "exterior", start: [-6, -5], end: [6, -4.88], thickness: 0.22, height: 3.3 },
      { id: "w_ext_e", type: "exterior", start: [6, -4.88], end: [5.92, 5], thickness: 0.22, height: 3.3 },
      { id: "w_ext_s", type: "exterior", start: [5.92, 5], end: [-6, 5], thickness: 0.22, height: 3.3 },
      { id: "w_ext_w", type: "exterior", start: [-6, 5], end: [-6, -5], thickness: 0.22, height: 3.3 },
      { id: "w_int_div", type: "interior", start: [0, -4.94], end: [0, 5], thickness: 0.11, height: 3.3 }
    ],
    openings: [
      { id: "op_sketch_door", type: "door", wall_id: "w_ext_s", center: [-3, 5], width: 1.5, height: 2.3, sill_height: 0, door_type: "single_wood_swing" },
      { id: "op_sketch_win", type: "window", wall_id: "w_ext_n", center: [3, -4.91], width: 2.2, height: 1.5, sill_height: 0.8, window_type: "sliding_glass" }
    ],
    rooms: [
      { id: "r_sketch_left", name: "Hand-Drawn Studio Room", vietnamese_name: "Phòng Trái Phác Thảo", category: "living", polygon: [[-6, -5], [0, -4.94], [0, 5], [-6, 5]], area_m2: 59.8, ceiling_height: 3.3, materials: { floor: "concrete", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_sketch_right", name: "Hand-Drawn Master Chamber", vietnamese_name: "Phòng Phải Phác Thảo", category: "bedroom", polygon: [[0, -4.94], [6, -4.88], [5.92, 5], [0, 5]], area_m2: 59.5, ceiling_height: 3.3, materials: { floor: "oak", ceiling: "plaster_white", walls: "warm_white" } }
    ],
    furniture: []
  },

  // 9. Slanted Paper Photo (Ảnh chụp giấy xiên lệch góc)
  {
    id: "09_slanted_paper_photo",
    name: "Perspective Mobile Scan (Gap-Snapping Test)",
    desc: "11x9m phone photo capture with slight corner gaps (8cm gap) testing vertex snapping.",
    w: 11.0, l: 9.0, h: 3.2,
    walls: [
      // Corners have small gap ~0.08m
      { id: "w_ext_n", type: "exterior", start: [-5.45, -4.5], end: [5.42, -4.5], thickness: 0.22, height: 3.2 },
      { id: "w_ext_e", type: "exterior", start: [5.5, -4.42], end: [5.5, 4.45], thickness: 0.22, height: 3.2 },
      { id: "w_ext_s", type: "exterior", start: [5.45, 4.5], end: [-5.42, 4.5], thickness: 0.22, height: 3.2 },
      { id: "w_ext_w", type: "exterior", start: [-5.5, 4.42], end: [-5.5, -4.45], thickness: 0.22, height: 3.2 },
      { id: "w_int_middle", type: "interior", start: [-5.45, 0], end: [5.45, 0], thickness: 0.11, height: 3.2 }
    ],
    openings: [
      { id: "op_scan_door", type: "door", wall_id: "w_ext_s", center: [0, 4.5], width: 1.4, height: 2.2, sill_height: 0, door_type: "single_wood_swing" },
      { id: "op_scan_win", type: "window", wall_id: "w_ext_n", center: [0, -4.5], width: 2.0, height: 1.4, sill_height: 0.9, window_type: "sliding_glass" }
    ],
    rooms: [
      { id: "r_scan_north", name: "Scanned North Zone", vietnamese_name: "Khu Phía Bắc", category: "living", polygon: [[-5.5, -4.5], [5.5, -4.5], [5.5, 0], [-5.5, 0]], area_m2: 49.5, ceiling_height: 3.2, materials: { floor: "concrete", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_scan_south", name: "Scanned South Zone", vietnamese_name: "Khu Phía Nam", category: "bedroom", polygon: [[-5.5, 0], [5.5, 0], [5.5, 4.5], [-5.5, 4.5]], area_m2: 49.5, ceiling_height: 3.2, materials: { floor: "oak", ceiling: "plaster_white", walls: "warm_white" } }
    ],
    furniture: []
  },

  // 10. Irregular Polygon Industrial Loft (Góc đa giác tù 135 độ)
  {
    id: "10_irregular_polygon_loft",
    name: "Industrial Polygon Chamfered Loft",
    desc: "14x11m modern loft with 45-degree chamfered corner wall and triangular balcony terrace.",
    w: 14.0, l: 11.0, h: 3.8,
    walls: [
      { id: "w_ext_n", type: "exterior", start: [-7, -5.5], end: [3, -5.5], thickness: 0.22, height: 3.8 },
      { id: "w_ext_chamfer", type: "exterior", start: [3, -5.5], end: [7, -1.5], thickness: 0.22, height: 3.8 }, // 45 deg angle!
      { id: "w_ext_e", type: "exterior", start: [7, -1.5], end: [7, 5.5], thickness: 0.22, height: 3.8 },
      { id: "w_ext_s", type: "exterior", start: [7, 5.5], end: [-7, 5.5], thickness: 0.22, height: 3.8 },
      { id: "w_ext_w", type: "exterior", start: [-7, 5.5], end: [-7, -5.5], thickness: 0.22, height: 3.8 },
      { id: "w_int_loft", type: "interior", start: [-2, -5.5], end: [-2, 5.5], thickness: 0.11, height: 3.8 }
    ],
    openings: [
      { id: "op_loft_facade", type: "window", wall_id: "w_ext_chamfer", center: [5, -3.5], width: 2.8, height: 2.6, sill_height: 0.5, window_type: "fixed_picture" },
      { id: "op_loft_entry", type: "door", wall_id: "w_ext_s", center: [-4.5, 5.5], width: 1.6, height: 2.4, sill_height: 0, door_type: "single_wood_swing" }
    ],
    rooms: [
      { id: "r_loft_workshop", name: "Artisan Workshop Zone", vietnamese_name: "Xưởng Sáng Tạo Nghệ Thuật", category: "living", polygon: [[-7, -5.5], [-2, -5.5], [-2, 5.5], [-7, 5.5]], area_m2: 55.0, ceiling_height: 3.8, materials: { floor: "concrete", ceiling: "plaster_white", walls: "warm_white" } },
      { id: "r_loft_gallery", name: "Polygon Sun Gallery", vietnamese_name: "Phòng Trưng Bày Đa Giác", category: "living", polygon: [[-2, -5.5], [3, -5.5], [7, -1.5], [7, 5.5], [-2, 5.5]], area_m2: 91.0, ceiling_height: 3.8, materials: { floor: "marble", ceiling: "plaster_white", walls: "warm_white" } }
    ],
    furniture: []
  }
];

let generatedCount = 0;
for (const b of benchmarks) {
  const layout = {
    $schema: "https://pickme3d.com/schemas/layout_data.v1.json",
    metadata: {
      project_id: b.id,
      project_name: b.name,
      units: "meters",
      coordinate_system: "right_handed_y_up",
      scale_pixel_to_meter: 0.015,
      dimensions: {
        width: b.w,
        length: b.l,
        default_ceiling_height: b.h,
        exterior_wall_thickness: 0.22,
        interior_wall_thickness: 0.11
      },
      original_blueprint_url: `/blueprint/${b.id}.png`,
      created_at: new Date().toISOString(),
      version: "1.0.0"
    },
    walls: b.walls,
    openings: b.openings,
    rooms: b.rooms,
    furniture_assets: b.furniture || []
  };

  const filename = `${b.id}.json`;
  const targetPath = path.join(outDir, filename);
  fs.writeFileSync(targetPath, JSON.stringify(layout, null, 2), 'utf-8');
  generatedCount++;
}

console.log(`Successfully generated ${generatedCount} benchmark blueprint datasets in ${outDir}`);
