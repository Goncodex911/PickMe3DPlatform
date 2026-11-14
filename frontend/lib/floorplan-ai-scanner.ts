/**
 * AI Floor Plan Scanner - Reads 2D Blueprint images and parses them into structured 3D architectural data
 * Supports both legacy BlueprintProject and the standardized LayoutData format (STORY-THUAN-BP03)
 */
import {
  BlueprintProject,
  RoomSpec,
  BuildingSpecs,
  LayoutData,
  WallSegment,
  OpeningSpec,
  RoomPolygon,
  FurniturePlacement,
  convertBlueprintProjectToLayoutData,
  validateLayoutData
} from "./floorplan-types";

export interface ScanBlueprintOptions {
  userCustomNotes?: string;
  targetWidth?: number; // target real width in meters (W)
  targetLength?: number; // target real length in meters (L)
  targetCeilingHeight?: number; // target ceiling height in meters (H)
  style?: string;
  scale?: string;
}

export interface ScanResult {
  success: boolean;
  project?: BlueprintProject;
  layoutData?: LayoutData;
  error?: string;
  /** "ai": dữ liệu thật từ Gemini; "error": quét thất bại, KHÔNG có project mẫu thay thế. */
  source: "ai" | "error";
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api").replace(/\/$/, "");
const BLUEPRINT_AI_MODEL = process.env.NEXT_PUBLIC_BLUEPRINT_AI_MODEL || "gemini-3.5-flash";
/** Gemini Vision cần thời gian để trả JSON tường/cửa/phòng đầy đủ; 4,5s cũ gần như luôn hết giờ. */
/** Đủ cho 1 lần gọi model chính (backend cắt ở 75s) + 1 model dự phòng. */
export const BLUEPRINT_SCAN_TIMEOUT_MS = 150_000;

/**
 * Builds the specialized Architectural BIM prompt with few-shot normalized coordinates.
 */
function buildBIMPrompt(options: ScanBlueprintOptions = {}): string {
  const customNotes = options.userCustomNotes || "Không có";
  const userDimensions = options.targetWidth && options.targetLength
    ? `Người dùng chỉ định kích thước thực tế: Chiều rộng mặt tiền = ${options.targetWidth}m, Chiều sâu công trình = ${options.targetLength}m.`
    : "Người dùng chưa nhập kích thước. Hãy phán đoán kích thước thực tế dựa vào ghi chú số đo trên bản vẽ hoặc tỉ lệ phòng chuẩn (ví dụ 10m x 14m).";

  return `
Bạn là Kiến Trúc Sư Trưởng và Chuyên Gia Trích Xuất Vector Bản Vẽ BIM (Architectural 2D-to-3D Vision Engine).
Nhiệm vụ của bạn là phân tích bản vẽ mặt bằng kiến trúc 2D (Architectural 2D Floor Plan) được cung cấp và trích xuất cấu trúc hình học chính xác.

Yêu cầu định chuẩn không gian (Coordinate System):
- Tọa độ chuẩn hóa (Normalized Coordinates): Hệ tọa độ [nx, nz] chạy từ 0.0 đến 1.0:
  * Góc trên-trái của tòa nhà: [0.0, 0.0]
  * Góc dưới-phải của tòa nhà: [1.0, 1.0]
  * nx tăng dần từ Trái sang Phải (Chiều rộng).
  * nz tăng dần từ Trên xuống Dưới (Chiều sâu).
- ${userDimensions}

Chi tiết bóc tách cần trả về:
1. "metadata":
   - "project_name": Tên loại nhà hoặc dự án.
   - "dimensions": { "width": số mét, "length": số mét, "ceiling_height": mặc định 3.3m, "exterior_wall_thickness": 0.22m, "interior_wall_thickness": 0.11m }
2. "walls": Danh sách toàn bộ các đoạn tường nhìn thấy trên bản vẽ:
   - "id": id duy nhất (vd: "w_ext_1", "w_int_1")
   - "type": "exterior" (tường bao) hoặc "interior" (tường ngăn phòng)
   - "start": [nx1, nz1] (tọa độ normalized 0.0 - 1.0)
   - "end": [nx2, nz2] (tọa độ normalized 0.0 - 1.0)
   - "openings": danh sách id các ô cửa gắn trên tường này
3. "openings": Danh sách các ô cửa đi và cửa sổ:
   - "id": id duy nhất (vd: "door_main", "win_living")
   - "type": "door" (cửa đi) hoặc "window" (cửa sổ) hoặc "opening" (cửa vòm/thông phòng)
   - "wall_id": id của bức tường chứa cửa này
   - "center": [nx, nz] (tâm ô cửa)
   - "width_m": chiều rộng cửa tính bằng mét (cửa đi: 0.9m - 1.6m; cửa sổ: 1.2m - 2.4m)
   - "height_m": chiều cao cửa (cửa đi: 2.2m - 2.4m; cửa sổ: 1.4m - 1.8m)
   - "sill_height_m": cao độ bậu cửa (cửa đi: 0.0m; cửa sổ: 0.9m)
4. "rooms": Danh sách các phòng chức năng:
   - "id": mã định danh duy nhất (vd: "living-room", "master-bedroom", "kitchen")
   - "name": Tên tiếng Anh chuẩn kiến trúc (vd: "Living Room", "Master Bedroom")
   - "vietnamese_name": Tên tiếng Việt (vd: "Phòng Khách", "Phòng Ngủ Master", "Bếp & Ăn", "Phòng Tắm")
   - "category": "living" | "bedroom" | "kitchen" | "bath" | "outdoor" | "hallway" | "utility" | "office"
   - "polygon": danh sách các đỉnh khép kín [[nx1, nz1], [nx2, nz2], [nx3, nz3], [nx4, nz4]]
   - "area_m2": diện tích tính theo m²
   - "floor_material": "concrete" | "oak" | "dark_wood" | "marble" | "tile" | "grass"
5. "furniture_assets": Gợi ý vị trí đặt vật dụng cơ bản:
   - "asset_model_id": "bed_queen_modern" | "sofa_modern_3seat" | "dining_table_6chairs" | "toilet_wall_hung" | "sink_cabinet_bath" | "kitchen_counter_island"
   - "category": "living" | "bedroom" | "kitchen" | "bath"
   - "position": [nx, nz]
   - "rotation_deg": góc xoay độ (0, 90, 180, 270)

QUY TẮC BẮT BUỘC VỀ ĐỘ ĐẦY ĐỦ (kiểm tra lại trước khi trả lời):
- Trích xuất TẤT CẢ tường nhìn thấy, kể cả tường ngăn ngắn giữa các phòng ngủ, WC, kho, garage. Mỗi cạnh của mọi phòng trong nhà phải nằm trên một bức tường (trừ chỗ thông nhau không có tường).
- Tường dài đi qua nhiều phòng có thể ghi một đoạn, nhưng tường chỉ có ở một đoạn phải ghi đúng điểm đầu/cuối của đoạn đó.
- MỌI id cửa xuất hiện trong "walls[].openings" PHẢI có một phần tử tương ứng trong "openings" (và ngược lại).
- Mỗi phòng trong nhà phải có ít nhất một cửa đi hoặc ô thông ("opening") nối với phòng khác hoặc ra ngoài.
- Đa giác phòng đi theo đúng đường tường; phòng hình chữ L dùng 6 đỉnh, không làm tròn thành hình chữ nhật.
- Sân trong, sân vườn, hồ bơi dùng category "outdoor".
- Chỉ trả JSON, không giải thích.

Ghi chú bổ sung từ người dùng: ${customNotes}

HÃY TRẢ VỀ DUY NHẤT MỘT KHỐI JSON HỢP LỆ THEO CẤU TRÚC:
\`\`\`json
{
  "metadata": {
    "project_name": "...",
    "dimensions": {
      "width": 12.0,
      "length": 16.0,
      "ceiling_height": 3.3,
      "exterior_wall_thickness": 0.22,
      "interior_wall_thickness": 0.11
    }
  },
  "walls": [
    { "id": "w_ext_n", "type": "exterior", "start": [0.0, 0.0], "end": [1.0, 0.0], "openings": ["win_1"] },
    { "id": "w_ext_e", "type": "exterior", "start": [1.0, 0.0], "end": [1.0, 1.0], "openings": [] },
    { "id": "w_ext_s", "type": "exterior", "start": [1.0, 1.0], "end": [0.0, 1.0], "openings": ["door_main"] },
    { "id": "w_ext_w", "type": "exterior", "start": [0.0, 1.0], "end": [0.0, 0.0], "openings": [] }
  ],
  "openings": [
    { "id": "door_main", "type": "door", "wall_id": "w_ext_s", "center": [0.5, 1.0], "width_m": 1.4, "height_m": 2.2, "sill_height_m": 0.0 },
    { "id": "win_1", "type": "window", "wall_id": "w_ext_n", "center": [0.5, 0.0], "width_m": 1.8, "height_m": 1.5, "sill_height_m": 0.9 }
  ],
  "rooms": [
    {
      "id": "room_living",
      "name": "Living Room",
      "vietnamese_name": "Phòng Khách",
      "category": "living",
      "polygon": [[0.0, 0.0], [0.5, 0.0], [0.5, 1.0], [0.0, 1.0]],
      "area_m2": 32.0,
      "floor_material": "concrete"
    }
  ],
  "furniture_assets": [
    { "id": "f_sofa", "asset_model_id": "sofa_modern_3seat", "category": "living", "position": [0.25, 0.5], "rotation_deg": 0 }
  ]
}
\`\`\`
Không kèm lời giải thích hay văn bản bên ngoài khối JSON.
`;
}

/**
 * Maps normalized [nx, nz] coordinates (0..1) to centered world meters [-W/2..+W/2, -L/2..+L/2].
 */
export function normalizedToMeters(
  point: [number, number],
  widthM: number,
  lengthM: number
): [number, number] {
  const [nx, nz] = point;
  const clampedX = Math.max(0, Math.min(1, nx));
  const clampedZ = Math.max(0, Math.min(1, nz));
  const x = Number(((clampedX - 0.5) * widthM).toFixed(3));
  const z = Number(((clampedZ - 0.5) * lengthM).toFixed(3));
  return [x, z];
}

/**
 * Transforms AI-parsed normalized JSON into standard LayoutData and BlueprintProject.
 */
export function buildLayoutFromParsedAI(
  parsed: any,
  options: ScanBlueprintOptions = {},
  originalBlueprintUrl?: string
): { layoutData: LayoutData; project: BlueprintProject } {
  const widthM = options.targetWidth || Number(parsed.metadata?.dimensions?.width) || 12;
  const lengthM = options.targetLength || Number(parsed.metadata?.dimensions?.length) || 16;
  const ceilingHeightM = options.targetCeilingHeight || Number(parsed.metadata?.dimensions?.ceiling_height) || 3.3;
  const extThickness = Number(parsed.metadata?.dimensions?.exterior_wall_thickness) || 0.22;
  const intThickness = Number(parsed.metadata?.dimensions?.interior_wall_thickness) || 0.11;
  const projectName = parsed.metadata?.project_name || parsed.name || "Bản Vẽ Kiến Trúc AI";

  // 1. Process Walls
  const walls: WallSegment[] = (parsed.walls || []).map((w: any, idx: number) => {
    const rawStart = Array.isArray(w.start) ? w.start : [0, 0];
    const rawEnd = Array.isArray(w.end) ? w.end : [1, 1];
    const start = normalizedToMeters(rawStart as [number, number], widthM, lengthM);
    const end = normalizedToMeters(rawEnd as [number, number], widthM, lengthM);
    const isExt = w.type === "exterior";

    return {
      id: w.id || `wall_${idx + 1}`,
      type: (w.type === "exterior" || w.type === "interior" || w.type === "partition") ? w.type : "interior",
      start,
      end,
      thickness: isExt ? extThickness : intThickness,
      height: ceilingHeightM,
      openings: Array.isArray(w.openings) ? w.openings : []
    };
  });

  // 2. Process Openings
  const openings: OpeningSpec[] = (parsed.openings || []).map((op: any, idx: number) => {
    const rawCenter = Array.isArray(op.center) ? op.center : [0.5, 0.5];
    const center = normalizedToMeters(rawCenter as [number, number], widthM, lengthM);
    const isDoor = op.type === "door";

    return {
      id: op.id || `op_${idx + 1}`,
      type: (op.type === "door" || op.type === "window" || op.type === "opening") ? op.type : "door",
      wall_id: op.wall_id,
      center,
      width: Number(op.width_m) || Number(op.width) || (isDoor ? 1.0 : 1.6),
      height: Number(op.height_m) || Number(op.height) || (isDoor ? 2.2 : 1.5),
      sill_height: Number(op.sill_height_m) || Number(op.sill_height) || (isDoor ? 0.0 : 0.9),
      door_type: op.door_type,
      window_type: op.window_type,
      rotation_deg: Number(op.rotation_deg) || 0
    };
  });

  // 3. Process Rooms
  const rooms: RoomPolygon[] = (parsed.rooms || []).map((r: any, idx: number) => {
    const rawPoly: [number, number][] = Array.isArray(r.polygon) && r.polygon.length >= 3
      ? r.polygon
      : [[0, 0], [1, 0], [1, 1], [0, 1]];

    const polygon = rawPoly.map((pt) => normalizedToMeters(pt, widthM, lengthM));

    return {
      id: r.id || `room_${idx + 1}`,
      name: r.name || `Room ${idx + 1}`,
      vietnamese_name: r.vietnamese_name || r.vietnameseName || r.name,
      category: r.category || "living",
      polygon,
      area_m2: Number(r.area_m2) || Number(r.area) || Math.round(widthM * lengthM * 0.25),
      ceiling_height: ceilingHeightM,
      materials: {
        floor: r.floor_material || r.floorMaterial || "concrete",
        ceiling: "plaster_white_matte",
        walls: "wall_paint_warm_white"
      }
    };
  });

  // 4. Process Furniture
  const furniture_assets: FurniturePlacement[] = (parsed.furniture_assets || []).map((f: any, idx: number) => {
    const rawPos = Array.isArray(f.position) ? f.position : [0.5, 0.5];
    const [x, z] = normalizedToMeters(rawPos as [number, number], widthM, lengthM);

    return {
      id: f.id || `furn_${idx + 1}`,
      asset_model_id: f.asset_model_id || "sofa_modern_3seat",
      category: f.category || "living",
      position: [x, 0.0, z],
      rotation_deg: Number(f.rotation_deg) || 0,
      scale: [1, 1, 1],
      glb_url: `/models/furniture/${f.asset_model_id || "sofa_modern_3seat"}.glb`
    };
  });

  const layoutData: LayoutData = {
    $schema: "https://pickme3d.com/schemas/layout_data.v1.json",
    metadata: {
      project_id: `scanned-${Date.now()}`,
      project_name: projectName,
      units: "meters",
      coordinate_system: "right_handed_y_up",
      scale_pixel_to_meter: Number((widthM / 1000).toFixed(4)),
      dimensions: {
        width: widthM,
        length: lengthM,
        default_ceiling_height: ceilingHeightM,
        exterior_wall_thickness: extThickness,
        interior_wall_thickness: intThickness
      },
      original_blueprint_url: originalBlueprintUrl,
      created_at: new Date().toISOString(),
      version: "1.0.0"
    },
    walls,
    openings,
    rooms,
    furniture_assets
  };

  // Convert to legacy BlueprintProject for full backward compatibility
  const legacyRooms: RoomSpec[] = rooms.map((r) => {
    // Compute bounding box from polygon
    const xs = r.polygon.map((p) => p[0]);
    const zs = r.polygon.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    return {
      id: r.id,
      name: r.name,
      vietnameseName: r.vietnamese_name,
      category: r.category,
      bounds: [minX, minZ, maxX, maxZ],
      area: r.area_m2 || Math.round((maxX - minX) * (maxZ - minZ)),
      ceilingHeight: r.ceiling_height || ceilingHeightM,
      floorMaterial: (r.materials?.floor as any) || "concrete",
      description: `Không gian ${r.vietnamese_name || r.name} được bóc tách từ AI Vision`,
      specs: {
        orientation: "Tự nhiên",
        ventilation: "Đối lưu",
        lightSource: "Cửa sổ"
      }
    };
  });

  const project: BlueprintProject = {
    id: layoutData.metadata.project_id,
    name: layoutData.metadata.project_name,
    code: "ARCH-AI-BIM",
    subtitle: "Mặt bằng trích xuất từ AI Vision (Gemini)",
    location: "Việt Nam",
    specs: {
      width: widthM,
      length: lengthM,
      totalArea: Math.round(widthM * lengthM),
      scale: options.scale || "1:100",
      ceilingHeight: ceilingHeightM,
      exteriorWallThickness: extThickness,
      interiorWallThickness: intThickness,
      orientation: "S",
      timeOfDay: "golden_hour",
      style: (options.style as any) || "modern_minimal",
      baseFloorMaterial: "concrete"
    },
    rooms: legacyRooms,
    originalBlueprintUrl,
    layoutData
  };

  return { layoutData, project };
}

/**
 * Bóc JSON từ phản hồi của model (có thể nằm trong code fence hoặc kèm chữ thừa).
 */
export function extractJsonFromModelText(rawContent: string): any {
  const fenced = rawContent.match(/```json\s*([\s\S]*?)\s*```/) || rawContent.match(/```\s*([\s\S]*?)\s*```/);
  let jsonString = (fenced ? fenced[1] : rawContent).trim();
  if (!fenced) {
    const first = jsonString.indexOf("{");
    const last = jsonString.lastIndexOf("}");
    if (first !== -1 && last > first) jsonString = jsonString.slice(first, last + 1);
  }
  return JSON.parse(jsonString);
}

/**
 * Quét bản vẽ 2D bằng Gemini Vision qua backend (`POST /api/ai/complete`).
 * Không còn trả "mẫu dựng sẵn" khi lỗi: thất bại thì `success: false` + thông báo lỗi rõ ràng,
 * để giao diện cho người dùng thử lại hoặc chủ động chọn mặt bằng mẫu.
 */
export async function scanBlueprintWithAI(
  imageBase64: string,
  userCustomNotesOrOptions?: string | ScanBlueprintOptions,
  timeoutMs: number = BLUEPRINT_SCAN_TIMEOUT_MS
): Promise<ScanResult> {
  const options: ScanBlueprintOptions = typeof userCustomNotesOrOptions === "string"
    ? { userCustomNotes: userCustomNotesOrOptions }
    : userCustomNotesOrOptions || {};

  const prompt = buildBIMPrompt(options);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // localStorage có thể bị chặn (chế độ riêng tư) — vẫn gửi, backend sẽ trả 401 rõ ràng
  }

