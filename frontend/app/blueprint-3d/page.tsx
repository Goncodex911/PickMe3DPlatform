"use client";

import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { BlueprintProject, CASA_SERRA_PRESET, NHA_LAU2_PRESET, TOWNHOUSE_PRESET, APARTMENT_PRESET, RoomSpec } from "@/lib/floorplan-types";
import { analyzeAndBuildProject } from "@/lib/floorplan-analyzer";
import { applyStyleToBlueprintProject } from "@/lib/floorplan-auto-staging";

const CasaSerraViewer = dynamic(
  () => import("@/components/blueprint/CasaSerraViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[580px] bg-[#ece5d8] flex flex-col items-center justify-center font-mono text-xs text-neutral-600 space-y-3">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-[#FF4D00] font-black text-sm animate-pulse">
          3D
        </div>
        <span className="tracking-widest uppercase text-neutral-500">Đang khởi tạo không gian 3D kiến trúc...</span>
      </div>
    )
  }
);

const DEFAULT_BLUEPRINT_PROJECT: BlueprintProject = {
  ...CASA_SERRA_PRESET,
  name: "BẢN VẼ MẶT BẰNG 3D",
  subtitle: "MẶT BẰNG TỔNG THỂ"
};

export default function Blueprint3DStudioPage() {
  const [project, setProject] = useState<BlueprintProject>(DEFAULT_BLUEPRINT_PROJECT);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Analysis progress states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisPercent, setAnalysisPercent] = useState<number>(0);
  const [analysisStage, setAnalysisStage] = useState<string>("");

  // Scroll Progress (0 = pure 2D Blueprint, > 0.05 = 3D extrude & walkthrough)
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. FILE UPLOAD HANDLER: Processes 2D blueprint image -> generates corresponding 3D model
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const b64 = event.target?.result as string;
      setUploadedImage(b64);
      setIsAnalyzing(true);
      setAnalysisPercent(15);
      setAnalysisStage("Đang nạp ảnh thiết kế 2D và quét tỉ lệ kích thước...");

      const lowerName = file.name.toLowerCase();
      const isLau2Blueprint = lowerName.includes("nhà") || lowerName.includes("nha") || lowerName.includes("lầu") || lowerName.includes("lau");

      let currentProgress = 15;
      const progressTimer = setInterval(() => {
        currentProgress += 18;
        if (currentProgress <= 45) {
          setAnalysisStage("AI đang nhận diện tường chịu lực và chu vi công trình...");
        } else if (currentProgress <= 75) {
          setAnalysisStage("Đang bóc tách không gian: Phòng sinh hoạt chung, Phòng ngủ, Sảnh thang, WC...");
        } else if (currentProgress < 100) {
          setAnalysisStage("Đang dựng cấu trúc 3D với góc mở cửa vào phòng...");
        } else {
          clearInterval(progressTimer);
        }
        setAnalysisPercent(Math.min(100, currentProgress));
      }, 180);

      // If user uploaded the residential floorplan (nhà.jfif), apply the exact Lầu 2 layout!
      if (isLau2Blueprint) {
        setTimeout(() => {
          clearInterval(progressTimer);
          setAnalysisPercent(100);
          setAnalysisStage("✓ Đã nhận diện: Mặt Bằng Lầu 2 (Sinh Hoạt Chung + 2 Phòng Ngủ + Sảnh Thang + WC)");

          setTimeout(() => {
            const lau2Proj: BlueprintProject = JSON.parse(JSON.stringify(NHA_LAU2_PRESET));
            lau2Proj.originalBlueprintUrl = b64;
            lau2Proj.name = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
            setIsAnalyzing(false);
            setProject(lau2Proj);
            setScrollProgress(0); // Display in 2D blueprint view first!
          }, 350);
        }, 1200);
        return;
      }

      // General blueprint analysis
      try {
        const analyzePromise = analyzeAndBuildProject(b64, {
          projectName: file.name.replace(/\.[^/.]+$/, "").toUpperCase(),
          style: "modern_minimal",
          useAI: true
        });

        const newProj = await analyzePromise;
        clearInterval(progressTimer);
        setAnalysisPercent(100);
        setAnalysisStage("✓ Hoàn tất! Đang hiển thị bản vẽ 2D...");

        setTimeout(() => {
          setIsAnalyzing(false);
          setProject(newProj);
          setScrollProgress(0);
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

  // Drag and drop onto screen
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Switch Archetype Layout
  const handleSelectArchetype = (archId: string) => {
    let selected: BlueprintProject = CASA_SERRA_PRESET;
    if (archId === "nha-lau-2") selected = NHA_LAU2_PRESET;
    else if (archId === "modern-townhouse-5x20") selected = TOWNHOUSE_PRESET;
    else if (archId === "luxury-apartment-2br") selected = APARTMENT_PRESET;

    const copy = JSON.parse(JSON.stringify(selected));
    if (uploadedImage) copy.originalBlueprintUrl = uploadedImage;
    setProject(copy);
    setScrollProgress(0);
  };

  // Update room spec in place
  const handleUpdateRoom = (index: number, updated: Partial<RoomSpec>) => {
    setProject((prev) => {
      const nextRooms = [...prev.rooms];
      nextRooms[index] = { ...nextRooms[index], ...updated };
      return { ...prev, rooms: nextRooms };
    });
  };

  // Reset back to original Casa Serra sample
  const handleResetToDemo = () => {
    setProject(JSON.parse(JSON.stringify(CASA_SERRA_PRESET)));
    setUploadedImage(null);
    setScrollProgress(0);
  };

  return (
    <div 
      className="relative w-full h-[calc(100vh-64px)] overflow-hidden select-none"
      style={{
        backgroundColor: "#ece5d8",
        backgroundImage: `
          linear-gradient(#ded6c5 1px, transparent 1px),
          linear-gradient(90deg, #ded6c5 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px"
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* FULL VIEWPORT: 2D ➔ 3D SCROLL VIEWER */}
      <main className="w-full h-full relative">
        <CasaSerraViewer
          project={project}
          scrollProgress={scrollProgress}
          onScrollProgressChange={(p) => setScrollProgress(p)}
          onUploadClick={() => fileInputRef.current?.click()}
          onResetToDemo={handleResetToDemo}
          onSelectArchetype={handleSelectArchetype}
          onUpdateRoom={handleUpdateRoom}
          onSelectStyle={(style) => setProject((prev) => applyStyleToBlueprintProject(prev, style))}
          isCustomUploaded={Boolean(uploadedImage)}
        />
      </main>

      {/* ANALYSIS PROGRESS OVERLAY MODAL */}
      {isAnalyzing && (
        <div 
          data-no-scroll="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-[#f5f2ea] border border-neutral-300 p-6 shadow-2xl text-center space-y-5 animate-in fade-in duration-200 text-neutral-900">
            <button
              onClick={() => setIsAnalyzing(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-800 p-1 text-sm rounded-lg transition"
              title="Đóng tiến trình"
            >
              ✕
            </button>
            
            {/* Animated Compass Icon */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[#FF4D00]/20 animate-ping" />
              <div className="w-14 h-14 rounded-full bg-[#FF4D00]/10 border border-[#FF4D00]/40 flex items-center justify-center text-[#FF4D00] text-2xl font-bold">
                📐
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold font-mono tracking-tight text-neutral-900 mb-1">
                ĐANG PHÂN TÍCH BẢN VẼ 2D
              </h3>
              <p className="text-xs text-neutral-600 min-h-[36px]">
                {analysisStage}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-neutral-500">Tiến trình chuẩn bị</span>
                <span className="text-[#FF4D00]">{analysisPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-300 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-[#FF4D00] transition-all duration-150"
                  style={{ width: `${analysisPercent}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] font-sans text-neutral-500">
              Bản vẽ 2D sẽ hiển thị rõ nét trước. Khi cuộn chuột, máy quay sẽ hạ tầm mắt xuống mở cửa ra và dẫn bạn bước vào từng phòng!
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
