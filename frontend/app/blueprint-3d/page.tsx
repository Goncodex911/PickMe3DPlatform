"use client";

import React, { useState, useRef } from "react";
import CasaSerraViewer from "@/components/blueprint/CasaSerraViewer";
import { BlueprintProject, RoomSpec, ALL_PRESETS, TOWNHOUSE_PRESET, CASA_SERRA_PRESET } from "@/lib/floorplan-types";
import { analyzeAndBuildProject } from "@/lib/floorplan-analyzer";

export default function Blueprint3DStudioPage() {
  const [project, setProject] = useState<BlueprintProject>(CASA_SERRA_PRESET);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // Progress bar states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisPercent, setAnalysisPercent] = useState<number>(0);
  const [analysisStage, setAnalysisStage] = useState<string>("");

  // Scroll Progress (0 = 2D Blueprint, 0.35+ = 3D Isometric & Room Walkthrough)
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"upload" | "specs" | "rooms">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. FILE UPLOAD HANDLER: Instant decomposition + visual progress bar
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const b64 = event.target?.result as string;
      setUploadedImage(b64);
      setIsAnalyzing(true);
      setAnalysisPercent(15);
      setAnalysisStage("Đang nạp ảnh bản vẽ và chuẩn hóa tỉ lệ không gian...");

      // Start analyzing in parallel
      const analyzePromise = analyzeAndBuildProject(b64, {
        projectName: "Bản Vẽ Thiết Kế 2D",
        style: "modern_minimal",
        useAI: true
      });

      // Guaranteed 1.8s progressive countdown
      let currentProgress = 15;
      const progressTimer = setInterval(() => {
        currentProgress += 15;
        if (currentProgress <= 45) {
          setAnalysisStage("AI Vision đang nhận diện tường chịu lực và chu vi công trình...");
        } else if (currentProgress <= 75) {
          setAnalysisStage("Đang bóc tách các không gian (Phòng khách, Bếp, 2 Phòng ngủ, WC)...");
        } else if (currentProgress < 100) {
          setAnalysisStage("Đang thiết lập lưới tọa độ 2D Blueprint và mô hình 3D...");
        } else {
          clearInterval(progressTimer);
        }
        setAnalysisPercent(Math.min(100, currentProgress));
      }, 250);

      try {
        const newProj = await analyzePromise;
        clearInterval(progressTimer);
        setAnalysisPercent(100);
        setAnalysisStage("✓ Hoàn tất! Đang mở bản vẽ 2D mới tải lên...");

        setTimeout(() => {
          setIsAnalyzing(false);
          setProject(newProj);
          setScrollProgress(0); // View in 2D blueprint first
        }, 300);
      } catch (err: any) {
        clearInterval(progressTimer);
        const fallbackProj = await analyzeAndBuildProject(b64, { useAI: false });
        setAnalysisPercent(100);
        setTimeout(() => {
          setIsAnalyzing(false);
          setProject(fallbackProj);
          setScrollProgress(0);
        }, 300);
      }
    };
    reader.readAsDataURL(file);
  };

  // 2. CHOOSE DEMO PRESET
  const handleSelectPreset = (preset: BlueprintProject) => {
    setProject(JSON.parse(JSON.stringify(preset)));
    setUploadedImage(null);
    setScrollProgress(0);
  };

  // 3. UPDATE SPECS
  const handleUpdateSpec = (field: keyof typeof project.specs, value: any) => {
    setProject((prev) => ({
      ...prev,
      specs: { ...prev.specs, [field]: value }
    }));
  };

  // 4. ROOMS EDITING
  const handleUpdateRoom = (index: number, field: keyof RoomSpec, value: any) => {
    setProject((prev) => {
      const nextRooms = [...prev.rooms];
      nextRooms[index] = { ...nextRooms[index], [field]: value };
      return { ...prev, rooms: nextRooms };
    });
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] bg-[#0c0e13] text-neutral-100 flex overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR: STUDIO CONTROLS (380px) */}
      <aside className="w-[380px] min-w-[340px] max-w-[420px] h-full bg-[#13161e] border-r border-[#242a36] flex flex-col z-20 shadow-2xl">
        
        {/* Studio Title */}
        <div className="px-5 py-4 border-b border-[#212632] bg-[#161a23] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              📐
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-white">
                Dựng 3D Bản Vẽ Kiến Trúc
              </h1>
              <p className="text-[11px] text-neutral-400">
                Nhập bản vẽ 2D ➔ Cuộn chuột để chuyển sang 3D
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
            Casa Serra Engine
          </span>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex border-b border-[#212632] bg-[#101218] px-3 gap-1">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition text-center ${
              activeTab === "upload"
                ? "border-amber-400 text-amber-300 bg-amber-400/5"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            1. Tải Bản Vẽ
          </button>
          <button
            onClick={() => setActiveTab("specs")}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition text-center ${
              activeTab === "specs"
                ? "border-amber-400 text-amber-300 bg-amber-400/5"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            2. Thông Số
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition text-center ${
              activeTab === "rooms"
                ? "border-amber-400 text-amber-300 bg-amber-400/5"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            3. Phòng ({project.rooms.length})
          </button>
        </div>

        {/* Sidebar Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* TAB 1: UPLOAD & PRESETS */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              
              {/* Dropzone */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2">
                  Tải Lên Bản Vẽ Mặt Bằng 2D
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2f3645] hover:border-amber-400/80 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-[#161a23] transition group text-center"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-amber-400/20 text-neutral-400 group-hover:text-amber-400 flex items-center justify-center text-lg mb-2 transition">
                    📁
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-amber-300">
                    Bấm để chọn ảnh bản vẽ thiết kế 2D
                  </span>
                  <span className="text-[11px] text-neutral-400 mt-0.5">
                    Hệ thống sẽ quét, nhận diện và tạo bản vẽ 2D để cuộn sang 3D
                  </span>
                </div>
              </div>

              {/* Uploaded Thumbnail */}
              {uploadedImage && (
                <div className="p-3 rounded-xl bg-[#171b24] border border-[#293140] space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-300">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      ● Đang hiển thị bản vẽ mới tải lên
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-amber-300 hover:underline text-[11px]"
                    >
                      Đổi ảnh
                    </button>
                  </div>

                  <div className="w-full h-32 rounded-lg overflow-hidden border border-[#2f3747] bg-black/60 flex items-center justify-center">
                    <img
                      src={uploadedImage}
                      alt="Bản vẽ 2D"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Presets */}
              <div className="border-t border-[#212632] pt-4">
                <label className="block text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">
                  Hoặc Xem Bản Vẽ Mẫu Chuẩn Casa Serra
                </label>
                <div className="space-y-2">
                  {ALL_PRESETS.map((p) => {
                    const isSelected = project.id === p.id && !uploadedImage;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-400 text-white"
                            : "bg-[#151922] border-[#252b37] hover:border-neutral-500 text-neutral-300"
                        }`}
                      >
                        <div>
                          <h4 className="text-xs font-semibold text-white">{p.name}</h4>
                          <span className="text-[11px] text-neutral-400 block">{p.subtitle}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-400 block font-mono">{p.specs.totalArea} m²</span>
                          <span className="text-[10px] text-neutral-500">{p.rooms.length} phòng</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SPECS */}
          {activeTab === "specs" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Tên Công Trình / Dự Án</label>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => setProject({ ...project, name: e.target.value })}
                  className="w-full bg-[#1a1f29] border border-[#2b3343] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Chiều Rộng (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={project.specs.width}
                    onChange={(e) => handleUpdateSpec("width", parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#1a1f29] border border-[#2b3343] rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Chiều Dài (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={project.specs.length}
                    onChange={(e) => handleUpdateSpec("length", parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#1a1f29] border border-[#2b3343] rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Tổng Diện Tích (m²)</label>
                  <input
                    type="number"
                    value={project.specs.totalArea}
                    onChange={(e) => handleUpdateSpec("totalArea", parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#1a1f29] border border-[#2b3343] rounded-lg px-3 py-2 text-amber-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Chiều Cao Trần (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={project.specs.ceilingHeight}
                    onChange={(e) => handleUpdateSpec("ceilingHeight", parseFloat(e.target.value) || 3.0)}
                    className="w-full bg-[#1a1f29] border border-[#2b3343] rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Phong Cách Hoàn Thiện</label>
                <select
                  value={project.specs.style}
                  onChange={(e) => handleUpdateSpec("style", e.target.value)}
                  className="w-full bg-[#1a1f29] border border-[#2b3343] rounded-lg px-3 py-2 text-white"
                >
                  <option value="modern_minimal">Hiện đại tối giản (Modern Minimal)</option>
                  <option value="scandinavian">Bắc Âu gỗ sồi (Scandinavian)</option>
                  <option value="luxury_marble">Luxury đá cẩm thạch (Luxury Marble)</option>
                  <option value="casa_serra">Casa Serra Bê tông mộc (Brutalist)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: ROOMS */}
          {activeTab === "rooms" && (
            <div className="space-y-3">
              <span className="text-xs text-neutral-400 block mb-1">
                Danh Sách Các Phòng ({project.rooms.length} phòng)
              </span>

              <div className="space-y-2">
                {project.rooms.map((room, idx) => (
                  <div
                    key={room.id}
                    className="p-3 rounded-xl bg-[#151922] border border-[#252b37] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={room.vietnameseName || room.name}
                        onChange={(e) => handleUpdateRoom(idx, "vietnameseName", e.target.value)}
                        className="font-bold text-white bg-transparent border-b border-transparent focus:border-amber-400 focus:outline-none"
                      />
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {room.area} m²
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <select
                        value={room.category}
                        onChange={(e) => handleUpdateRoom(idx, "category", e.target.value)}
                        className="bg-[#10131a] border border-[#272e3d] rounded px-2 py-1 text-neutral-300"
                      >
                        <option value="living">Phòng Khách</option>
                        <option value="kitchen">Bếp & Ăn</option>
                        <option value="bedroom">Phòng Ngủ</option>
                        <option value="bath">Vệ Sinh</option>
                        <option value="outdoor">Sân Vườn</option>
                        <option value="hallway">Hành Lang</option>
                      </select>

                      <select
                        value={room.floorMaterial || "marble"}
                        onChange={(e) => handleUpdateRoom(idx, "floorMaterial", e.target.value)}
                        className="bg-[#10131a] border border-[#272e3d] rounded px-2 py-1 text-amber-300"
                      >
                        <option value="marble">Sàn Đá Marble</option>
                        <option value="oak">Sàn Gỗ Sồi</option>
                        <option value="concrete">Sàn Bê Tông</option>
                        <option value="tile">Sàn Gạch</option>
                        <option value="grass">Thảm Cỏ</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#212632] bg-[#101218] text-[11px] text-neutral-400 flex items-center justify-between">
          <span>Quy mô: <strong className="text-white">{project.specs.totalArea} m²</strong></span>
          <span>Phòng: <strong className="text-amber-400">{project.rooms.length} phòng</strong></span>
        </div>

      </aside>

      {/* RIGHT MAIN VIEWPORT: CASA SERRA 2D ➔ 3D SCROLL VIEWER */}
      <main className="flex-1 relative h-full overflow-hidden bg-[#0c0e13]">
        <CasaSerraViewer
          project={project}
          scrollProgress={scrollProgress}
          onScrollProgressChange={(p) => setScrollProgress(p)}
        />
      </main>

      {/* ANALYSIS PROGRESS OVERLAY MODAL */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-[#141822] border border-[#2b3344] p-6 shadow-2xl text-center space-y-5 animate-in fade-in duration-200">
            <button
              onClick={() => setIsAnalyzing(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 text-sm rounded-lg hover:bg-neutral-800 transition"
              title="Đóng tiến trình"
            >
              ✕
            </button>
            
            {/* Radar Scanning Icon Animation */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-amber-400/40 animate-pulse" />
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-400/60 flex items-center justify-center text-amber-400 text-2xl font-bold">
                📐
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Đang Phân Tích Bản Vẽ 2D
              </h3>
              <p className="text-xs text-neutral-400 min-h-[36px]">
                {analysisStage}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-neutral-400">Tiến trình</span>
                <span className="text-amber-400">{analysisPercent}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#202634] overflow-hidden p-0.5 border border-[#2c3548]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-150"
                  style={{ width: `${analysisPercent}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-neutral-500">
              Sau khi phân tích xong, bản vẽ 2D sẽ hiện lên. Bạn chỉ cần cuộn chuột để dựng 3D và khám phá!
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
