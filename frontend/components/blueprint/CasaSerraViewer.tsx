"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { BlueprintProject, RoomSpec, convertBlueprintProjectToLayoutData } from "@/lib/floorplan-types";
import { exportLayoutDataToGLB } from "@/lib/floorplan-glb-exporter";
import { cleanupThreeScene } from "@/lib/three-cleanup";
import { createPhotorealisticMaterialLibrary } from "@/lib/floorplan-materials";
import { buildProceduralRoomFurniture } from "@/lib/blueprint-scene/proceduralFurniture";
import { buildExteriorLandscape, resolvePoolRect } from "@/lib/blueprint-scene/landscape";
import { placeLayoutFurniture } from "@/lib/blueprint-scene/furnitureAssets";
import { requestAIRender } from "@/lib/blueprint-scene/aiRenderClient";
import {
  createDefaultArchitecturalMaterials,
  createFloorPolygonGeometry,
  generateWallSegmentMeshes,
  isAxisAlignedRectangle
} from "@/lib/floorplan-mesh-generator";
import FloorLayerToolbar, { CameraMode, RailPanel } from "./FloorLayerToolbar";
import AIRenderPreviewModal from "./AIRenderPreviewModal";
import { SYSTEM_STYLE_PRESETS } from "@/lib/floorplan-auto-staging";
import { ArchitecturalStyle } from "@/lib/floorplan-types";

interface CasaSerraViewerProps {
  project: BlueprintProject;
  scrollProgress: number; // 0 (2D) to 1 (full 3D tour)
  onScrollProgressChange: (progress: number) => void;
  onUploadClick?: () => void;
  onResetToDemo?: () => void;
  onSelectArchetype?: (archId: string) => void;
  onUpdateRoom?: (index: number, updated: Partial<RoomSpec>) => void;
  onSelectStyle?: (style: ArchitecturalStyle) => void;
  isCustomUploaded?: boolean;
}