  try {
    const res = await fetch(`${API_BASE}/ai/complete`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        provider: "gemini",
        model: BLUEPRINT_AI_MODEL,
        system: "Bạn là hệ thống AI phân tích bản vẽ kiến trúc 2D chuyên nghiệp, trả về định dạng JSON thuần.",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        maxTokens: 8192,
        responseFormat: { type: "json_object" }
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error("Bạn cần đăng nhập (hoặc vào bằng tài khoản khách) để dùng AI quét bản vẽ.");
    }
    if (!res.ok || data?.success === false) {
      const detail = data?.error?.message || data?.message || `máy chủ trả về mã ${res.status}`;
      throw new Error(`Gemini không phân tích được bản vẽ: ${detail}`);
    }

    let parsed: any;
    try {
      parsed = extractJsonFromModelText(data.content || "");
    } catch {
      throw new Error(
        data?.finish_reason === "length"
          ? "Phản hồi AI bị cắt ngang do bản vẽ quá phức tạp. Hãy thử ảnh rõ hơn hoặc crop từng tầng."
          : "AI trả về dữ liệu không phải JSON hợp lệ."
      );
    }

    if (!parsed || !Array.isArray(parsed.walls) || parsed.walls.length === 0) {
      throw new Error("AI không nhận diện được tường nào trên ảnh. Ảnh có phải là bản vẽ mặt bằng không?");
    }
    if (!Array.isArray(parsed.rooms) || parsed.rooms.length === 0) {
      throw new Error("AI không nhận diện được phòng nào trên ảnh.");
    }

    const { layoutData, project } = buildLayoutFromParsedAI(parsed, options, imageBase64);
    return { success: true, project, layoutData, source: "ai" };
  } catch (err: any) {
    const message = err?.name === "AbortError"
      ? `Quá ${Math.round(timeoutMs / 1000)} giây AI chưa phản hồi. Vui lòng thử lại.`
      : err instanceof TypeError
        ? `Không kết nối được máy chủ PickMe3D (${API_BASE}). Kiểm tra backend đã chạy chưa.`
        : err?.message || "Không thể phân tích ảnh bản vẽ.";
    console.warn("Blueprint AI scan failed:", err);
    return { success: false, error: message, source: "error" };
  } finally {
    clearTimeout(timer);
  }
}
