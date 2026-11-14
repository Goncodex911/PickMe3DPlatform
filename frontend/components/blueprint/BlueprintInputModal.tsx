"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  BlueprintProject, 
  RoomSpec, 
  ALL_PRESETS, 
  CASA_SERRA_PRESET, 
  ArchitecturalStyle, 
  FloorMaterialType, 
  Orientation, 
  TimeOfDay,
  convertBlueprintProjectToLayoutData,
  updateProjectFromLayoutData
} from "@/lib/floorplan-types";
import { analyzeAndBuildProject } from "@/lib/floorplan-analyzer";
import { exportLayoutDataToGLB } from "@/lib/floorplan-glb-exporter";
import VectorCorrectionCanvas from "./VectorCorrectionCanvas";
import StylePicker from "./StylePicker";
import LayoutPlanPreview from "./LayoutPlanPreview";
import { applyStyleToBlueprintProject, SYSTEM_STYLE_PRESETS } from "@/lib/floorplan-auto-staging";

interface BlueprintInputModalProps {
  initialProject?: BlueprintProject;
  onApply: (project: BlueprintProject) => void;
  onClose?: () => void;
  /** Tự chạy quét AI ngay khi mở modal (dùng khi người dùng vừa tải ảnh bản vẽ lên). */
  autoScan?: boolean;
}