interface CameraWaypoint {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

// 0. GENERATE AUTHENTIC ARCHITECTURAL DRAFTING MAT TEXTURE (Drafting Table Grid & Precision Crosses)
function createDraftingMatTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    return new THREE.CanvasTexture({} as any);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Warm drafting table cutting mat base #ece5d8 (exact match to Image 3)
  ctx.fillStyle = "#ece5d8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle minor drafting grid (32px step)
  ctx.strokeStyle = "#ded6c5";
  ctx.lineWidth = 1;
  const step = 32;
  for (let x = 0; x <= canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Major architectural grid lines (160px step) with precision cross marks
  ctx.strokeStyle = "#cdbfab";
  ctx.lineWidth = 1.5;
  const majorStep = 160;
  for (let x = 0; x <= canvas.width; x += majorStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += majorStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Precision crosses at intersections
  ctx.strokeStyle = "#b5a690";
  ctx.lineWidth = 2;
  for (let x = 0; x <= canvas.width; x += majorStep) {
    for (let y = 0; y <= canvas.height; y += majorStep) {
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.needsUpdate = true;
  return texture;
}

// 0. GENERATE RICH ARCHITECTURAL DRAFTING BOARD TEXTURE (Exact Match to Image 3 Blueprint Maquette)
function createArchitecturalBoardTexture(project: BlueprintProject): THREE.Texture {
  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    return new THREE.Texture();
  }

  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1536;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Warm ivory drafting paper background
  ctx.fillStyle = "#faf7f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Fine paper drafting grid
  ctx.strokeStyle = "#eee7db";
  ctx.lineWidth = 1;
  const step = 32;
  for (let x = 0; x < canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // 3. Technical Borders (Crisp, deep black architectural borders)
  ctx.strokeStyle = "#1a1918";
  ctx.lineWidth = 4;
  ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

  ctx.strokeStyle = "#3d3a36";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(62, 62, canvas.width - 124, canvas.height - 124);

  // Dimension labels
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillStyle = "#4a4641";
  ctx.fillText("Trục 1 - 4 : 24.000 m", 80, 42);
  ctx.fillText("Trục A - D : 14.200 m", canvas.width - 290, 42);
  ctx.fillText("Trục Cửa Trượt: Kính Low-E 3 Lớp", 80, canvas.height - 24);
  ctx.fillText("Cao độ sàn hoàn thiện: ±0.000", canvas.width - 340, canvas.height - 24);

  // Helper for drawing room cards exactly matching Image 3
  const drawRoom = (
    rx: number, ry: number, rw: number, rh: number,
    num: string, title: string, subtitle: string, area: string,
    items: { label: string; x: number; y: number; w: number; h: number; isOval?: boolean; isHatch?: boolean }[]
  ) => {
    // Room boundary
    ctx.strokeStyle = "#1a1918";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(rx, ry, rw, rh);

    // Header bar
    ctx.fillStyle = "#ede6d8";
    ctx.fillRect(rx + 2, ry + 2, rw - 4, 38);
    ctx.strokeStyle = "#1a1918";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx, ry + 40);
    ctx.lineTo(rx + rw, ry + 40);
    ctx.stroke();

    // Title
    ctx.fillStyle = "#181716";
    ctx.font = "bold 20px 'Courier New', sans-serif";
    ctx.fillText(`${num}. ${title}`, rx + 16, ry + 27);

    // Area tag (Rust Terracotta #b85434)
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillStyle = "#b85434";
    ctx.fillText(area, rx + rw - 80, ry + 26);

    // Subtitle
    if (subtitle) {
      ctx.font = "italic 14px Georgia, serif";
      ctx.fillStyle = "#55504a";
      ctx.fillText(subtitle, rx + 16, ry + 64);
    }

    // Furniture boxes
    items.forEach((item) => {
      ctx.strokeStyle = "#2e2b28";
      ctx.lineWidth = 1.5;
      ctx.fillStyle = "#ffffff";

      if (item.isHatch) {
        // Teak wood deck hatching
        ctx.fillStyle = "#f5eee4";
        ctx.fillRect(item.x, item.y, item.w, item.h);
        ctx.strokeRect(item.x, item.y, item.w, item.h);
        ctx.strokeStyle = "#cfc4b2";
        ctx.lineWidth = 1;
        for (let dy = item.y + 16; dy < item.y + item.h; dy += 18) {
          ctx.beginPath();
          ctx.moveTo(item.x, dy);
          ctx.lineTo(item.x + item.w, dy);
          ctx.stroke();
        }
      } else if (item.isOval) {
        ctx.beginPath();
        ctx.ellipse(item.x + item.w / 2, item.y + item.h / 2, item.w / 2, item.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeRect(item.x, item.y, item.w, item.h);
      }

      ctx.fillStyle = "#1e1d1b";
      ctx.font = "bold 12px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.label, item.x + item.w / 2, item.y + item.h / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    });
  };

  // ROOM 01: PHÒNG NGỦ MASTER (Top Left)
  drawRoom(80, 80, 880, 640, "01", "PHÒNG NGỦ MASTER", "Nội thất gỗ sồi mộc tự nhiên • Cửa sổ kính lớn", "34.8 m²", [
    { label: "Giường Kingsize", x: 340, y: 260, w: 280, h: 220 },
    { label: "Gỗ Sồi Tự Nhiên", x: 380, y: 540, w: 200, h: 44 }
  ]);

  // ROOM 02: ĐẠI SẢNH & PHÒNG KHÁCH (Top Right)
  drawRoom(1000, 80, 960, 640, "02", "ĐẠI SẢNH & PHÒNG KHÁCH", "Phòng Khách Panoramic - Cửa sổ Kính Lớn", "42.5 m²", [
    { label: "Sofa Dài Mây", x: 1120, y: 320, w: 240, h: 100 },
    { label: "Bàn Trà Travertine", x: 1420, y: 330, w: 160, h: 80, isOval: true },
    { label: "Wall Lounge", x: 1640, y: 310, w: 200, h: 120 }
  ]);

  // ROOM 03: BẾP ĐẢO & DINING (Bottom Left)
  drawRoom(80, 760, 880, 640, "03", "BẾP ĐẢO & DINING", "Bàn đảo đá Sa Thạch • Hệ tủ âm tường 600mm", "36.2 m²", [
    { label: "Bàn Bếp Marble Đá Sa Thạch", x: 220, y: 920, w: 580, h: 120 },
    { label: "Hệ Tủ Âm Tường 600mm", x: 280, y: 1140, w: 460, h: 70 }
  ]);

  // ROOM 04: SÂN TRONG & VƯỜN ZEN (Bottom Right)
  drawRoom(1000, 760, 960, 640, "04", "SÂN TRONG & VƯỜN ZEN", "Trục Cửa Trượt: Kính Low-E 2 Lớp • Cây Ô Lâu", "28.0 m²", [
    { label: "Sàn Deck Gỗ Teak Tự Nhiên", x: 1140, y: 920, w: 680, h: 260, isHatch: true }
  ]);

  // Technical Stamp Box in bottom-right
  ctx.strokeStyle = "#1a1918";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1540, 1370, 420, 80);
  ctx.fillStyle = "#1a1918";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillText("HỒ SƠ THI CÔNG | CĂN HỘ DUPLEX 9 PHÒNG", 1555, 1392);
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillStyle = "#4a4641";
  ctx.fillText("TỶ LỆ: 1:50 | BẢN VẼ: A-101 REV D", 1555, 1414);
  ctx.font = "bold 10px 'Courier New', monospace";
  ctx.fillStyle = "#b85434";
  ctx.fillText("KIẾN TRÚC SƯ: GON MARCUS [APPROVED]", 1555, 1436);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function CasaSerraViewer({
  project,
  scrollProgress,
  onScrollProgressChange,
  onUploadClick,
  onResetToDemo,
  onSelectArchetype,
  onUpdateRoom,
  onSelectStyle,
  isCustomUploaded = false,
}: CasaSerraViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Stale-closure prevention ref
  const scrollProgressRef = useRef<number>(scrollProgress);
  useEffect(() => {
    scrollProgressRef.current = scrollProgress;
  }, [scrollProgress]);

  const [activeRoomIndex, setActiveRoomIndex] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isEditingRoom, setIsEditingRoom] = useState<boolean>(false);
  const [isExportingGLB, setIsExportingGLB] = useState<boolean>(false);

  // Layer & Camera Controls (Phase 4 Story 4.2)
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  // Bảng mở rộng đang mở của thanh công cụ dọc bên trái (null = đóng hết)
  const [openRailPanel, setOpenRailPanel] = useState<RailPanel | null>(null);
  useEffect(() => {
    if (!openRailPanel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenRailPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openRailPanel]);
  const [showCeilings, setShowCeilings] = useState<boolean>(true);
  const [showWalls, setShowWalls] = useState<boolean>(true);
  const [showFurniture, setShowFurniture] = useState<boolean>(true);
  const [showLandscape, setShowLandscape] = useState<boolean>(true);
  const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);

  const cameraModeRef = useRef<CameraMode>("orbit");
  const showCeilingsRef = useRef<boolean>(true);
  const showWallsRef = useRef<boolean>(true);
  const showFurnitureRef = useRef<boolean>(true);
  const showLandscapeRef = useRef<boolean>(true);
  const isRulerActiveRef = useRef<boolean>(false);

  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);
  useEffect(() => { showCeilingsRef.current = showCeilings; }, [showCeilings]);
  useEffect(() => { showWallsRef.current = showWalls; }, [showWalls]);
  useEffect(() => { showFurnitureRef.current = showFurniture; }, [showFurniture]);
  useEffect(() => { showLandscapeRef.current = showLandscape; }, [showLandscape]);
  useEffect(() => { isRulerActiveRef.current = isRulerActive; }, [isRulerActive]);

  // 3D Measurement Ruler references
  const rulerGroupRef = useRef<THREE.Group | null>(null);
  const rulerPointsRef = useRef<THREE.Vector3[]>([]);
  const rulerMarkersRef = useRef<THREE.Mesh[]>([]);
  const rulerLineRef = useRef<THREE.Line | null>(null);

  const clearMeasurement = useCallback(() => {
    if (rulerGroupRef.current) {
      rulerGroupRef.current.clear();
    }
    rulerMarkersRef.current = [];
    rulerLineRef.current = null;
    rulerPointsRef.current = [];
    setMeasuredDistance(null);
  }, []);

  // First-person walkthrough keyboard listeners
  const keysDown = useRef<Record<string, boolean>>({});
  const walkPos = useRef(new THREE.Vector3(0, 1.65, 0));
  const fpsAngles = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Story 6.2: Dollhouse clipping plane at Y = 1.5m
  const dollhouseClipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.5), []);
  const dollhouseCapGroupRef = useRef<THREE.Group | null>(null);
  const wallMaterialsRef = useRef<THREE.Material[]>([]);
  const composerRef = useRef<EffectComposer | null>(null);
  const ssaoPassRef = useRef<SSAOPass | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  // Story 7.3: 1-Click AI Render 4K (ControlNet Depth)
  const [isAIRenderModalOpen, setIsAIRenderModalOpen] = useState<boolean>(false);
  const [isAIRendering, setIsAIRendering] = useState<boolean>(false);
  const [renderOriginalSnapshot, setRenderOriginalSnapshot] = useState<string | null>(null);
  const [renderResultUrl, setRenderResultUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderResolution, setRenderResolution] = useState<string | null>(null);
  const [renderModel, setRenderModel] = useState<string | null>(null);
  const [renderStage, setRenderStage] = useState<string | null>(null);
  const [renderEnhancedPrompt, setRenderEnhancedPrompt] = useState<string | undefined>(undefined);
  const [renderExecutionTimeMs, setRenderExecutionTimeMs] = useState<number | undefined>(undefined);

  const handleTriggerAIRender = useCallback(async () => {
    if (!rendererRef.current) return;
    try {
      setIsAIRendering(true);
      setRenderError(null);
      setRenderResultUrl(null);
      setRenderStage("Đang chụp khung nhìn 3D...");
      setIsAIRenderModalOpen(true);

      // Force a synchronous render pass to make sure the drawing buffer is up-to-date
      if (composerRef.current) {
        composerRef.current.render();
      } else if (sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      const snapshotDataUrl = rendererRef.current.domElement.toDataURL("image/png");
      setRenderOriginalSnapshot(snapshotDataUrl);

      // Gửi bản JPEG (nhẹ hơn PNG nhiều lần) cho Gemini image model qua hàng đợi backend
      const uploadDataUrl = rendererRef.current.domElement.toDataURL("image/jpeg", 0.92);
      const result = await requestAIRender({
        snapshotDataUrl: uploadDataUrl,
        style: project.specs.style || "casa_serra",
        customPrompt: `Architectural rendering of ${project.name}`,
        onProgress: (_progress, stage) => setRenderStage(stage)
      });

      setRenderResolution(result.resolution || null);
      setRenderModel(result.model || null);
      setRenderResultUrl(result.renderUrl);
      setRenderEnhancedPrompt(result.enhancedPrompt);
      setRenderExecutionTimeMs(result.executionTimeMs);
    } catch (err: any) {
      // Báo lỗi thật, không hiển thị ảnh chụp như thể đã render thành công.
      console.warn("AI render error:", err?.message);
      setRenderError(err?.message || "Lỗi AI render");
    } finally {
      setIsAIRendering(false);
    }
  }, [project]);

  const handleExportGLB = async () => {
    setIsExportingGLB(true);
    try {
      const layoutData = project.layoutData ?? convertBlueprintProjectToLayoutData(project);
      const result = await exportLayoutDataToGLB(layoutData, { autoDownload: true, draco: true });
      if (result.dracoError) {
        alert(`Đã tải file GLB chưa nén (${result.sizeKb} KB) vì không nén Draco được: ${result.dracoError}.`);
      }
    } catch (err) {
      console.error("Failed to export GLB:", err);
      alert("Không thể xuất file 3D .GLB. Vui lòng thử lại!");
    } finally {
      setIsExportingGLB(false);
    }
  };

  // Three.js Core References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const wallGroupRef = useRef<THREE.Group | null>(null);
  const ceilingGroupRef = useRef<THREE.Group | null>(null);
  const floorGroupRef = useRef<THREE.Group | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const landscapeGroupRef = useRef<THREE.Group | null>(null);
  const doorPivotRef = useRef<THREE.Group | null>(null);
  const blueprintMeshRef = useRef<THREE.Mesh | null>(null);
  const sheetsGroupRef = useRef<THREE.Group | null>(null);
  const bottomSheetRef = useRef<THREE.Mesh | null>(null);
  const middleSheetRef = useRef<THREE.Mesh | null>(null);
  const topSheetGroupRef = useRef<THREE.Group | null>(null);
  const roomFloorsRef = useRef<THREE.Mesh[]>([]);
  const roomInkMeshesRef = useRef<{ mesh: THREE.Mesh; roomId: string }[]>([]);
  const fireLightRef = useRef<THREE.PointLight | null>(null);
  const interiorLightsRef = useRef<{ light: THREE.Light; baseIntensity: number }[]>([]);
  const sunRef = useRef<THREE.DirectionalLight | null>(null);
  const progressAnimRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Smooth camera vectors (Initial Axonometric Framing exact match to Image 3)
  const currentCamPos = useRef(new THREE.Vector3(14.0, 17.5, 19.5));
  const targetCamPos = useRef(new THREE.Vector3(14.0, 17.5, 19.5));
  const currentCamLook = useRef(new THREE.Vector3(1.6, 0.2, 0));
  const targetCamLook = useRef(new THREE.Vector3(1.6, 0.2, 0));

  // Interactive mouse look-around offset (when dragging or looking around inside room)
  const lookOffset = useRef({ yaw: 0, pitch: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const isCasaSerra = project.id === "casa-serra-original";
  const activeRoom = project.rooms[activeRoomIndex] || project.rooms[0];

  // Helper to update progress and determine active room index
  const updateProgress = (newProg: number) => {
    const clamped = Math.max(0, Math.min(1, newProg));
    scrollProgressRef.current = clamped;
    onScrollProgressChange(clamped);

    if (clamped <= 0.28) {
      setActiveRoomIndex(0);
    } else if (clamped >= 0.88) {
      setActiveRoomIndex(project.rooms.length - 1);
    } else {
      const tourProgress = (clamped - 0.28) / 0.60;
      const floatIdx = tourProgress * (project.rooms.length - 1);
      const roomIdx = Math.max(0, Math.min(project.rooms.length - 1, Math.round(floatIdx)));
      setActiveRoomIndex(roomIdx);
    }
  };

  // Smooth progress animation helper (cubic easeInOut)
  const animateProgressTo = useCallback((target: number, durationMs: number = 750) => {
    if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
    const start = scrollProgressRef.current;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const ease = t * t * (3 - 2 * t);
      const current = start + (target - start) * ease;
      updateProgress(current);
      if (t < 1) {
        progressAnimRef.current = requestAnimationFrame(step);
      } else {
        progressAnimRef.current = null;
      }
    };
    progressAnimRef.current = requestAnimationFrame(step);
  }, []);

  const handleCameraModeChange = (mode: CameraMode) => {
    setCameraMode(mode);
    const isDollhouse = mode === "dollhouse";

    // Update clipping planes on walls & openings for 1.5m cutaway (STORY-THUAN-BP12)
    wallMaterialsRef.current.forEach((mat) => {
      mat.clippingPlanes = isDollhouse ? [dollhouseClipPlane] : [];
      mat.clipShadows = true;
      mat.needsUpdate = true;
    });

    if (dollhouseCapGroupRef.current) {
      dollhouseCapGroupRef.current.visible = isDollhouse;
    }

    if (ceilingGroupRef.current) {
      ceilingGroupRef.current.visible = !isDollhouse && showCeilingsRef.current;
    }

    if (mode === "dollhouse") {
      // If user is in 2D, smoothly advance to 3D so walls and interior appear immediately!
      if (scrollProgressRef.current < 0.25) {
        animateProgressTo(0.45);
      }
      const bW = project.specs.width || 14;
      const bL = project.specs.length || 12;
      const maxDim = Math.max(bW, bL, 14);
      const altitude = (maxDim * 0.95) / zoomScale;
      targetCamPos.current.set(bW * 0.75, altitude, bL * 0.9);
      targetCamLook.current.set(0, 0.4, 0);
    } else if (mode === "orbit") {
      if (scrollProgressRef.current < 0.25) {
        animateProgressTo(0.50);
      }
    } else if (mode === "walkthrough") {
      if (scrollProgressRef.current < 0.4) {
        animateProgressTo(0.85);
      }
      walkPos.current.set(currentCamPos.current.x, 1.65, currentCamPos.current.z);
      fpsAngles.current.yaw = lookOffset.current.yaw;
      fpsAngles.current.pitch = lookOffset.current.pitch;
    } else if (mode === "top_down") {
      animateProgressTo(0.0);
      lookOffset.current = { yaw: 0, pitch: 0 };
    }
  };

  // Quick style change handler
  const handleSelectStyle = (style: ArchitecturalStyle) => {
    if (onSelectStyle) {
      onSelectStyle(style);
    }
  };

  // Wireframe toggle effect
  useEffect(() => {
    wallMaterialsRef.current.forEach((mat) => {
      (mat as any).wireframe = isWireframe;
      mat.needsUpdate = true;
    });
  }, [isWireframe]);

  // 1. GLOBAL WINDOW WHEEL LISTENER (Buttery-smooth continuous momentum scrolling)
  useEffect(() => {
    let scrollVel = 0;
    let targetProg = scrollProgressRef.current;
    let animId: number | null = null;

    const smoothStep = () => {
      if (Math.abs(scrollVel) > 0.00001 || Math.abs(targetProg - scrollProgressRef.current) > 0.0001) {
        targetProg += scrollVel;
        targetProg = Math.max(0, Math.min(1, targetProg));
        scrollVel *= 0.82; // gentle exponential decay

        const current = scrollProgressRef.current;
        const next = current + (targetProg - current) * 0.16; // soft progressive damping
        updateProgress(next);

        animId = requestAnimationFrame(smoothStep);
      } else {
        scrollVel = 0;
        animId = null;
      }
    };

    const handleGlobalWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest("[data-no-scroll]")) return;

      e.preventDefault();
      // Gentle delta: ~0.00030 per mouse notch, clamped to avoid sudden jumps
      const clampedDelta = Math.max(-100, Math.min(100, e.deltaY));
      const delta = clampedDelta * 0.00030;
      scrollVel += delta;

      if (!animId) {
        animId = requestAnimationFrame(smoothStep);
      }
    };

    window.addEventListener("wheel", handleGlobalWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleGlobalWheel);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [project]);

  // 2. MOUSE DRAG LOOK-AROUND & 3D RULER CLICK
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let hasDragged = false;

    const onMouseDown = (e: MouseEvent) => {
      if (scrollProgressRef.current <= 0.15 && cameraModeRef.current === "orbit") return;
      isDragging.current = true;
      hasDragged = false;
      dragStart.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged = true;
      }
      dragStart.current = { x: e.clientX, y: e.clientY };

      if (cameraModeRef.current === "walkthrough") {
        fpsAngles.current.yaw -= dx * 0.0035;
        fpsAngles.current.pitch = Math.max(-1.3, Math.min(1.3, fpsAngles.current.pitch - dy * 0.003));
      } else {
        lookOffset.current.yaw -= dx * 0.004;
        lookOffset.current.pitch = Math.max(-0.65, Math.min(0.65, lookOffset.current.pitch - dy * 0.003));
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onContainerClick = (e: MouseEvent) => {
      if (hasDragged) return; // Prevent placing measurement point when dragging view
      if (!isRulerActiveRef.current || !containerRef.current || !cameraRef.current || !rulerGroupRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const targets: THREE.Object3D[] = [];
      if (wallGroupRef.current) targets.push(wallGroupRef.current);
      if (floorGroupRef.current) targets.push(floorGroupRef.current);

      const intersects = raycaster.intersectObjects(targets, true);
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;

        if (rulerPointsRef.current.length >= 2) {
          clearMeasurement();
        }

        const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.copy(hitPoint);
        rulerGroupRef.current.add(sphere);
        rulerMarkersRef.current.push(sphere);

        rulerPointsRef.current.push(hitPoint.clone());

        if (rulerPointsRef.current.length === 2) {
          const p1 = rulerPointsRef.current[0];
          const p2 = rulerPointsRef.current[1];
          const dist = p1.distanceTo(p2);
          setMeasuredDistance(dist);

          const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0x10b981,
            linewidth: 3
          });
          const line = new THREE.Line(lineGeo, lineMat);
          rulerGroupRef.current.add(line);
          rulerLineRef.current = line;
        }
      }
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("click", onContainerClick);

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("click", onContainerClick);
    };
  }, [clearMeasurement]);

