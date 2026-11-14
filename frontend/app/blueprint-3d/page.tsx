"use client";

import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { BlueprintProject, CASA_SERRA_PRESET, NHA_LAU2_PRESET, TOWNHOUSE_PRESET, APARTMENT_PRESET, RoomSpec } from "@/lib/floorplan-types";
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

// Modal nhập bản vẽ: quét AI -> xem lại phòng -> nắn chỉnh vector 2D -> dựng 3D
const BlueprintInputModal = dynamic(() => import("@/components/blueprint/BlueprintInputModal"), { ssr: false });

const DEFAULT_BLUEPRINT_PROJECT: BlueprintProject = {
  ...CASA_SERRA_PRESET,
  name: "BẢN VẼ MẶT BẰNG 3D",
  subtitle: "MẶT BẰNG TỔNG THỂ"
};

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export default function Blueprint3DStudioPage() {
  const [project, setProject] = useState<BlueprintProject>(DEFAULT_BLUEPRINT_PROJECT);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modal nhập bản vẽ (null = đóng). Lưu project khởi tạo cho modal.
  const [inputModalProject, setInputModalProject] = useState<BlueprintProject | null>(null);

  // Scroll Progress (0 = pure 2D Blueprint, > 0.05 = 3D extrude & walkthrough)
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. FILE UPLOAD: đọc ảnh rồi mở modal để AI quét thật (không đoán theo tên file)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng một file
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    setUploadError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Chỉ hỗ trợ ảnh PNG, JPG hoặc WEBP. Với PDF/CAD, hãy xuất bản vẽ ra ảnh trước.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Ảnh lớn hơn 10MB. Vui lòng giảm dung lượng ảnh rồi thử lại.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setUploadError("Không đọc được tệp ảnh. Vui lòng thử lại.");
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setUploadedImage(b64);
      setInputModalProject({
        ...JSON.parse(JSON.stringify(project)),
        layoutData: undefined,
        name: file.name.replace(/\.[^/.]+$/, "").toUpperCase(),
        originalBlueprintUrl: b64
      });
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

  const handleApplyFromModal = (next: BlueprintProject) => {
    setProject(next);
    setInputModalProject(null);
    setScrollProgress(0); // Hiển thị bản vẽ 2D trước, cuộn để dựng 3D
  };

  // Switch Archetype Layout (mặt bằng mẫu, người dùng chủ động chọn)
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
      // Đổi khung phòng => tường AI không còn khớp, dựng lại tường theo khung phòng.
      const layoutData = updated.bounds ? undefined : prev.layoutData;
      return { ...prev, rooms: nextRooms, layoutData };
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
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
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

      {/* Lỗi tệp tải lên */}
      {uploadError && (
        <div
          data-no-scroll="true"
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-32px)] rounded-xl bg-red-50 border border-red-300 text-red-800 text-sm px-4 py-3 shadow-lg flex items-start gap-3"
        >
          <span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-800" title="Đóng">✕</button>
        </div>
      )}

      {/* MODAL NHẬP BẢN VẼ: quét AI thật + nắn chỉnh vector trước khi dựng */}
      {inputModalProject && (
        <div data-no-scroll="true">
          <BlueprintInputModal
            initialProject={inputModalProject}
            autoScan
            onApply={handleApplyFromModal}
            onClose={() => setInputModalProject(null)}
          />
        </div>
      )}
    </div>
  );
}
