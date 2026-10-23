"use client";

import React, { useState, useRef } from "react";
import { 
  BlueprintProject, 
  RoomSpec, 
  ALL_PRESETS, 
  CASA_SERRA_PRESET, 
  ArchitecturalStyle, 
  FloorMaterialType, 
  Orientation, 
  TimeOfDay 
} from "@/lib/floorplan-types";
import { scanBlueprintWithAI } from "@/lib/floorplan-ai-scanner";

interface BlueprintInputModalProps {
  initialProject?: BlueprintProject;
  onApply: (project: BlueprintProject) => void;
  onClose?: () => void;
}

export default function BlueprintInputModal({
  initialProject = CASA_SERRA_PRESET,
  onApply,
  onClose
}: BlueprintInputModalProps) {
  const [activeTab, setActiveTab] = useState<"source" | "specs" | "rooms">("source");
  const [project, setProject] = useState<BlueprintProject>(JSON.parse(JSON.stringify(initialProject)));
  const [uploadedImage, setUploadedImage] = useState<string | null>(initialProject.originalBlueprintUrl || null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Switch preset
  const handleSelectPreset = (preset: BlueprintProject) => {
    setProject(JSON.parse(JSON.stringify(preset)));
    setUploadedImage(null);
    setScanMessage(`Đã nạp bản vẽ mẫu: ${preset.name} (${preset.specs.totalArea} m²)`);
  };

  // Upload image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setUploadedImage(b64);
      setScanMessage("Đã tải ảnh bản vẽ. Bạn có thể bấm 'Quét AI' hoặc tinh chỉnh thông số bên dưới.");
    };
    reader.readAsDataURL(file);
  };

  // Trigger AI Scan
  const handleTriggerAIScan = async () => {
    if (!uploadedImage) {
      alert("Vui lòng tải lên ảnh bản vẽ mặt bằng 2D trước khi quét AI.");
      return;
    }
    setIsScanning(true);
    setScanMessage("Đang dùng Vision AI phân tích kiến trúc, nhận diện tường, phòng và kích thước...");

    try {
      const res = await scanBlueprintWithAI(uploadedImage, `Yêu cầu phong cách: ${project.specs.style}`);
      if (res.project) {
        setProject(res.project);
        setScanMessage(
          res.source === "ai" 
            ? `✓ AI đã bóc tách thành công ${res.project.rooms.length} phòng từ bản vẽ!`
            : `✓ Đã trích xuất cấu trúc kiến trúc tiêu chuẩn với ${res.project.rooms.length} phòng!`
        );
        setActiveTab("rooms"); // Move user to review rooms
      }
    } catch (err: any) {
      setScanMessage(`Lỗi quét: ${err?.message || "Không thể phân tích ảnh"}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Update building spec field
  const handleUpdateSpec = (field: keyof typeof project.specs, value: any) => {
    setProject((prev) => ({
      ...prev,
      specs: {
        ...prev.specs,
        [field]: value
      }
    }));
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
      return { ...prev, rooms: nextRooms };
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
    setProject((prev) => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
  };

  const handleRemoveRoom = (index: number) => {
    if (project.rooms.length <= 1) {
      alert("Bản vẽ cần có ít nhất 1 phòng.");
      return;
    }
    setProject((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-[#141518] border border-[#2b2f38] shadow-2xl text-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232730] bg-[#1a1d24]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
              📐
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide text-white flex items-center gap-2">
                Nhập Bản Vẽ 2D & Cấu Hình Thông Số Thực Tế
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Casa Serra Engine
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Khai báo thông số kỹ thuật chuẩn kiến trúc để hệ thống dựng lại mô hình 3D chân thực nhất
              </p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
              title="Đóng"
            >
              ✕
            </button>
          )}
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-[#232730] bg-[#101216] px-6 gap-2">
          <button
            onClick={() => setActiveTab("source")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "source" 
                ? "border-amber-400 text-amber-300 bg-amber-400/5" 
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span>1. Nguồn Bản Vẽ & AI Scan</span>
          </button>
          <button
            onClick={() => setActiveTab("specs")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "specs" 
                ? "border-amber-400 text-amber-300 bg-amber-400/5" 
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span>2. Thông Số Kiến Trúc Kỹ Thuật</span>
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "rooms" 
                ? "border-amber-400 text-amber-300 bg-amber-400/5" 
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span>3. Bóc Tách Từng Phòng ({project.rooms.length})</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: SOURCE & PRESETS & AI SCAN */}
          {activeTab === "source" && (
            <div className="space-y-6">
              {/* Presets Selection */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-amber-400/90 font-semibold mb-3">
                  Cách 1: Chọn Bản Vẽ Mẫu Kiến Trúc Chuẩn Thực Tế
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ALL_PRESETS.map((p) => {
                    const isSelected = project.id === p.id && !uploadedImage;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        className={`cursor-pointer rounded-xl p-4 border transition ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-400 text-white shadow-lg shadow-amber-500/5"
                            : "bg-[#181b22] border-[#292e3a] hover:border-neutral-500 text-neutral-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-mono">
                            {p.code}
                          </span>
                          <span className="text-xs font-semibold text-neutral-400">
                            {p.specs.totalArea} m²
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-white mb-1">{p.name}</h4>
                        <p className="text-xs text-neutral-400 mb-2 line-clamp-2">{p.subtitle}</p>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                          <span>🚪 {p.rooms.length} phòng</span>
                          <span>•</span>
                          <span>📏 {p.specs.scale}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upload Blueprint Image */}
              <div className="border-t border-[#232730] pt-6">
                <label className="block text-xs uppercase tracking-wider text-amber-400/90 font-semibold mb-3">
                  Cách 2: Tải Lên Bản Vẽ Mặt Bằng 2D Của Bạn (Ảnh / CAD / Phác Thảo)
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#343b49] hover:border-amber-400/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-[#14171e] transition group text-center min-h-[180px]"
                  >
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*,.pdf" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                    <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-amber-400/20 text-neutral-400 group-hover:text-amber-400 flex items-center justify-center text-2xl mb-3 transition">
                      ⬆
                    </div>
                    <span className="text-sm font-medium text-neutral-200 group-hover:text-amber-300">
                      Nhấp để chọn ảnh hoặc kéo thả bản vẽ vào đây
                    </span>
                    <span className="text-xs text-neutral-500 mt-1">
                      Hỗ trợ JPG, PNG, WEBP, bản vẽ CAD mặt bằng, sơ đồ phân lô
                    </span>
                  </div>

                  {/* Preview & AI Scan CTA */}
                  <div className="bg-[#181b22] border border-[#2a2f3b] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-neutral-400 font-medium">Bản vẽ đang nạp:</span>
                        {uploadedImage && (
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            ● Đã tải ảnh lên
                          </span>
                        )}
                      </div>
                      
                      {uploadedImage ? (
                        <div className="w-full h-28 rounded-lg overflow-hidden border border-[#343b49] bg-black flex items-center justify-center mb-3">
                          <img 
                            src={uploadedImage} 
                            alt="Blueprint Preview" 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                      ) : (
                        <div className="w-full h-28 rounded-lg border border-dashed border-[#2a2f3b] bg-black/20 flex items-center justify-center text-xs text-neutral-500 mb-3">
                          Chưa có ảnh upload (Đang dùng dữ liệu {project.name})
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleTriggerAIScan}
                      disabled={isScanning || !uploadedImage}
                      className="w-full py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                    >
                      {isScanning ? (
                        <>
                          <span className="animate-spin text-base">⚙</span>
                          <span>Đang Quét AI Bản Vẽ...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Quét AI & Nhận Diện Phòng Tự Động</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {scanMessage && (
                  <div className="mt-3 p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-neutral-300">
                    {scanMessage}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ARCHITECTURAL SPECS */}
          {activeTab === "specs" && (
            <div className="space-y-6">
              {/* Project Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Tên Dự Án / Tên Nhà</label>
                  <input
                    type="text"
                    value={project.name}
                    onChange={(e) => setProject({ ...project, name: e.target.value })}
                    className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    placeholder="VD: Casa Serra, Nhà phố Q.7..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Mã Bản Vẽ Kỹ Thuật</label>
                  <input
                    type="text"
                    value={project.code}
                    onChange={(e) => setProject({ ...project, code: e.target.value })}
                    className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="VD: A-101 rev D"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Tỉ Lệ Bản Vẽ</label>
                  <select
                    value={project.specs.scale}
                    onChange={(e) => handleUpdateSpec("scale", e.target.value)}
                    className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="1:50">1:50 (Chi tiết nội thất)</option>
                    <option value="1:100">1:100 (Tiêu chuẩn xây dựng)</option>
                    <option value="1:200">1:200 (Quy hoạch tổng thể như Casa Serra)</option>
                  </select>
                </div>
              </div>

              {/* Exact Dimensions & Structural Parameters */}
              <div className="border-t border-[#232730] pt-4">
                <h4 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-3">
                  Kích Thước Hình Học & Kết Cấu Công Trình
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Chiều Rộng Mặt Bằng (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={project.specs.width}
                      onChange={(e) => handleUpdateSpec("width", parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Chiều Dài Mặt Bằng (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={project.specs.length}
                      onChange={(e) => handleUpdateSpec("length", parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Tổng Diện Tích Sàn (m²)</label>
                    <input
                      type="number"
                      value={project.specs.totalArea}
                      onChange={(e) => handleUpdateSpec("totalArea", parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Chiều Cao Trần Nhà (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={project.specs.ceilingHeight}
                      onChange={(e) => handleUpdateSpec("ceilingHeight", parseFloat(e.target.value) || 3.0)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Độ Dày Tường Bao Ngoài (m)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={project.specs.exteriorWallThickness}
                      onChange={(e) => handleUpdateSpec("exteriorWallThickness", parseFloat(e.target.value) || 0.2)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <span className="text-[11px] text-neutral-500 mt-0.5 block">
                      Tiêu chuẩn tường đôi chống nóng: 0.20m - 0.25m (200 - 250mm)
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Độ Dày Tường Ngăn Phòng (m)
                    </label>
                    <input
                      type="number"
                      step="0.02"
                      value={project.specs.interiorWallThickness}
                      onChange={(e) => handleUpdateSpec("interiorWallThickness", parseFloat(e.target.value) || 0.1)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <span className="text-[11px] text-neutral-500 mt-0.5 block">
                      Tiêu chuẩn tường đơn ngăn phòng: 0.10m (100mm)
                    </span>
                  </div>
                </div>
              </div>

              {/* Environment, Sun & Material Style */}
              <div className="border-t border-[#232730] pt-4">
                <h4 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-3">
                  Ánh Sáng Thực Tế & Phong Cách Vật Liệu
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Hướng Nhà Chính</label>
                    <select
                      value={project.specs.orientation}
                      onChange={(e) => handleUpdateSpec("orientation", e.target.value as Orientation)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="S">Hướng Nam (Đón gió mát, nắng dịu)</option>
                      <option value="SE">Hướng Đông Nam (Lý tưởng khí hậu VN)</option>
                      <option value="E">Hướng Đông (Nắng sớm bình minh)</option>
                      <option value="NE">Hướng Đông Bắc</option>
                      <option value="N">Hướng Bắc (Ánh sáng khuếch tán đều)</option>
                      <option value="SW">Hướng Tây Nam</option>
                      <option value="W">Hướng Tây (Nắng chiều hoàng hôn)</option>
                      <option value="NW">Hướng Tây Bắc</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Thời Điểm Trong Ngày</label>
                    <select
                      value={project.specs.timeOfDay}
                      onChange={(e) => handleUpdateSpec("timeOfDay", e.target.value as TimeOfDay)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="golden_hour">Hoàng Hôn / Golden Hour (Casa Serra)</option>
                      <option value="morning">Sáng Sớm (Ánh sáng tươi mát)</option>
                      <option value="noon">Trưa Nắng (Bóng đổ thẳng đứng)</option>
                      <option value="night">Ban Đêm (Đèn nội thất ấm)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Phong Cách Kiến Trúc</label>
                    <select
                      value={project.specs.style}
                      onChange={(e) => handleUpdateSpec("style", e.target.value as ArchitecturalStyle)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="casa_serra">Casa Serra Brutalist (Bê tông & Gỗ mộc)</option>
                      <option value="modern_minimal">Tối Giản Hiện Đại (Modern Minimalist)</option>
                      <option value="scandinavian">Bắc Âu Scandinavian (Ấm cúng & Sáng sủa)</option>
                      <option value="luxury_marble">Luxury Sang Trọng (Đá cẩm thạch)</option>
                      <option value="tropical">Nhiệt Đới Nghỉ Dưỡng (Tropical Resort)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Vật Liệu Sàn Cơ Bản</label>
                    <select
                      value={project.specs.baseFloorMaterial}
                      onChange={(e) => handleUpdateSpec("baseFloorMaterial", e.target.value as FloorMaterialType)}
                      className="w-full bg-[#1b1f28] border border-[#2d3340] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="concrete">Bê tông mài bóng (Polished Concrete)</option>
                      <option value="oak">Gỗ sồi tự nhiên (Natural Oak)</option>
                      <option value="marble">Đá cẩm thạch Ý (Italian Marble)</option>
                      <option value="tile">Gạch mờ kiến trúc (Matte Architectural Tile)</option>
                      <option value="dark_wood">Gỗ óc chó trầm (Dark Walnut)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROOM-BY-ROOM BREAKDOWN */}
          {activeTab === "rooms" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Bảng Bóc Tách Chi Tiết Từng Phòng ({project.rooms.length} phòng)
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Bạn có thể chỉnh sửa tên, kích thước mét [X0, Z0, X1, Z1], diện tích và vật liệu hoàn thiện từng phòng
                  </p>
                </div>
                <button
                  onClick={handleAddRoom}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>+ Thêm Phòng</span>
                </button>
              </div>

              {/* Room Cards / Rows */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {project.rooms.map((room, idx) => (
                  <div
                    key={room.id}
                    className="p-4 rounded-xl bg-[#171a21] border border-[#262b36] hover:border-[#384050] transition space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-neutral-800 text-neutral-400 text-xs font-mono flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={room.vietnameseName || room.name}
                          onChange={(e) => handleUpdateRoom(idx, "vietnameseName", e.target.value)}
                          className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-neutral-500 focus:border-amber-400 focus:outline-none text-white px-1"
                          placeholder="Tên phòng (tiếng Việt)"
                        />
                        <span className="text-xs text-neutral-500 font-mono">({room.name})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={room.category}
                          onChange={(e) => handleUpdateRoom(idx, "category", e.target.value)}
                          className="bg-[#20242e] border border-[#303644] rounded px-2 py-1 text-xs text-neutral-300"
                        >
                          <option value="living">Phòng Khách</option>
                          <option value="kitchen">Bếp & Ăn</option>
                          <option value="bedroom">Phòng Ngủ</option>
                          <option value="bath">Vệ Sinh / Spa</option>
                          <option value="outdoor">Sân Vườn / Hiên</option>
                          <option value="hallway">Sảnh / Hành Lang</option>
                          <option value="utility">Phòng Thay Đồ / Kho</option>
                          <option value="office">Phòng Làm Việc</option>
                        </select>

                        <select
                          value={room.floorMaterial || project.specs.baseFloorMaterial}
                          onChange={(e) => handleUpdateRoom(idx, "floorMaterial", e.target.value)}
                          className="bg-[#20242e] border border-[#303644] rounded px-2 py-1 text-xs text-amber-300"
                        >
                          <option value="concrete">Sàn Bê Tông</option>
                          <option value="oak">Sàn Gỗ Sồi</option>
                          <option value="marble">Sàn Đá Cẩm Thạch</option>
                          <option value="tile">Sàn Gạch Men</option>
                          <option value="gravel">Sỏi Trắng (Zen)</option>
                          <option value="grass">Cỏ Tự Nhiên</option>
                        </select>

                        <button
                          onClick={() => handleRemoveRoom(idx)}
                          className="text-neutral-500 hover:text-red-400 p-1 text-xs transition"
                          title="Xóa phòng này"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Coordinates & Area */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Tọa độ X0 (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={room.bounds[0]}
                          onChange={(e) => handleUpdateRoomBounds(idx, 0, parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-neutral-200 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Tọa độ Z0 (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={room.bounds[1]}
                          onChange={(e) => handleUpdateRoomBounds(idx, 1, parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-neutral-200 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Tọa độ X1 (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={room.bounds[2]}
                          onChange={(e) => handleUpdateRoomBounds(idx, 2, parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-neutral-200 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Tọa độ Z1 (m)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={room.bounds[3]}
                          onChange={(e) => handleUpdateRoomBounds(idx, 3, parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-neutral-200 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Diện Tích (m²)</span>
                        <input
                          type="number"
                          value={room.area}
                          onChange={(e) => handleUpdateRoom(idx, "area", parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-amber-300 font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Trần Phòng (m)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={room.ceilingHeight || project.specs.ceilingHeight}
                          onChange={(e) => handleUpdateRoom(idx, "ceilingHeight", parseFloat(e.target.value) || 3.0)}
                          className="w-full bg-[#111317] border border-[#2d3340] rounded px-2 py-1 text-neutral-200 font-mono"
                        />
                      </div>
                    </div>

                    {/* Room Description & Specs */}
                    <input
                      type="text"
                      value={room.description}
                      onChange={(e) => handleUpdateRoom(idx, "description", e.target.value)}
                      placeholder="Mô tả công năng và cảm quan kiến trúc..."
                      className="w-full bg-[#111317] border border-[#272c36] rounded px-2.5 py-1.5 text-xs text-neutral-400 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#232730] bg-[#161920]">
          <div className="text-xs text-neutral-400">
            Tổng cộng: <span className="text-white font-semibold">{project.rooms.length} phòng</span> • Quy mô: <span className="text-amber-400 font-semibold">{project.specs.totalArea} m²</span> • Trần cao: <span className="text-white font-semibold">{project.specs.ceilingHeight}m</span>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white rounded-lg transition"
              >
                Hủy bỏ
              </button>
            )}
            <button
              onClick={() => onApply(project)}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
            >
              <span>Dựng 3D Thực Tế (Casa Serra Style)</span>
              <span>➔</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