  // 3. THREE.JS INITIALIZATION WITH AUTHENTIC CASA SERRA LIGHTING & ENVIRONMENT
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Palette authentic to Architectural Drafting Table Mat #ece5d8 (Exact match to Image 3)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xece5d8);
    scene.fog = new THREE.FogExp2(0xece5d8, 0.0035);
    sceneRef.current = scene;

    const bW = project.specs.width || 14;
    const bL = project.specs.length || 12;
    const maxDim = Math.max(bW, bL, 14);

    const axCamPos = new THREE.Vector3(14.0, 17.5 / zoomScale, 19.5);
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.copy(axCamPos);
    camera.lookAt(1.6, 0.2, 0);
    cameraRef.current = camera;
    currentCamPos.current.copy(axCamPos);
    targetCamPos.current.copy(axCamPos);
    currentCamLook.current.set(1.6, 0.2, 0);
    targetCamLook.current.set(1.6, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Post-Processing Pipeline: SSAO, UnrealBloomPass & OutputPass (Tone mapping & Color Corrected)
    try {
      const composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      const ssaoPass = new SSAOPass(scene, camera, width, height);
      ssaoPass.kernelRadius = 16;
      ssaoPass.minDistance = 0.005;
      ssaoPass.maxDistance = 0.15;
      composer.addPass(ssaoPass);
      ssaoPassRef.current = ssaoPass;

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.25,
        0.4,
        0.90
      );
      composer.addPass(bloomPass);
      bloomPassRef.current = bloomPass;

      const outputPass = new OutputPass();
      composer.addPass(outputPass);

      composerRef.current = composer;
    } catch (e) {
      console.warn("Postprocessing fallback to standard WebGL renderer:", e);
    }