export default function BlueprintInputModal({
  initialProject = CASA_SERRA_PRESET,
  onApply,
  onClose,
  autoScan = false
}: BlueprintInputModalProps) {
  const [activeTab, setActiveTab] = useState<"source" | "style" | "specs" | "rooms">("source");
  const [project, setProject] = useState<BlueprintProject>(JSON.parse(JSON.stringify(initialProject)));
  const [uploadedImage, setUploadedImage] = useState<string | null>(initialProject.originalBlueprintUrl || null);
  const [isScanning, setIsScanning] = useState(false);
  const [isExportingGLB, setIsExportingGLB] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isEditingVector, setIsEditingVector] = useState(false);
  // Trạng thái quét AI hiển thị ở thẻ kết quả (tab 1)
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [scanError, setScanError] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportGLB = async () => {
    setIsExportingGLB(true);
    setScanMessage("Đang đóng gói toàn bộ cảnh 3D sang tệp .GLB chuẩn nén...");
    try {
      const layoutData = project.layoutData ?? convertBlueprintProjectToLayoutData(project);
      const res = await exportLayoutDataToGLB(layoutData, { autoDownload: true, draco: true });
      setScanMessage(
        res.dracoCompressed
          ? `✓ Đã tải xuống ${res.filename}: nén Draco ${res.originalSizeKb} KB → ${res.sizeKb} KB.`
          : `✓ Đã tải xuống ${res.filename} (${res.sizeKb} KB, chưa nén vì ${res.dracoError}).`
      );
    } catch (err: any) {
      setScanMessage(`Lỗi xuất file 3D: ${err?.message || "Không thể xuất .GLB"}`);
    } finally {
      setIsExportingGLB(false);
    }
  };

  // Switch preset
  const handleSelectPreset = (preset: BlueprintProject) => {
    setProject(JSON.parse(JSON.stringify(preset)));
    setUploadedImage(null);
    setScanState("idle");
    setScanError(null);
    setScanMessage(`Đã nạp bản vẽ mẫu: ${preset.name} (${preset.specs.totalArea} m²)`);
  };

  // Switch architectural style & adapt materials
  const handleSelectStyle = (style: ArchitecturalStyle) => {
    const updated = applyStyleToBlueprintProject(project, style);
    setProject(updated);
    setScanMessage(`✓ Đã áp dụng phong cách ${SYSTEM_STYLE_PRESETS[style]?.vietnameseName || style}!`);
  };

  // Smart auto-stage furniture and layout
  const handleAutoStage = (style: ArchitecturalStyle) => {
    const updated = applyStyleToBlueprintProject(project, style);
    setProject(updated);
    setScanMessage(`✓ Đã tự động kê đồ nội thất và gán vật liệu chuẩn phong cách ${SYSTEM_STYLE_PRESETS[style]?.vietnameseName || style}!`);
  };

  // Upload image
  // Upload image: đổi ảnh thì quét lại ngay
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setScanState("error");
      setScanError("Chỉ hỗ trợ ảnh PNG, JPG hoặc WEBP. Với PDF/CAD, hãy xuất bản vẽ ra ảnh trước.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setUploadedImage(b64);
      void handleTriggerAIScan(b64);
    };
    reader.readAsDataURL(file);
  };

  // Trigger AI Scan (có thể truyền ảnh mới vừa chọn, vì state chưa kịp cập nhật)
  const handleTriggerAIScan = async (imageOverride?: string) => {
    const image = imageOverride ?? uploadedImage;
    if (!image) {
      setScanState("error");
      setScanError("Vui lòng tải lên ảnh bản vẽ mặt bằng 2D trước khi quét AI.");
      return;
    }
    setIsScanning(true);
    setScanState("scanning");
    setScanError(null);
    setScanMessage(null);

    try {
      const scanned = await analyzeAndBuildProject(image, {
        style: project.specs.style as any,
        useAI: true
      });
      const styled = applyStyleToBlueprintProject(scanned, project.specs.style);
      setProject({ ...styled, layoutData: scanned.layoutData });
      setScanState("success");
    } catch (err: any) {
      setScanState("error");
      setScanError(err?.message || "Không thể phân tích ảnh");
    } finally {
      setIsScanning(false);
    }
  };

  // Quét tự động một lần khi modal được mở cùng ảnh vừa tải lên
  const autoScanStartedRef = useRef(false);
  useEffect(() => {
    if (autoScan && uploadedImage && !autoScanStartedRef.current) {
      autoScanStartedRef.current = true;
      void handleTriggerAIScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan, uploadedImage]);

  // Update building spec field
  const handleUpdateSpec = (field: keyof typeof project.specs, value: any) => {
    if (field === "style") {
      setProject((prev) => applyStyleToBlueprintProject(prev, value as ArchitecturalStyle));
    } else {
      setProject((prev) => ({
        ...prev,
        specs: {
          ...prev.specs,
          [field]: value
        }
      }));
    }
  };

  // Room editing
  const handleUpdateRoom = (index: number, field: keyof RoomSpec, value: any) => {
    setProject((prev) => {
      const nextRooms = [...prev.rooms];
      nextRooms[index] = {
        ...nextRooms[index],
        [field]: value
      };
      return { ...prev, rooms: nextRooms };
    });
  };

  const handleUpdateRoomBounds = (index: number, boundIndex: number, val: number) => {
    setProject((prev) => {
      const nextRooms = [...prev.rooms];
      const curBounds = [...nextRooms[index].bounds] as [number, number, number, number];
      curBounds[boundIndex] = val;
      // Recalculate area: |x1 - x0| * |z1 - z0|
      const width = Math.abs(curBounds[2] - curBounds[0]);
      const depth = Math.abs(curBounds[3] - curBounds[1]);
      const newArea = Math.round(width * depth);
      
      nextRooms[index] = {
        ...nextRooms[index],
        bounds: curBounds,
        area: newArea > 0 ? newArea : nextRooms[index].area
      };
      // Khung phòng đã đổi tay => tường AI không còn khớp, quay về dựng tường theo khung phòng.
      return { ...prev, rooms: nextRooms, layoutData: undefined };
    });
  };

  const handleAddRoom = () => {
    const newRoom: RoomSpec = {
      id: `room-${Date.now()}`,
      name: `New Room ${project.rooms.length + 1}`,
      vietnameseName: `Phòng Mới ${project.rooms.length + 1}`,
      category: "living",
      bounds: [0, 0, 4, 4],
      area: 16,
      ceilingHeight: project.specs.ceilingHeight,
      floorMaterial: project.specs.baseFloorMaterial,
      description: "Không gian mở được bổ sung vào mặt bằng",
      specs: { orientation: "Tự nhiên", ventilation: "Đối lưu", lightSource: "Cửa sổ" }
    };
    setProject((prev) => ({ ...prev, rooms: [...prev.rooms, newRoom], layoutData: undefined }));
  };

  const handleRemoveRoom = (index: number) => {
    if (project.rooms.length <= 1) {
      alert("Bản vẽ cần có ít nhất 1 phòng.");
      return;
    }
    setProject((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index),
      layoutData: undefined
    }));
  };

  const TABS: { id: typeof activeTab; label: string }[] = [
    { id: "source", label: "Bản vẽ" },
    { id: "style", label: "Phong cách" },
    { id: "specs", label: "Thông số" },
    { id: "rooms", label: `Phòng (${project.rooms.length})` }
  ];
  const layout = project.layoutData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="blueprint-input-title"
        className="relative w-full max-w-5xl rounded-2xl bg-[#f7f4ec] border border-[#dcd5c7] shadow-2xl text-neutral-900 overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 pt-4 pb-3">
          <div className="min-w-0">
            <h2 id="blueprint-input-title" className="text-base sm:text-lg font-bold tracking-tight">
              Nhập bản vẽ 2D
            </h2>
            <p className="text-xs text-neutral-500 truncate">
              AI nhận diện tường, cửa, phòng; kiểm tra và chỉnh lại trước khi dựng mô hình 3D
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-black/5 transition"
              aria-label="Đóng"
            >
              <Icon name="close" />
            </button>
          )}
        </div>

        {/* THANH BƯỚC */}
        <div className="px-5 sm:px-6 pb-3">
          <div role="tablist" className="inline-flex max-w-full overflow-x-auto [scrollbar-width:none] gap-1 p-1 rounded-xl bg-white border border-[#e5dfd3]">
            {TABS.map((tab, i) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm transition ${
                    active ? "bg-neutral-900 text-white font-semibold shadow-sm" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-mono flex items-center justify-center ${
                      active ? "bg-white/20" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* BODY */}
        <div className="px-5 sm:px-6 pb-5 overflow-y-auto flex-1">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileUpload} className="hidden" />

          {/* TAB 1: BẢN VẼ & AI */}
          {activeTab === "source" && (
            <div className="space-y-4">
              {uploadedImage ? (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* Ảnh gốc */}
                  <section className={`lg:col-span-3 ${CARD} overflow-hidden`}>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#ece6da]">
                      <span className={SECTION_TITLE}>Ảnh bản vẽ gốc</span>
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className={BTN_LINK}>
                        <Icon name="upload" /> Đổi ảnh
                      </button>
                    </div>
                    <div
                      className="h-64 sm:h-80 bg-white flex items-center justify-center p-3"
                      style={{
                        backgroundImage: "linear-gradient(#f1ede4 1px, transparent 1px), linear-gradient(90deg, #f1ede4 1px, transparent 1px)",
                        backgroundSize: "20px 20px"
                      }}
                    >
                      <img src={uploadedImage} alt="Ảnh bản vẽ mặt bằng đã tải lên" className="max-w-full max-h-full object-contain shadow-sm" />
                    </div>
                  </section>

                  {/* Kết quả AI */}
                  <section className={`lg:col-span-2 ${CARD} flex flex-col`}>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#ece6da]">
                      <span className={SECTION_TITLE}>Kết quả nhận diện AI</span>
                      <ScanBadge state={scanState} />
                    </div>

                    <div className="flex-1 p-4 flex flex-col gap-3">
                      {scanState === "scanning" && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
                          <span className="w-10 h-10 rounded-full border-[3px] border-[#FF4D00]/25 border-t-[#FF4D00] animate-spin" aria-hidden="true" />
                          <div>
                            <p className="text-sm font-semibold">Gemini đang đọc bản vẽ…</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Nhận diện tường, cửa và phòng, thường mất 20–60 giây</p>
                          </div>
                        </div>
                      )}

                      {scanState === "error" && (
                        <div className="flex-1 flex flex-col justify-center gap-3">
                          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700 leading-relaxed">
                            {scanError}
                          </div>
                          <button type="button" onClick={() => handleTriggerAIScan()} className={BTN_PRIMARY}>
                            <Icon name="refresh" /> Quét lại
                          </button>
                        </div>
                      )}

                      {scanState === "idle" && (
                        <div className="flex-1 flex flex-col justify-center gap-3 text-center">
                          <p className="text-xs text-neutral-500">Ảnh đã sẵn sàng. Bấm quét để AI bóc tách mặt bằng.</p>
                          <button type="button" onClick={() => handleTriggerAIScan()} className={BTN_PRIMARY}>
                            <Icon name="sparkle" /> Quét AI bản vẽ
                          </button>
                        </div>
                      )}

                      {scanState === "success" && layout && (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            <Stat label="Phòng" value={layout.rooms.length} />
                            <Stat label="Tường" value={layout.walls.length} />
                            <Stat label="Cửa" value={layout.openings.length} />
                          </div>
                          <div className="rounded-xl border border-[#ece6da] bg-[#fbf9f4] h-40 sm:h-44 p-2">
                            <LayoutPlanPreview layout={layout} className="w-full h-full" />
                          </div>
                          <p className="text-[11px] text-neutral-500 leading-relaxed">
                            So sánh với ảnh gốc. Nét tường sai thì nắn chỉnh lại, tên hay kích thước phòng sửa ở bước 4.
                          </p>
                          <div className="grid grid-cols-2 gap-2 mt-auto">
                            <button type="button" onClick={() => setIsEditingVector(true)} className={BTN_SECONDARY}>
                              <Icon name="pen" /> Nắn chỉnh
                            </button>
                            <button type="button" onClick={() => setActiveTab("rooms")} className={BTN_SECONDARY}>
                              Xem phòng <Icon name="arrow" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                </div>
              ) : (
                /* Chưa có ảnh: vùng kéo thả */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed border-[#d6cebd] hover:border-[#FF4D00]/60 bg-white hover:bg-[#fffaf6] transition flex flex-col items-center justify-center gap-2 py-12 text-center group"
                >
                  <span className="w-12 h-12 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center group-hover:scale-105 transition">
                    <Icon name="upload" size={22} />
                  </span>
                  <span className="text-sm font-semibold">Chọn ảnh bản vẽ mặt bằng</span>
                  <span className="text-xs text-neutral-500">PNG, JPG hoặc WEBP · AI sẽ tự quét ngay sau khi tải lên</span>
                </button>
              )}

              {scanMessage && <StatusLine message={scanMessage} />}

              {/* MẶT BẰNG MẪU: thu gọn khi đã có ảnh */}
              <section className={CARD}>
                <button
                  type="button"
                  onClick={() => setShowPresets((v) => !v)}
                  aria-expanded={showPresets || !uploadedImage}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span>
                    <span className={SECTION_TITLE}>Hoặc dùng mặt bằng mẫu</span>
                    <span className="block text-xs text-neutral-500 mt-0.5">{ALL_PRESETS.length} mẫu kiến trúc dựng sẵn</span>
                  </span>
                  {uploadedImage && (
                    <span className={`text-neutral-400 transition ${showPresets ? "rotate-180" : ""}`}>
                      <Icon name="chevron" />
                    </span>
                  )}
                </button>
                {(showPresets || !uploadedImage) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 px-4 pb-4">
                    {ALL_PRESETS.map((p) => {
                      const isSelected = project.id === p.id && !uploadedImage;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPreset(p)}
                          aria-pressed={isSelected}
                          className={`text-left rounded-xl border px-3 py-2.5 transition ${
                            isSelected
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-[#e5dfd3] bg-[#fbf9f4] hover:border-neutral-400"
                          }`}
                        >
                          <span className={`block text-sm font-semibold truncate ${isSelected ? "" : "text-neutral-900"}`}>{p.name}</span>
                          <span className={`block text-[11px] mt-0.5 ${isSelected ? "text-white/70" : "text-neutral-500"}`}>
                            {p.specs.totalArea} m² · {p.rooms.length} phòng · {p.specs.scale}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: PHONG CÁCH */}
          {activeTab === "style" && (
            <div className="space-y-4">
              <StylePicker currentStyle={project.specs.style} onSelectStyle={handleSelectStyle} onAutoStage={handleAutoStage} />
              {scanMessage && <StatusLine message={scanMessage} />}
            </div>
          )}

          {/* TAB 3: THÔNG SỐ */}
          {activeTab === "specs" && (
            <div className="space-y-4">
              <section className={`${CARD} p-4`}>
                <h3 className={`${SECTION_TITLE} mb-3`}>Thông tin bản vẽ</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Tên dự án / tên nhà">
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => setProject({ ...project, name: e.target.value })}
                      className={INPUT}
                      placeholder="VD: Nhà phố Q.7"
                    />
                  </Field>
                  <Field label="Mã bản vẽ">
                    <input
                      type="text"
                      value={project.code}
                      onChange={(e) => setProject({ ...project, code: e.target.value })}
                      className={`${INPUT} font-mono`}
                      placeholder="VD: A-101 rev D"
                    />
                  </Field>
                  <Field label="Tỉ lệ bản vẽ">
                    <select value={project.specs.scale} onChange={(e) => handleUpdateSpec("scale", e.target.value)} className={INPUT}>
                      <option value="1:50">1:50 (chi tiết nội thất)</option>
                      <option value="1:100">1:100 (tiêu chuẩn xây dựng)</option>
                      <option value="1:200">1:200 (quy hoạch tổng thể)</option>
                    </select>
                  </Field>
                </div>
              </section>

              <section className={`${CARD} p-4`}>
                <h3 className={`${SECTION_TITLE} mb-3`}>Kích thước & kết cấu</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Chiều rộng (m)">
                    <input type="number" step="0.5" value={project.specs.width} onChange={(e) => handleUpdateSpec("width", parseFloat(e.target.value) || 1)} className={`${INPUT} font-mono`} />
                  </Field>
                  <Field label="Chiều dài (m)">
                    <input type="number" step="0.5" value={project.specs.length} onChange={(e) => handleUpdateSpec("length", parseFloat(e.target.value) || 1)} className={`${INPUT} font-mono`} />
                  </Field>
                  <Field label="Diện tích sàn (m²)">
                    <input type="number" value={project.specs.totalArea} onChange={(e) => handleUpdateSpec("totalArea", parseFloat(e.target.value) || 1)} className={`${INPUT} font-mono`} />
                  </Field>
                  <Field label="Cao độ trần (m)">
                    <input type="number" step="0.1" value={project.specs.ceilingHeight} onChange={(e) => handleUpdateSpec("ceilingHeight", parseFloat(e.target.value) || 3.0)} className={`${INPUT} font-mono`} />
                  </Field>
                  <Field label="Tường bao (m)" hint="Chuẩn 0.20–0.25 m">
                    <input type="number" step="0.05" value={project.specs.exteriorWallThickness} onChange={(e) => handleUpdateSpec("exteriorWallThickness", parseFloat(e.target.value) || 0.2)} className={`${INPUT} font-mono`} />
                  </Field>
                  <Field label="Tường ngăn (m)" hint="Chuẩn 0.10 m">
                    <input type="number" step="0.02" value={project.specs.interiorWallThickness} onChange={(e) => handleUpdateSpec("interiorWallThickness", parseFloat(e.target.value) || 0.1)} className={`${INPUT} font-mono`} />
                  </Field>
                </div>
              </section>

              <section className={`${CARD} p-4`}>
                <h3 className={`${SECTION_TITLE} mb-3`}>Ánh sáng & vật liệu</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field label="Hướng nhà">
                    <select value={project.specs.orientation} onChange={(e) => handleUpdateSpec("orientation", e.target.value as Orientation)} className={INPUT}>
                      <option value="S">Nam</option>
                      <option value="SE">Đông Nam</option>
                      <option value="E">Đông</option>
                      <option value="NE">Đông Bắc</option>
                      <option value="N">Bắc</option>
                      <option value="SW">Tây Nam</option>
                      <option value="W">Tây</option>
                      <option value="NW">Tây Bắc</option>
                    </select>
                  </Field>
                  <Field label="Thời điểm">
                    <select value={project.specs.timeOfDay} onChange={(e) => handleUpdateSpec("timeOfDay", e.target.value as TimeOfDay)} className={INPUT}>
                      <option value="golden_hour">Hoàng hôn</option>
                      <option value="morning">Sáng sớm</option>
                      <option value="noon">Trưa</option>
                      <option value="night">Ban đêm</option>
                    </select>
                  </Field>
                  <Field label="Phong cách">
                    <select value={project.specs.style} onChange={(e) => handleUpdateSpec("style", e.target.value as ArchitecturalStyle)} className={INPUT}>
                      <option value="casa_serra">Brutalist (bê tông & gỗ)</option>
                      <option value="modern_minimal">Tối giản hiện đại</option>
                      <option value="scandinavian">Bắc Âu</option>
                      <option value="luxury_marble">Sang trọng (đá cẩm thạch)</option>
                      <option value="tropical">Nhiệt đới</option>
                    </select>
                  </Field>
                  <Field label="Sàn cơ bản">
                    <select value={project.specs.baseFloorMaterial} onChange={(e) => handleUpdateSpec("baseFloorMaterial", e.target.value as FloorMaterialType)} className={INPUT}>
                      <option value="concrete">Bê tông mài</option>
                      <option value="oak">Gỗ sồi</option>
                      <option value="marble">Đá cẩm thạch</option>
                      <option value="tile">Gạch mờ</option>
                      <option value="dark_wood">Gỗ óc chó</option>
                    </select>
                  </Field>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: TỪNG PHÒNG */}
          {activeTab === "rooms" && (
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Danh sách phòng ({project.rooms.length})</h3>
                  <p className="text-xs text-neutral-500">Toạ độ tính bằng mét từ tâm công trình. Đổi khung phòng sẽ dựng lại tường theo khung.</p>
                </div>
                <button type="button" onClick={handleAddRoom} className={`${BTN_SECONDARY} shrink-0`}>
                  <Icon name="plus" /> Thêm phòng
                </button>
              </div>

              {project.rooms.map((room, idx) => (
                <article key={room.id} className={`${CARD} p-4 space-y-3`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-neutral-900 text-white text-xs font-mono flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={room.vietnameseName || room.name}
                      onChange={(e) => handleUpdateRoom(idx, "vietnameseName", e.target.value)}
                      aria-label={`Tên phòng ${idx + 1}`}
                      className="flex-1 min-w-[10rem] font-semibold text-sm bg-transparent rounded-md px-1.5 py-1 hover:bg-neutral-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
                      placeholder="Tên phòng"
                    />
                    <select
                      value={room.category}
                      onChange={(e) => handleUpdateRoom(idx, "category", e.target.value)}
                      aria-label="Công năng"
                      className={`${INPUT_SM} w-auto`}
                    >
                      <option value="living">Phòng khách</option>
                      <option value="kitchen">Bếp & ăn</option>
                      <option value="bedroom">Phòng ngủ</option>
                      <option value="bath">Vệ sinh</option>
                      <option value="outdoor">Sân / hiên</option>
                      <option value="hallway">Sảnh / hành lang</option>
                      <option value="utility">Kho / thay đồ</option>
                      <option value="office">Làm việc</option>
                    </select>
                    <select
                      value={room.floorMaterial || project.specs.baseFloorMaterial}
                      onChange={(e) => handleUpdateRoom(idx, "floorMaterial", e.target.value)}
                      aria-label="Vật liệu sàn"
                      className={`${INPUT_SM} w-auto`}
                    >
                      <option value="concrete">Sàn bê tông</option>
                      <option value="oak">Sàn gỗ sồi</option>
                      <option value="marble">Đá cẩm thạch</option>
                      <option value="tile">Gạch men</option>
                      <option value="gravel">Sỏi trắng</option>
                      <option value="grass">Cỏ</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveRoom(idx)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 transition"
                      aria-label={`Xoá phòng ${room.vietnameseName || room.name}`}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {(["X0", "Z0", "X1", "Z1"] as const).map((axis, b) => (
                      <Field key={axis} label={`${axis} (m)`} small>
                        <input
                          type="number"
                          step="0.5"
                          value={room.bounds[b]}
                          onChange={(e) => handleUpdateRoomBounds(idx, b, parseFloat(e.target.value) || 0)}
                          className={`${INPUT_SM} font-mono`}
                        />
                      </Field>
                    ))}
                    <Field label="Diện tích (m²)" small>
                      <input
                        type="number"
                        value={room.area}
                        onChange={(e) => handleUpdateRoom(idx, "area", parseFloat(e.target.value) || 0)}
                        className={`${INPUT_SM} font-mono font-semibold text-[#c23c00]`}
                      />
                    </Field>
                    <Field label="Trần (m)" small>
                      <input
                        type="number"
                        step="0.1"
                        value={room.ceilingHeight || project.specs.ceilingHeight}
                        onChange={(e) => handleUpdateRoom(idx, "ceilingHeight", parseFloat(e.target.value) || 3.0)}
                        className={`${INPUT_SM} font-mono`}
                      />
                    </Field>
                  </div>

                  <input
                    type="text"
                    value={room.description}
                    onChange={(e) => handleUpdateRoom(idx, "description", e.target.value)}
                    placeholder="Ghi chú công năng (không bắt buộc)"
                    aria-label="Ghi chú phòng"
                    className={`${INPUT_SM} text-neutral-600`}
                  />
                </article>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-[#e5dfd3] bg-white/70">
          <div className="text-xs text-neutral-500 whitespace-nowrap">
            <span className="font-semibold text-neutral-900">{project.rooms.length} phòng</span>
            <span className="mx-1.5">·</span>
            <span className="font-semibold text-neutral-900">{project.specs.totalArea} m²</span>
            <span className="mx-1.5">·</span>
            trần {project.specs.ceilingHeight} m
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button type="button" onClick={() => setIsEditingVector(true)} className={BTN_SECONDARY} title="Nắn chỉnh nét tường trên nền ảnh bản vẽ">
              <Icon name="pen" /> Nắn chỉnh 2D
            </button>
            <button type="button" onClick={handleExportGLB} disabled={isExportingGLB} className={BTN_SECONDARY} title="Tải mô hình 3D (.GLB, nén Draco)">
              <Icon name={isExportingGLB ? "spinner" : "download"} /> {isExportingGLB ? "Đang xuất…" : "Tải GLB"}
            </button>
            {onClose && (
              <button type="button" onClick={onClose} className={BTN_GHOST}>
                Huỷ
              </button>
            )}
            <button type="button" onClick={() => onApply(project)} disabled={isScanning} className={BTN_PRIMARY}>
              Dựng mô hình 3D <Icon name="arrow" />
            </button>
          </div>
        </div>
      </div>

      {/* 2D VECTOR CORRECTION CANVAS MODAL (Story 4.1) */}
      {isEditingVector && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <VectorCorrectionCanvas
            initialLayout={project.layoutData ?? convertBlueprintProjectToLayoutData(project)}
            onConfirm={(updatedLayout) => {
              const updatedProject = updateProjectFromLayoutData(project, updatedLayout);
              setProject({ ...updatedProject, layoutData: updatedLayout });
              setIsEditingVector(false);
              setScanMessage("✓ Đã cập nhật tường và phòng từ bản vẽ vector 2D.");
            }}
            onClose={() => setIsEditingVector(false)}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kiểu dùng chung (đồng bộ với trang 3D: nền giấy kem, nhấn cam)       */
/* ------------------------------------------------------------------ */

const CARD = "rounded-2xl bg-white border border-[#e5dfd3] shadow-sm";
const SECTION_TITLE = "text-[11px] uppercase tracking-wider font-bold text-neutral-500";
const INPUT =
  "w-full bg-white border border-[#ddd6c8] rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 transition";
const INPUT_SM =
  "w-full bg-white border border-[#ddd6c8] rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 transition";
const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D00]/40 disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_PRIMARY = `${BTN_BASE} px-4 py-2.5 bg-[#FF4D00] hover:bg-[#e04400] text-white shadow-sm`;
const BTN_SECONDARY = `${BTN_BASE} px-3.5 py-2 bg-white border border-[#ddd6c8] text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50`;
const BTN_GHOST = `${BTN_BASE} px-3 py-2 text-neutral-500 hover:text-neutral-900 hover:bg-black/5`;
const BTN_LINK = "inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-[#FF4D00] disabled:opacity-50 transition";

/* ------------------------------------------------------------------ */
/* Thành phần nhỏ                                                       */
/* ------------------------------------------------------------------ */

function Field({ label, hint, small = false, children }: { label: string; hint?: string; small?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={`block mb-1 text-neutral-500 ${small ? "text-[10px]" : "text-xs"}`}>{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[11px] text-neutral-400">{hint}</span>}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[#fbf9f4] border border-[#ece6da] px-3 py-2 text-center">
      <span className="block text-lg font-bold font-mono leading-tight">{value}</span>
      <span className="block text-[11px] text-neutral-500">{label}</span>
    </div>
  );
}

function ScanBadge({ state }: { state: "idle" | "scanning" | "success" | "error" }) {
  const map = {
    idle: { text: "Chưa quét", cls: "bg-neutral-100 text-neutral-600" },
    scanning: { text: "Đang quét", cls: "bg-[#FF4D00]/10 text-[#c23c00]" },
    success: { text: "Hoàn tất", cls: "bg-emerald-50 text-emerald-700" },
    error: { text: "Lỗi", cls: "bg-red-50 text-red-700" }
  } as const;
  const { text, cls } = map[state];
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{text}</span>;
}

function StatusLine({ message }: { message: string }) {
  const isError = /^(✕|Lỗi)/.test(message);
  return (
    <div
      role="status"
      className={`rounded-xl px-3 py-2 text-xs border ${
        isError ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-[#e5dfd3] text-neutral-700"
      }`}
    >
      {message}
    </div>
  );
}

type IconName = "close" | "upload" | "sparkle" | "refresh" | "pen" | "arrow" | "chevron" | "plus" | "trash" | "download" | "spinner";

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  if (name === "spinner") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
      </svg>
    );
  }
  const paths: Record<Exclude<IconName, "spinner">, React.ReactNode> = {
    close: <path d="M6 6l12 12M18 6 6 18" />,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></>,
    refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>,
    pen: <><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
    download: <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