    // Balanced Photorealistic Lighting Setup (Story 6.3 & UX Tuning)
    // Soft, natural ambient light avoids washing out the architectural drafting paper
    const ambient = new THREE.AmbientLight(0xfcf8f2, 0.42);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xfff8ee, 0xd4ccba, 0.32);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffaea, 1.15);
    sun.position.set(22, 34, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 140;
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.bias = -0.0001; // Task 6.3.2: Optimized shadow bias
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    sunRef.current = sun;

    // Ground Drafting Mat with Warm Texture & Intersections (Exact match to Image 3)
    const matGeo = new THREE.PlaneGeometry(160, 160);
    matGeo.rotateX(-Math.PI / 2);
    const matTex = createDraftingMatTexture();
    const matMat = new THREE.MeshStandardMaterial({
      map: matTex,
      roughness: 0.95,
      metalness: 0.0
    });
    const matMesh = new THREE.Mesh(matGeo, matMat);
    matMesh.position.y = -0.01;
    matMesh.receiveShadow = true;
    scene.add(matMesh);

    // Scene Groups
    const landscapeGroup = new THREE.Group();
    const floorGroup = new THREE.Group();
    const wallGroup = new THREE.Group();
    const ceilingGroup = new THREE.Group();
    const furnitureGroup = new THREE.Group();
    const rulerGroup = new THREE.Group();
    const dollhouseCapGroup = new THREE.Group();
    dollhouseCapGroup.name = "dollhouse_caps";
    dollhouseCapGroup.visible = cameraModeRef.current === "dollhouse";

    scene.add(landscapeGroup);
    scene.add(floorGroup);
    scene.add(wallGroup);
    scene.add(ceilingGroup);
    scene.add(furnitureGroup);
    scene.add(rulerGroup);
    scene.add(dollhouseCapGroup);

    landscapeGroupRef.current = landscapeGroup;
    floorGroupRef.current = floorGroup;
    wallGroupRef.current = wallGroup;
    ceilingGroupRef.current = ceilingGroup;
    furnitureGroupRef.current = furnitureGroup;
    rulerGroupRef.current = rulerGroup;
    dollhouseCapGroupRef.current = dollhouseCapGroup;

    // Build the Full 3D Architectural Model with Landscape, Ceilings, and Furniture
    buildArchitecturalScene(scene, landscapeGroup, floorGroup, wallGroup, ceilingGroup, furnitureGroup, dollhouseCapGroup);

    // RENDER LOOP
    let currentExtrusion = 0.0;
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      try {
        const p = scrollProgressRef.current;

        // Realistic Fireplace Amber Hearth Glow Flicker
        if (fireLightRef.current) {
          const flicker = Math.sin(time * 0.008) * 0.25 + Math.cos(time * 0.015) * 0.15;
          fireLightRef.current.intensity = 2.2 + flicker;
        }

        if (cameraRef.current) {
          // Dynamic FOV: 38° in 2D blueprint mode, widening to 56° for spacious eye-level tour
          const targetFov = p > 0.18 ? 56 : 38;
          cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFov, 0.06);
          cameraRef.current.updateProjectionMatrix();

          if (cameraModeRef.current === "walkthrough") {
            // First-person WASD Walkthrough
            const speed = 0.085;
            const yaw = fpsAngles.current.yaw;
            const pitch = fpsAngles.current.pitch;

            const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
            const right = new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw));

            if (keysDown.current["w"] || keysDown.current["arrowup"]) {
              walkPos.current.addScaledVector(forward, speed);
            }
            if (keysDown.current["s"] || keysDown.current["arrowdown"]) {
              walkPos.current.addScaledVector(forward, -speed);
            }
            if (keysDown.current["a"] || keysDown.current["arrowleft"]) {
              walkPos.current.addScaledVector(right, speed);
            }
            if (keysDown.current["d"] || keysDown.current["arrowright"]) {
              walkPos.current.addScaledVector(right, -speed);
            }

            walkPos.current.y = 1.65;
            currentCamPos.current.copy(walkPos.current);
            targetCamPos.current.copy(walkPos.current);

            const lookDir = new THREE.Vector3(
              -Math.sin(yaw) * Math.cos(pitch),
              Math.sin(pitch),
              -Math.cos(yaw) * Math.cos(pitch)
            );
            cameraRef.current.position.copy(walkPos.current);
            cameraRef.current.lookAt(walkPos.current.clone().add(lookDir));
          } else if (cameraModeRef.current === "dollhouse") {
            // Axonometric 45° Sa Bàn angle looking down onto 1.5m cutaway (STORY-THUAN-BP12)
            const bW = project.specs.width || 14;
            const bL = project.specs.length || 12;
            const maxDim = Math.max(bW, bL, 14);
            const altitude = (maxDim * 0.95) / zoomScale;

            targetCamPos.current.set(bW * 0.75, altitude, bL * 0.9);
            targetCamLook.current.set(0, 0.4, 0);

            currentCamPos.current.lerp(targetCamPos.current, 0.08);
            currentCamLook.current.lerp(targetCamLook.current, 0.08);
            cameraRef.current.position.copy(currentCamPos.current);
            cameraRef.current.lookAt(currentCamLook.current);
          } else if (cameraModeRef.current === "top_down") {
            // Top-down Orthographic-style Perspective
            const bW = project.specs.width || 14;
            const bL = project.specs.length || 12;
            const maxDim = Math.max(bW, bL, 14);
            const altitude = (maxDim * 0.85) / zoomScale;

            targetCamPos.current.set(0, altitude, 0.001);
            targetCamLook.current.set(0, 0, 0);

            currentCamPos.current.lerp(targetCamPos.current, 0.08);
            currentCamLook.current.lerp(targetCamLook.current, 0.08);
            cameraRef.current.position.copy(currentCamPos.current);
            cameraRef.current.lookAt(currentCamLook.current);
          } else {
            // Smooth lerp camera movement
            currentCamPos.current.lerp(targetCamPos.current, 0.075);
            currentCamLook.current.lerp(targetCamLook.current, 0.075);

            cameraRef.current.position.copy(currentCamPos.current);

            // Apply interactive lookOffset (mouse dragging)
            const lookDir = currentCamLook.current.clone().sub(currentCamPos.current);
            if (p > 0.15 && (lookOffset.current.yaw !== 0 || lookOffset.current.pitch !== 0)) {
              lookDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), lookOffset.current.yaw);
              lookDir.y += lookOffset.current.pitch * 2.8;
            }
            cameraRef.current.lookAt(currentCamPos.current.clone().add(lookDir));
          }
        }

        // Wall Extrusion: 0.0 in 2D, extruding up to 1.0 in 3D
        const targetExtrude = p <= 0.06 ? 0.0 : Math.min(1.0, (p - 0.06) * 5.0);
        currentExtrusion += (targetExtrude - currentExtrusion) * 0.12;

        if (wallGroupRef.current) {
          wallGroupRef.current.scale.set(1, currentExtrusion, 1);
          wallGroupRef.current.visible = showWallsRef.current && currentExtrusion > 0.005;
        }

        // Ceilings and Dollhouse Caps Visibility (Story 6.2)
        const isDollhouse = cameraModeRef.current === "dollhouse";

        if (ceilingGroupRef.current) {
          ceilingGroupRef.current.visible = !isDollhouse && showCeilingsRef.current && p > 0.22 && p < 0.92;
        }

        if (dollhouseCapGroupRef.current) {
          dollhouseCapGroupRef.current.visible = isDollhouse && currentExtrusion > 0.1;
        }

        // Exterior Landscape fades in as user enters 3D
        if (landscapeGroupRef.current) {
          landscapeGroupRef.current.visible = showLandscapeRef.current && currentExtrusion > 0.08;
        }

        // Morphing from 2D Tilted Maquette into Straightened 3D Floorplan
        const straightenT = Math.min(1.0, p / 0.12);
        if (topSheetGroupRef.current) {
          topSheetGroupRef.current.rotation.y = THREE.MathUtils.lerp(-0.42, 0, straightenT);
          topSheetGroupRef.current.position.x = THREE.MathUtils.lerp(1.6, 0, straightenT);
          topSheetGroupRef.current.position.z = THREE.MathUtils.lerp(0.0, 0, straightenT);
        }
        if (bottomSheetRef.current) {
          bottomSheetRef.current.rotation.y = THREE.MathUtils.lerp(-0.55, 0, straightenT);
          bottomSheetRef.current.position.x = THREE.MathUtils.lerp(0.9, 0, straightenT);
          bottomSheetRef.current.visible = p < 0.16;
        }
        if (middleSheetRef.current) {
          middleSheetRef.current.rotation.y = THREE.MathUtils.lerp(-0.48, 0, straightenT);
          middleSheetRef.current.position.x = THREE.MathUtils.lerp(1.3, 0, straightenT);
          middleSheetRef.current.visible = p < 0.16;
        }

        // 2D Blueprint Floorplan fades out when 3D rises
        if (blueprintMeshRef.current) {
          const bpMat = blueprintMeshRef.current.material as THREE.MeshStandardMaterial;
          if (bpMat) {
            const bpOpacity = Math.max(0, 1 - (p - 0.08) * 12.0);
            bpMat.opacity = bpOpacity;
            bpMat.transparent = bpOpacity < 0.999;
            blueprintMeshRef.current.visible = bpOpacity > 0.01;
          }
        }

        // Room floors fade in during 3D transition
        const floorOpacity = p <= 0.08 ? 0.0 : Math.min(0.95, (p - 0.08) * 3.5);
        roomFloorsRef.current.forEach((m) => {
          if (m.material) {
            (m.material as THREE.MeshStandardMaterial).opacity = floorOpacity;
          }
        });

        // 3D Animated Oak Pivot Door: Swings open smoothly 78° as user reaches entrance
        if (doorPivotRef.current) {
          const doorOpenT = Math.max(0, Math.min(1, (p - 0.18) / 0.10));
          doorPivotRef.current.rotation.y = -doorOpenT * (Math.PI * 0.44);
        }

        // Furniture appears seamlessly as walls rise
        if (furnitureGroupRef.current) {
          furnitureGroupRef.current.visible = showFurnitureRef.current && currentExtrusion > 0.15;
          furnitureGroupRef.current.position.y = (currentExtrusion - 1) * 0.65;
        }

        // Dynamic Lighting Transition (Story 6.3 & UX Refinement):
        // In 2D blueprint mode (p <= 0.12), interior point/spot lights are completely OFF (intensity = 0).
        // This ensures the 2D architectural blueprint remains 100% crisp without cyan or orange halos!
        // As walls rise into 3D (p > 0.12), interior accent lights smoothly fade up to their balanced intensities.
        const interiorFade = p <= 0.12 ? 0.0 : Math.min(1.0, (p - 0.12) / 0.28);
        interiorLightsRef.current.forEach(({ light, baseIntensity }) => {
          light.intensity = baseIntensity * interiorFade;
          light.visible = interiorFade > 0.01;
        });

        // Directional Sun lighting adjustment between 2D and 3D
        if (sunRef.current) {
          if (p <= 0.08) {
            sunRef.current.intensity = 1.0;
            sunRef.current.castShadow = false;
          } else {
            sunRef.current.intensity = 1.6;
            sunRef.current.castShadow = true;
          }
        }

        // Ink Drawing Transition for Adjacent Rooms:
        // Highlights the current active room in full PBR while distant rooms retain architectural sketch styling
        roomInkMeshesRef.current.forEach(({ mesh, roomId }) => {
          const isCurrent = roomId === project.rooms[activeRoomIndex]?.id;
          mesh.visible = !isCurrent && p > 0.25;
        });

        if (composerRef.current) {
          composerRef.current.render();
        } else {
          renderer.render(scene, cameraRef.current!);
        }
      } catch (err) {
        console.error("Render loop error:", err);
      }
    };
    animate(0);

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      if (composerRef.current) {
        composerRef.current.setSize(w, h);
      }
      if (ssaoPassRef.current) {
        ssaoPassRef.current.setSize(w, h);
      }
      if (bloomPassRef.current) {
        bloomPassRef.current.setSize(w, h);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (composerRef.current) {
        composerRef.current.dispose();
        composerRef.current = null;
      }
      cleanupThreeScene(scene, renderer);
    };
  }, [project, zoomScale, activeRoomIndex]);

  // 4. COMPUTED ROOM CINEMATIC WAYPOINTS (Exact eye-level framing without obstruction)
  const roomWaypoints = useMemo(() => {
    return project.rooms.map((room) => {
      const [x0, z0, x1, z1] = room.bounds;
      const rW = Math.abs(x1 - x0);
      const rD = Math.abs(z1 - z0);
      const cX = (x0 + x1) / 2;
      const cZ = (z0 + z1) / 2;

      if (isCasaSerra) {
        if (room.id === "entrance") {
          return {
            pos: new THREE.Vector3(-11.0, 1.55, -2.2),
            look: new THREE.Vector3(-8.0, 1.35, -2.0),
            fov: 56,
          };
        }
        if (room.id === "living") {
          // Standing in doorway looking northeast across sunken lounge, coffee table, with fireplace on left and kitchen portal on right
          return {
            pos: new THREE.Vector3(-6.8, 1.45, 1.2),
            look: new THREE.Vector3(0.5, 1.15, -2.6),
            fov: 56,
          };
        }
        if (room.id === "kitchen") {
          // Standing at the head of the 14-person dining table looking down the table and island
          return {
            pos: new THREE.Vector3(3.2, 1.48, -4.2),
            look: new THREE.Vector3(10.5, 1.30, -0.8),
            fov: 52,
          };
        }
        if (room.id === "patio") {
          // Patio looking at ancient olive tree and reflective pool
          return {
            pos: new THREE.Vector3(-6.5, 1.55, -7.5),
            look: new THREE.Vector3(-3.0, 1.45, -10.0),
            fov: 54,
          };
        }
        if (room.id === "gallery") {
          // Down the bronze glass gallery
          return {
            pos: new THREE.Vector3(4.0, 1.52, -7.5),
            look: new THREE.Vector3(4.0, 1.45, -13.5),
            fov: 48,
          };
        }
        if (room.id === "bedroom") {
          // Master bedroom looking across bed to private garden
          return {
            pos: new THREE.Vector3(7.6, 1.42, -7.8),
            look: new THREE.Vector3(12.8, 1.25, -12.5),
            fov: 50,
          };
        }
      }

      // Position camera safely at entrance or prime architectural vantage point for custom floorplans
      let camX = cX;
      let camZ = cZ;
      let targetX = cX;
      let targetZ = cZ;
      const camY = 1.48; // Architectural eye level

      if (room.category === "living") {
        camX = x0 + rW * 0.15;
        camZ = z1 - rD * 0.18;
        targetX = x1 - rW * 0.25;
        targetZ = z0 + rD * 0.25;
      } else if (room.category === "kitchen") {
        camX = x0 + rW * 0.18;
        camZ = z0 + rD * 0.22;
        targetX = x1 - rW * 0.22;
        targetZ = z1 - rD * 0.22;
      } else if (room.category === "bedroom") {
        camX = x0 + rW * 0.16;
        camZ = z1 - rD * 0.18;
        targetX = x1 - rW * 0.25;
        targetZ = z0 + rD * 0.32;
      } else if (room.category === "outdoor") {
        camX = x0 + rW * 0.25;
        camZ = z0 + rD * 0.25;
        targetX = x1 - rW * 0.28;
        targetZ = z1 - rD * 0.28;
      } else if (room.category === "bath") {
        camX = x0 + rW * 0.25;
        camZ = z0 + rD * 0.3;
        targetX = x1 - rW * 0.25;
        targetZ = z1 - rD * 0.25;
      } else {
        camX = cX - rW * 0.15;
        camZ = z0 + rD * 0.2;
        targetX = cX + rW * 0.15;
        targetZ = z1 - rD * 0.2;
      }

      return {
        pos: new THREE.Vector3(camX, camY, camZ),
        look: new THREE.Vector3(targetX, 1.25, targetZ),
        fov: 56,
      };
    });
  }, [project, isCasaSerra]);

  // 5. CINEMATIC SCROLL CAMERA CHOREOGRAPHY (Casa Serra Spline Walkthrough)
  useEffect(() => {
    const p = scrollProgress;
    const bW = project.specs.width || 14;
    const bL = project.specs.length || 12;
    const maxDim = Math.max(bW, bL, 14);

    const room0 = project.rooms[0] || { bounds: [-2, -4, 2, 0] };
    const r0cX = (room0.bounds[0] + room0.bounds[2]) / 2;
    const r0cZ = (room0.bounds[1] + room0.bounds[3]) / 2;
    const doorZ = room0.bounds[1];

    // PHASE 1: 3D AXONOMETRIC BLUEPRINT BOARD (p = 0 to 0.06 - Exact match to Image 3)
    if (p <= 0.06) {
      if (cameraModeRef.current === "top_down") {
        const altitude = (maxDim * 0.75) / zoomScale;
        targetCamPos.current.set(0, altitude, 0.01);
        targetCamLook.current.set(0, 0, 0);
      } else {
        targetCamPos.current.set(14.0, 17.5 / zoomScale, 19.5);
        targetCamLook.current.set(1.6, 0.2, 0.0);
      }
    }
    // PHASE 2: 3D AXONOMETRIC MAQUETTE RISE (p = 0.06 to 0.18)
    // Swoops down from overhead into an elegant 48° architectural perspective
    else if (p <= 0.18) {
      const t = (p - 0.06) / 0.12;
      const startPos = new THREE.Vector3(14.0, 17.5 / zoomScale, 19.5);
      const endPos = new THREE.Vector3(-maxDim * 0.65, maxDim * 0.58, maxDim * 0.68);
      targetCamPos.current.lerpVectors(startPos, endPos, t);
      targetCamLook.current.lerpVectors(new THREE.Vector3(1.6, 0.2, 0.0), new THREE.Vector3(0, 0.8 * t, 0), t);
    }
    // PHASE 3: DOOR APPROACH & CINEMATIC GLIDE INSIDE (p = 0.18 to 0.28)
    // Camera descends to eye-level outside door, door pivots open, camera glides inside!
    else if (p <= 0.28) {
      const t = (p - 0.18) / 0.10;
      const axonPos = new THREE.Vector3(-maxDim * 0.65, maxDim * 0.58, maxDim * 0.68);
      const outsideDoorPos = new THREE.Vector3(r0cX, 1.58, doorZ - 3.4);
      const insideEntryPos = new THREE.Vector3(r0cX, 1.52, doorZ + 1.1);

      if (t < 0.45) {
        const subT = t / 0.45;
        targetCamPos.current.lerpVectors(axonPos, outsideDoorPos, subT);
        targetCamLook.current.set(r0cX, 1.35, doorZ + 1.6);
      } else {
        const subT = (t - 0.45) / 0.55;
        targetCamPos.current.lerpVectors(outsideDoorPos, insideEntryPos, subT);
        targetCamLook.current.set(r0cX, 1.25, r0cZ + 1.4);
      }
    }
    // PHASE 4: ROOM-BY-ROOM EYE-LEVEL WALKTHROUGH (p = 0.28 to 0.88)
    // Sweeps gracefully from room to room with room dwell plateaus so user can explore each space
    else if (p <= 0.88) {
      const t = (p - 0.28) / 0.60;
      const totalRooms = roomWaypoints.length;
      const floatIdx = t * (totalRooms - 1);
      const i0 = Math.floor(floatIdx);
      const i1 = Math.min(totalRooms - 1, i0 + 1);
      const blend = floatIdx - i0;

      const wp0 = roomWaypoints[i0];
      const wp1 = roomWaypoints[i1];

      // Luxurious room dwell plateau: camera settles comfortably in room i0, then glides smoothly to room i1
      let easeBlend = 0;
      if (blend < 0.24) {
        easeBlend = 0;
      } else if (blend > 0.76) {
        easeBlend = 1;
      } else {
        const u = (blend - 0.24) / 0.52;
        easeBlend = 0.5 - 0.5 * Math.cos(u * Math.PI);
      }

      targetCamPos.current.lerpVectors(wp0.pos, wp1.pos, easeBlend);
      targetCamLook.current.lerpVectors(wp0.look, wp1.look, easeBlend);
    }
    // PHASE 5: GRAND FINALE LIFT (p = 0.88 to 1.0)
    // Rises up to an aerial golden-hour perspective overlooking the full house
    else {
      const t = (p - 0.88) / 0.12;
      const lastWp = roomWaypoints[roomWaypoints.length - 1];
      const endPos = new THREE.Vector3(maxDim * 0.55, maxDim * 0.70, maxDim * 0.60);
      targetCamPos.current.lerpVectors(lastWp.pos, endPos, t);
      targetCamLook.current.set(0, 0.5, 0);
    }
  }, [scrollProgress, project, zoomScale, roomWaypoints]);

  // 6. BUILD COMPLETE ARCHITECTURAL SCENE (Walls, Ceilings, Skylights, Clerestory, Landscape, Staging)
  const buildArchitecturalScene = (
    scene: THREE.Scene,
    landscapeGroup: THREE.Group,
    floorGroup: THREE.Group,
    wallGroup: THREE.Group,
    ceilingGroup: THREE.Group,
    furnitureGroup: THREE.Group,
    dollhouseCapGroup?: THREE.Group
  ) => {
    while (landscapeGroup.children.length > 0) landscapeGroup.remove(landscapeGroup.children[0]);
    while (floorGroup.children.length > 0) floorGroup.remove(floorGroup.children[0]);
    while (wallGroup.children.length > 0) wallGroup.remove(wallGroup.children[0]);
    while (ceilingGroup.children.length > 0) ceilingGroup.remove(ceilingGroup.children[0]);
    while (furnitureGroup.children.length > 0) furnitureGroup.remove(furnitureGroup.children[0]);
    if (dollhouseCapGroup) {
      while (dollhouseCapGroup.children.length > 0) dollhouseCapGroup.remove(dollhouseCapGroup.children[0]);
    }
    roomFloorsRef.current = [];
    roomInkMeshesRef.current = [];
    interiorLightsRef.current = [];

    const wallHeight = 4.2; // Full Casa Serra ceiling height
    const wallThick = project.specs.exteriorWallThickness || 0.25;

    // Khi có LayoutData thật (AI hoặc nắn chỉnh vector), tường + ô cửa được dựng theo đúng
    // từng đoạn tường của bản vẽ (Segmented Wall Extrusion) thay vì suy ra từ khung phòng.
    const layoutForWalls = project.layoutData && project.layoutData.walls.length > 0 ? project.layoutData : null;
    const layoutFurniture =
      project.layoutData && project.layoutData.furniture_assets.length > 0 ? project.layoutData.furniture_assets : null;

    // Load Photorealistic PBR Materials adapted to chosen Architectural Style (Story 6.1)
    const pbr = createPhotorealisticMaterialLibrary(project.specs.style as any);
    const plasterMat = pbr.warmWhiteWall;
    const boardMarkedConcreteMat = pbr.concreteFloor;
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xf5f1e8,
      roughness: 0.75,
      side: THREE.DoubleSide,
    });
    const darkBronzeMat = pbr.metalDarkBrushed;
    const clerestoryGlassMat = pbr.glassShowerClear;
    const capMat = new THREE.MeshBasicMaterial({ color: 0x1e2022 }); // Dark perimeter cap for 1.5m sa bàn (Story 6.2)

    wallMaterialsRef.current = [plasterMat, boardMarkedConcreteMat, clerestoryGlassMat];
    const isDollhouse = cameraModeRef.current === "dollhouse";
    wallMaterialsRef.current.forEach((m) => {
      m.clippingPlanes = isDollhouse ? [dollhouseClipPlane] : [];
      m.clipShadows = true;
      m.needsUpdate = true;
    });

    // A–B. CẢNH QUAN NGOÀI TRỜI & HỒ BƠI (lib/blueprint-scene/landscape.ts)
    buildExteriorLandscape(landscapeGroup, {
      buildingWidth: project.specs.width,
      buildingLength: project.specs.length,
      pool: resolvePoolRect(project),
    });

    // C. FOUNDATION SLAB & 2D BLUEPRINT TEXTURE
    // C. 3D ARCHITECTURAL DRAFTING SHEETS (Layered Maquette Matching Image 3)
    const sheetW = project.specs.width ? Math.max(18, project.specs.width) : 20;
    const sheetL = project.specs.length ? Math.max(14, project.specs.length) : 16;

    const sheetsGroup = new THREE.Group();
    sheetsGroupRef.current = sheetsGroup;

    // Sheet 0: Bottom Layered Offset Sheet (Warm darker base paper, tilted -31.5°)
    const bottomSheetGeo = new THREE.BoxGeometry(sheetW + 1.8, 0.03, sheetL + 1.8);
    const bottomSheetMat = new THREE.MeshStandardMaterial({
      color: 0xeadfcf,
      roughness: 0.95,
      metalness: 0.01
    });
    const bottomSheetMesh = new THREE.Mesh(bottomSheetGeo, bottomSheetMat);
    bottomSheetMesh.position.set(0.9, 0.015, 0.7);
    bottomSheetMesh.rotation.y = -0.55;
    bottomSheetMesh.castShadow = true;
    bottomSheetMesh.receiveShadow = true;
    sheetsGroup.add(bottomSheetMesh);
    bottomSheetRef.current = bottomSheetMesh;

    // Sheet 1: Middle Layered Offset Sheet (Tilted -27.5°)
    const middleSheetGeo = new THREE.BoxGeometry(sheetW + 0.9, 0.03, sheetL + 0.9);
    const middleSheetMat = new THREE.MeshStandardMaterial({
      color: 0xf5efe4,
      roughness: 0.90,
      metalness: 0.01
    });
    const middleSheetMesh = new THREE.Mesh(middleSheetGeo, middleSheetMat);
    middleSheetMesh.position.set(1.3, 0.035, 0.35);
    middleSheetMesh.rotation.y = -0.48;
    middleSheetMesh.castShadow = true;
    middleSheetMesh.receiveShadow = true;
    sheetsGroup.add(middleSheetMesh);
    middleSheetRef.current = middleSheetMesh;

    // Sheet 2: Top Presentation Sheet with Rich Architectural Vector Floorplan (Tilted -24°)
    const topSheetGroup = new THREE.Group();
    topSheetGroup.position.set(1.6, 0.065, 0.0);
    topSheetGroup.rotation.y = -0.42;

    const paperSlabGeo = new THREE.BoxGeometry(sheetW, 0.04, sheetL);
    const paperSlabMat = new THREE.MeshStandardMaterial({
      color: 0xfbf8f0,
      roughness: 0.88,
      metalness: 0.01
    });
    const paperSlabMesh = new THREE.Mesh(paperSlabGeo, paperSlabMat);
    paperSlabMesh.castShadow = true;
    paperSlabMesh.receiveShadow = true;
    topSheetGroup.add(paperSlabMesh);

    const paperFaceGeo = new THREE.PlaneGeometry(sheetW, sheetL);
    paperFaceGeo.rotateX(-Math.PI / 2);
    const boardTex = createArchitecturalBoardTexture(project);
    if (rendererRef.current && (boardTex as any).anisotropy) {
      (boardTex as any).anisotropy = rendererRef.current.capabilities.getMaxAnisotropy();
    }
    const paperFaceMat = new THREE.MeshStandardMaterial({
      map: boardTex,
      roughness: 0.85,
      metalness: 0.01
    });
    const paperFaceMesh = new THREE.Mesh(paperFaceGeo, paperFaceMat);
    paperFaceMesh.position.y = 0.021;
    paperFaceMesh.receiveShadow = true;
    topSheetGroup.add(paperFaceMesh);

    sheetsGroup.add(topSheetGroup);
    floorGroup.add(sheetsGroup);
    topSheetGroupRef.current = topSheetGroup;
    blueprintMeshRef.current = paperFaceMesh;

    // Helper: Add solid wall segment with clerestory top glass band & 1.5m dollhouse cap
    const addArchitecturalWall = (
      w: number,
      h: number,
      d: number,
      px: number,
      pz: number,
      hasClerestory: boolean = true
    ) => {
      const mainH = hasClerestory ? h - 0.7 : h;

      // Main Plaster Wall Body
      const geo = new THREE.BoxGeometry(w, mainH, d);
      geo.translate(0, mainH / 2, 0);
      const mesh = new THREE.Mesh(geo, plasterMat);
      mesh.position.set(px, 0, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wallGroup.add(mesh);

      // Black Sa Bàn cut cap at Y = 1.49m (Story 6.2)
      if (dollhouseCapGroup) {
        const capGeo = new THREE.BoxGeometry(w + 0.01, 0.015, d + 0.01);
        capGeo.translate(0, 0.0075, 0);
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.position.set(px, 1.49, pz);
        dollhouseCapGroup.add(capMesh);
      }

      // Clerestory Glass Band on top (under the ceiling)
      if (hasClerestory) {
        const glassGeo = new THREE.BoxGeometry(w, 0.7, d * 0.4);
        glassGeo.translate(0, 0.35, 0);
        const glassMesh = new THREE.Mesh(glassGeo, clerestoryGlassMat);
        glassMesh.position.set(px, mainH, pz);
        wallGroup.add(glassMesh);

        // Thin bronze horizontal transom bar
        const transomGeo = new THREE.BoxGeometry(w, 0.06, d * 0.8);
        const transomMesh = new THREE.Mesh(transomGeo, darkBronzeMat);
        transomMesh.position.set(px, mainH, pz);
        wallGroup.add(transomMesh);
      }
    };

    // D. BUILD ROOMS, FLOORS, CEILINGS & CLERESTORY BANDS
    project.rooms.forEach((room, idx) => {
      const [x0, z0, x1, z1] = room.bounds;
      const rW = Math.abs(x1 - x0);
      const rD = Math.abs(z1 - z0);
      const cX = (x0 + x1) / 2;
      const cZ = (z0 + z1) / 2;

      // Authentic Floor Materials with PBR Textures (Story 6.1)
      let roomFloorMat: THREE.Material = pbr.concreteFloor;
      if (room.floorMaterial === "oak") {
        roomFloorMat = pbr.oakParquetFloor;
      } else if (room.floorMaterial === "concrete") {
        roomFloorMat = pbr.concreteFloor;
      } else if (room.floorMaterial === "marble" || room.floorMaterial === "tile") {
        roomFloorMat = pbr.marbleTileFloor;
      } else if (room.category === "outdoor" || room.id === "patio") {
        roomFloorMat = pbr.balconySlateFloor;
      }

      // Floor Plane (For living room, sunken floor sits 45cm lower)
      const isLiving = room.category === "living";
      const floorY = isLiving ? -0.42 : 0.02;

      // Phòng không phải hình chữ nhật (chữ L, góc vát...) => dựng sàn/trần theo đúng đa giác của bản vẽ.
      const layoutRoom = layoutForWalls?.rooms.find((r) => r.id === room.id);
      const roomPolygon =
        layoutRoom && layoutRoom.polygon.length >= 3 && !isAxisAlignedRectangle(layoutRoom.polygon)
          ? layoutRoom.polygon
          : null;

      const floorGeo: THREE.BufferGeometry = roomPolygon
        ? createFloorPolygonGeometry(roomPolygon)
        : new THREE.BoxGeometry(rW, 0.03, rD);
      const floorMesh = new THREE.Mesh(floorGeo, roomFloorMat);
      if (roomPolygon) floorMesh.position.set(0, floorY, 0);
      else floorMesh.position.set(cX, floorY, cZ);
      floorMesh.receiveShadow = true;
      floorGroup.add(floorMesh);
      roomFloorsRef.current.push(floorMesh);

      // Ink Drawing Blueprint Outline Overlay for Adjacent Room Transition
      const inkEdges = new THREE.EdgesGeometry(floorGeo);
      const inkLineMat = new THREE.LineBasicMaterial({ color: 0x1d1d1f, linewidth: 1.5 });
      const inkLine = new THREE.LineSegments(inkEdges, inkLineMat);
      if (roomPolygon) inkLine.position.set(0, 0.03, 0);
      else inkLine.position.set(cX, 0.03, cZ);
      floorGroup.add(inkLine);
      roomInkMeshesRef.current.push({ mesh: floorMesh, roomId: room.id });

      // Ceilings (With Skylights in Kitchen & Dining)
      if (room.category !== "outdoor") {
        if (room.category === "kitchen") {
          // Ceiling with 3 recessed skylight cutouts
          const slabPartW = rW / 3;
          for (let s = 0; s < 3; s++) {
            const partX = x0 + slabPartW * (s + 0.5);
            const ceilPart = new THREE.Mesh(new THREE.BoxGeometry(slabPartW - 1.2, 0.15, rD), ceilingMat);
            ceilPart.position.set(partX, wallHeight, cZ);
            ceilingGroup.add(ceilPart);

            // Skylight Shaft Light Beam
            const skyLight = new THREE.SpotLight(0xfff6ea, 1.8, 12, Math.PI / 6, 0.4);
            skyLight.position.set(partX, wallHeight + 0.5, cZ);
            skyLight.target.position.set(partX, 0, cZ);
            scene.add(skyLight);
            scene.add(skyLight.target);
            interiorLightsRef.current.push({ light: skyLight, baseIntensity: 1.8 });
          }
        } else if (roomPolygon) {
          // Trần theo đa giác phòng (cùng hình với sàn), ceilingMat là DoubleSide nên nhìn được từ dưới
          const ceilingMesh = new THREE.Mesh(createFloorPolygonGeometry(roomPolygon), ceilingMat);
          ceilingMesh.position.set(0, wallHeight, 0);
          ceilingGroup.add(ceilingMesh);
        } else {
          // Smooth architectural ceiling slab
          const ceilingGeo = new THREE.BoxGeometry(rW, 0.15, rD);
          const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
          ceilingMesh.position.set(cX, wallHeight, cZ);
          ceilingGroup.add(ceilingMesh);
        }
      }

      // Warm Sconce Light for realistic interior ambiance
      const roomLight = new THREE.PointLight(0xffeed8, 1.1, Math.max(rW, rD) * 1.8);
      roomLight.position.set(cX, 2.8, cZ);
      scene.add(roomLight);
      interiorLightsRef.current.push({ light: roomLight, baseIntensity: 1.1 });

      if (layoutForWalls) {
        // Tường của phòng đã có trong layoutData, dựng một lần sau vòng lặp phòng.
      } else if (room.category === "outdoor") {
        // Outdoor Patio / Garden: open courtyard, no tall walls blocking sky or views!
        // Low board-marked concrete parapet wall on the perimeter
        const lowParapet = new THREE.Mesh(
          new THREE.BoxGeometry(rW, 0.45, wallThick),
          boardMarkedConcreteMat
        );
        lowParapet.position.set(cX, 0.22, z0);
        wallGroup.add(lowParapet);
      } else {
        const doorW = 2.4; // Wide 2.4m Casa Serra opening
        // Front wall (entrance door or doorway)
        if (idx === 0) {
          // Entrance Pivot Door (Oak wood, 2.4m wide x 4.2m tall)
          const leftW = Math.max(0.2, (rW - doorW) / 2);
          addArchitecturalWall(leftW, wallHeight, wallThick, x0 + leftW / 2, z0, false);
          addArchitecturalWall(leftW, wallHeight, wallThick, x1 - leftW / 2, z0, false);

          const doorPivot = new THREE.Group();
          doorPivot.position.set(cX - doorW / 2, 0, z0);

          const doorH = wallHeight - 0.2;
          const doorLeafGeo = new THREE.BoxGeometry(doorW - 0.05, doorH, 0.06);
          doorLeafGeo.translate((doorW - 0.05) / 2, doorH / 2, 0);
          const doorLeafMat = new THREE.MeshStandardMaterial({
            color: 0x92673d, // Natural oak wood
            roughness: 0.5,
          });
          const doorMesh = new THREE.Mesh(doorLeafGeo, doorLeafMat);
          doorMesh.castShadow = true;

          // Brushed bronze vertical handle
          const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, 0.65, 12),
            new THREE.MeshStandardMaterial({ color: 0xb58b42, metalness: 0.85, roughness: 0.25 })
          );
          handle.position.set(doorW - 0.18, doorH * 0.45, 0.05);
          doorMesh.add(handle);

          doorPivot.add(doorMesh);
          wallGroup.add(doorPivot);
          doorPivotRef.current = doorPivot;
        } else {
          // Wall with doorway into next room
          const openingW = 2.4;
          const wallLeftW = Math.max(0.4, (rW - openingW) / 2);
          addArchitecturalWall(wallLeftW, wallHeight, wallThick, x0 + wallLeftW / 2, z0);
          addArchitecturalWall(wallLeftW, wallHeight, wallThick, x1 - wallLeftW / 2, z0);
        }

        // Back wall: If Living or Kitchen facing Patio/Exterior, make it Floor-to-Ceiling Glass!
        if (room.category === "living" || room.category === "kitchen") {
          const glassWallGeo = new THREE.BoxGeometry(rW - 0.2, wallHeight - 0.1, 0.04);
          const glassWall = new THREE.Mesh(glassWallGeo, clerestoryGlassMat);
          glassWall.position.set(cX, wallHeight / 2, z0);
          wallGroup.add(glassWall);

          // Bronze mullions every 2 meters
          const numMullions = Math.max(3, Math.round(rW / 2.0));
          for (let m = 0; m <= numMullions; m++) {
            const mul = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, 0.08), darkBronzeMat);
            mul.position.set(x0 + (rW / numMullions) * m, wallHeight / 2, z0);
            wallGroup.add(mul);
          }
        } else {
          addArchitecturalWall(rW, wallHeight, wallThick, cX, z1);
        }

        // Side walls
        if (room.id === "gallery" || room.name.toLowerCase().includes("gallery")) {
          // 24m Bronze Glass wall on the side facing the patio!
          const glassWallGeo = new THREE.BoxGeometry(0.04, wallHeight - 0.1, rD);
          const glassWall = new THREE.Mesh(glassWallGeo, clerestoryGlassMat);
          glassWall.position.set(x0, wallHeight / 2, cZ);
          wallGroup.add(glassWall);

          // Opposite solid wall for art
          addArchitecturalWall(wallThick, wallHeight, rD, x1, cZ);
        } else {
          addArchitecturalWall(wallThick, wallHeight, rD, x0, cZ);
          addArchitecturalWall(wallThick, wallHeight, rD, x1, cZ);
        }
      }

      // Nội thất: có danh sách từ bản vẽ (AI / nắn chỉnh) thì đặt GLB đúng vị trí đó (bên dưới),
      // không thì dùng nội thất thủ tục theo loại phòng như mặt bằng mẫu.
      if (!layoutFurniture) {
        buildArchitecturalFurniture(room, cX, cZ, rW, rD, furnitureGroup, scene);
      }
    });

    if (layoutFurniture) {
      // Sàn phòng khách hạ 0.42m (sunken lounge) => hạ đồ trong phòng khách tương ứng
      const floorYAt = (x: number, z: number) => {
        const room = project.rooms.find(({ bounds: [bx0, bz0, bx1, bz1] }) =>
          x >= Math.min(bx0, bx1) && x <= Math.max(bx0, bx1) && z >= Math.min(bz0, bz1) && z <= Math.max(bz0, bz1)
        );
        return room?.category === "living" ? -0.42 : 0;
      };
      void placeLayoutFurniture(
        layoutFurniture.map((a) => ({ ...a, position: [a.position[0], floorYAt(a.position[0], a.position[2]), a.position[2]] })),
        furnitureGroup,
        { isActive: () => furnitureGroupRef.current === furnitureGroup && furnitureGroup.parent !== null }
      );
    }

    if (layoutForWalls) {
      const wallMaterials = createDefaultArchitecturalMaterials(project.specs.style);
      for (const wall of layoutForWalls.walls) {
        // Giữ chiều cao tường khớp với cao độ trần của viewer để không hở trần.
        const segment = generateWallSegmentMeshes(
          { ...wall, height: wallHeight },
          layoutForWalls.openings,
          wallMaterials
        );
        wallGroup.add(segment);
      }
    }
  };

  // 7. NỘI THẤT THỦ TỤC THEO PHÒNG (đã tách sang lib/blueprint-scene/proceduralFurniture.ts)
  const buildArchitecturalFurniture = (
    room: RoomSpec,
    cx: number,
    cz: number,
    w: number,
    d: number,
    group: THREE.Group,
    scene: THREE.Scene
  ) =>
    buildProceduralRoomFurniture(room, cx, cz, w, d, group, scene, {
      interiorLights: interiorLightsRef.current,
      onFireLight: (light) => {
        fireLightRef.current = light;
      },
    });

  const heroOpacity = Math.max(0, 1 - scrollProgress * 7);

  return (
    <div 
      className="relative w-full h-full min-h-[580px] select-none overflow-hidden font-sans"
      style={{
        backgroundColor: "#f7f4ec",
        backgroundImage: `
          linear-gradient(#e5dfd3 1px, transparent 1px),
          linear-gradient(90deg, #e5dfd3 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px"
      }}
    >
      
      {/* 3D CANVAS VIEWPORT */}
      <div 
        ref={containerRef} 
        className={`absolute inset-0 w-full h-full ${scrollProgress > 0.15 ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
      />

      {/* THANH TIÊU ĐỀ GỌN: chỉ còn thông tin dự án (các nút đã chuyển sang thanh công cụ bên trái) */}
      <header className="absolute top-0 left-0 right-0 pl-2 sm:pl-3 pr-4 py-3 flex items-center z-20 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 min-w-0 max-w-full bg-white/90 backdrop-blur-md border border-neutral-200 rounded-full px-3.5 py-1.5 text-[11px] font-mono text-neutral-800 shadow-sm">
          <span className="font-bold text-neutral-900 shrink-0">DỰ ÁN</span>
          <span className="font-medium truncate">
            {project.name && project.name !== "Casa Serra" ? project.name : "Biệt Thự Vườn Thảo Điền — Căn Hộ Duplex 9 Không Gian"}
          </span>
          <span className="text-neutral-300 shrink-0 hidden sm:inline">|</span>
          <span className="font-medium shrink-0 hidden sm:inline">
            {project.specs.totalArea ? `${project.specs.totalArea} m²` : ""}
            {project.specs.totalArea ? " · " : ""}
            {project.rooms.length} phòng · {project.specs.scale || "1:50"}
          </span>
        </div>
      </header>

      {/* THANH CÔNG CỤ DỌC BÊN TRÁI: tệp, chế độ xem, hiển thị, AI render, thu phóng */}
      <FloorLayerToolbar
        cameraMode={cameraMode}
        onCameraModeChange={handleCameraModeChange}
        showCeilings={showCeilings}
        onToggleCeilings={() => setShowCeilings((v) => !v)}
        showWalls={showWalls}
        onToggleWalls={() => setShowWalls((v) => !v)}
        showFurniture={showFurniture}
        onToggleFurniture={() => setShowFurniture((v) => !v)}
        showLandscape={showLandscape}
        onToggleLandscape={() => setShowLandscape((v) => !v)}
        isRulerActive={isRulerActive}
        onToggleRuler={() => {
          setIsRulerActive((v) => {
            const next = !v;
            if (!next) clearMeasurement();
            return next;
          });
        }}
        measuredDistance={measuredDistance}
        onClearMeasurement={clearMeasurement}
        onTriggerAIRender={handleTriggerAIRender}
        isAIRendering={isAIRendering}
        currentStyle={project.specs.style}
        onSelectStyle={handleSelectStyle}
        openPanel={openRailPanel}
        onOpenPanelChange={setOpenRailPanel}
        onUploadClick={onUploadClick}
        onExportGLB={handleExportGLB}
        isExportingGLB={isExportingGLB}
        onSelectArchetype={onSelectArchetype}
        onResetToDemo={onResetToDemo}
        isWireframe={isWireframe}
        onToggleWireframe={() => setIsWireframe((w) => !w)}
        zoomScale={zoomScale}
        onZoomIn={() => setZoomScale((z) => Math.min(2.5, z + 0.2))}
        onZoomOut={() => setZoomScale((z) => Math.max(0.6, z - 0.2))}
        onZoomFit={() => {
          setZoomScale(1.0);
          lookOffset.current = { yaw: 0, pitch: 0 };
          updateProgress(0);
        }}
      />

      {/* 2D HERO OVERLAY (Exact Match to Prototype Architecture Editorial) */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-200"
        style={{ opacity: heroOpacity, display: heroOpacity <= 0 ? "none" : "block" }}
      >
        {/* Left Column: Headline & Studio Branding */}
        <div className="absolute top-20 left-16 sm:left-20 md:left-24 max-w-sm space-y-3 select-none pointer-events-auto hidden sm:block">
          {/* Studio Badge */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest uppercase text-neutral-600">
            <span className="w-2 h-2 rounded-full bg-[#b85434] animate-pulse" />
            <span>BẢN QUYỀN THIẾT KẾ STUDIO</span>
          </div>

          {/* 3-Line Headline with cursive serif accent */}
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black uppercase tracking-tight leading-[1.02] text-neutral-900 font-sans">
            <div>MÔ HÌNH HÓA</div>
            <div className="font-serif italic font-normal text-[#b85434] tracking-normal text-4xl sm:text-[48px] my-1">
              BẢN VẼ 3D
            </div>
            <div>KIẾN TRÚC</div>
          </h1>

          <p className="text-xs text-neutral-600 font-sans leading-relaxed">
            Bản vẽ mặt bằng kiến trúc tiêu chuẩn gồm {project.rooms.length || 9} phòng phân khu. Lăn chuột nhẹ để tự động mở cửa, bóc tách lớp cắt và trực quan hóa từng trục không gian.
          </p>

          {/* Metric Badges */}
          <div className="pt-1 flex items-center gap-8 font-mono">
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-neutral-500 font-bold">
                DIỆN TÍCH SÀN
              </span>
              <span className="text-sm font-bold text-neutral-900">
                {project.specs.totalArea || 342.8} m²
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-neutral-500 font-bold">
                CAO ĐỘ TRẦN
              </span>
              <span className="text-sm font-bold text-neutral-900">
                +{((project.specs.ceilingHeight || 3.4) * 1000).toFixed(0)} mm
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Left: Title Block Table (Hồ Sơ Kỹ Thuật 3D) */}
        <div className="absolute bottom-6 left-16 sm:left-20 md:left-24 pointer-events-auto hidden md:block">
          <div className="border-2 border-neutral-900 bg-[#efebe2]/95 backdrop-blur-md text-[10px] font-mono uppercase text-neutral-900 shadow-md">
            <div className="grid grid-cols-2 border-b-2 border-neutral-900">
              <div className="px-3 py-1.5 border-r-2 border-neutral-900 font-bold tracking-wider">
                HỒ SƠ KỸ THUẬT 3D
              </div>
              <div className="px-3 py-1.5 font-bold tracking-wider text-neutral-700">
                GIAI ĐOẠN: THI CÔNG
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-neutral-800">
              <div className="px-3 py-1 border-r border-neutral-800">
                <span className="block text-[8px] text-neutral-500 font-bold">PROJECT NAME:</span>
                <span className="font-bold">{project.name && project.name !== "Casa Serra" ? project.name : "Bản Vẽ Mặt Bằng 3D"}</span>
              </div>
              <div className="px-3 py-1">
                <span className="block text-[8px] text-neutral-500 font-bold">DRAWING TITLE:</span>
                <span className="font-bold">{project.subtitle === "Ground floor plan" ? "Mặt Bằng Tổng Thể" : (project.subtitle || "Mặt Bằng Tổng Thể")}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-neutral-800">
              <div className="px-3 py-1 border-r border-neutral-800">
                <span className="block text-[8px] text-neutral-500 font-bold">SCALE:</span>
                <span className="font-bold">{project.specs.scale || "1:200"} / Ortho</span>
              </div>
              <div className="px-3 py-1">
                <span className="block text-[8px] text-neutral-500 font-bold">SHEET REFERENCE:</span>
                <span className="font-bold">{project.code || "A-101 REV D"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 items-center">
              <div className="px-3 py-1.5 border-r border-neutral-800">
                <span className="text-[9px] font-bold text-neutral-800">Kiến Trúc Sư: Gon Marcus</span>
              </div>
              <div className="px-3 py-1.5 flex justify-end">
                <span className="px-2 py-0.5 border border-dashed border-neutral-800 font-bold text-[9px] tracking-widest text-neutral-900">
                  APPROVED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Center: Scroll Hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <div className="inline-flex flex-col items-center gap-1">
            <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-800 font-bold">
              LĂN CHUỘT ĐỂ KHÁM PHÁ CHI TIẾT
            </span>
            <span className="text-neutral-500 text-xs animate-bounce">↓</span>
          </div>
        </div>
      </div>

      {/* 3D MODE: ROOM SPECIFICATION CORNER OVERLAY (Exact match to Lintel Room Header) */}
      {scrollProgress > 0.22 && activeRoom && (
        <aside 
          aria-label="Room Specification"
          data-no-scroll="true"
          className="absolute left-16 sm:left-20 md:left-24 top-16 max-w-md z-20 pointer-events-auto transition-all text-neutral-900"
        >
          <div className="flex items-center gap-3 mb-1 text-[11px] font-mono font-bold tracking-widest uppercase text-[#FF4D00]">
            <span>[ + ]</span>
            <span>ROOM 0{activeRoomIndex + 1}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-900 font-mono leading-none mb-2">
            {activeRoom.name}
          </h2>

          <div className="text-[11px] font-mono text-neutral-600 tracking-wider mb-2">
            <span>{activeRoom.area} M²</span>
            <span className="mx-2">·</span>
            <span>CEILING {activeRoom.ceilingHeight || 4.5} M</span>
            <span className="mx-2">·</span>
            <span className="text-[#FF4D00] cursor-pointer hover:underline">OPEN FILE +</span>
          </div>

          <p className="text-xs text-neutral-700 font-sans leading-relaxed max-w-sm hidden sm:block">
            {activeRoom.description}
          </p>
        </aside>
      )}

      {/* 3D MODE: MINIMAL TIMELINE SCRUBBER */}
      {scrollProgress > 0.08 && (
        <div data-no-scroll="true" className="absolute bottom-4 left-16 sm:left-20 right-4 sm:right-6 z-20 pointer-events-auto">
          <div className="max-w-3xl mx-auto rounded-xl bg-[#f5f2ea]/95 backdrop-blur-md border border-neutral-300 p-2.5 shadow-lg space-y-2">
            
            {/* Scrubber slider */}
            <div className="flex items-center gap-3 px-1">
              <button
                onClick={() => updateProgress(0)}
                className="text-[10px] font-mono uppercase font-bold text-neutral-600 hover:text-neutral-900 transition"
              >
                ← 2D Plan
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.005}
                value={scrollProgress}
                onChange={(e) => updateProgress(parseFloat(e.target.value))}
                className="flex-1 accent-[#FF4D00] h-1.5 bg-neutral-300 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] font-mono font-bold text-[#FF4D00]">
                {Math.round(scrollProgress * 100)}% 3D
              </span>
            </div>

            {/* Room pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {project.rooms.map((room, idx) => {
                const isActive = idx === activeRoomIndex && scrollProgress > 0.25;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      const total = project.rooms.length;
                      const targetProg = 0.28 + (idx / Math.max(1, total - 1)) * 0.60;
                      updateProgress(targetProg);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap border transition ${
                      isActive
                        ? "bg-[#FF4D00] text-white border-[#FF4D00] font-bold shadow-sm"
                        : "bg-white/80 border-neutral-300 text-neutral-700 hover:bg-white"
                    }`}
                  >
                    0{idx + 1} {room.name}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* 1-CLICK AI 4K RENDER PREVIEW MODAL (STORY-THUAN-BP16) */}
      <AIRenderPreviewModal
        isOpen={isAIRenderModalOpen}
        onClose={() => setIsAIRenderModalOpen(false)}
        originalSnapshotUrl={renderOriginalSnapshot}
        renderResultUrl={renderResultUrl}
        isLoading={isAIRendering}
        error={renderError}
        styleName={SYSTEM_STYLE_PRESETS[project.specs.style]?.vietnameseName || project.specs.style}
        enhancedPrompt={renderEnhancedPrompt}
        executionTimeMs={renderExecutionTimeMs}
        resolution={renderResolution || undefined}
        modelName={renderModel || undefined}
        loadingStage={renderStage || undefined}
      />

    </div>
  );
}
