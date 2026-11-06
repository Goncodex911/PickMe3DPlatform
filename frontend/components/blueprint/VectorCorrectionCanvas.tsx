"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  LayoutData,
  WallSegment,
  OpeningSpec,
  RoomPolygon
} from "@/lib/floorplan-types";
import { cleanupLayoutGeometry } from "@/lib/floorplan-analyzer";

export interface VectorCorrectionCanvasProps {
  initialLayout: LayoutData;
  onConfirm: (updatedLayout: LayoutData) => void;
  onClose: () => void;
}

type ToolMode =
  | "select"
  | "add_ext_wall"
  | "add_int_wall"
  | "add_door"
  | "add_window"
  | "delete";

export default function VectorCorrectionCanvas({
  initialLayout,
  onConfirm,
  onClose
}: VectorCorrectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Editable Layout State
  const [layout, setLayout] = useState<LayoutData>(() =>
    JSON.parse(JSON.stringify(initialLayout))
  );

  // Viewport navigation
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tool states
  const [activeTool, setActiveTool] = useState<ToolMode>("select");
  const [autoOrtho, setAutoOrtho] = useState<boolean>(true);
  const [bgOpacity, setBgOpacity] = useState<number>(0.65);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);

  // Dragging vertex state
  const [draggedVertex, setDraggedVertex] = useState<{
    wallId: string;
    isStart: boolean;
  } | null>(null);

  // New wall drawing state
  const [drawingWallStart, setDrawingWallStart] = useState<[number, number] | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<[number, number]>([0, 0]);

  // Background image loader
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const url = layout.metadata.original_blueprint_url;
    if (url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setBgImage(img);
      img.src = url;
    }
  }, [layout.metadata.original_blueprint_url]);

  const { width: bWidth, length: bLength } = layout.metadata.dimensions;

  // Coordinate Conversion Helpers
  const getScale = useCallback(
    (canvas: HTMLCanvasElement) => {
      const padding = 80;
      const scaleX = (canvas.width - padding) / Math.max(1, bWidth);
      const scaleZ = (canvas.height - padding) / Math.max(1, bLength);
      return Math.min(scaleX, scaleZ) * zoom;
    },
    [bWidth, bLength, zoom]
  );

  const worldToScreen = useCallback(
    (worldX: number, worldZ: number, canvas: HTMLCanvasElement): [number, number] => {
      const scale = getScale(canvas);
      const cx = canvas.width / 2 + pan.x;
      const cy = canvas.height / 2 + pan.y;
      return [cx + worldX * scale, cy + worldZ * scale];
    },
    [getScale, pan]
  );

  const screenToWorld = useCallback(
    (screenX: number, screenZ: number, canvas: HTMLCanvasElement): [number, number] => {
      const scale = getScale(canvas);
      const cx = canvas.width / 2 + pan.x;
      const cy = canvas.height / 2 + pan.y;
      const wx = (screenX - cx) / scale;
      const wz = (screenZ - cy) / scale;
      return [Number(wx.toFixed(3)), Number(wz.toFixed(3))];
    },
    [getScale, pan]
  );

  // Redraw Canvas
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Dark Blueprint Background
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale = getScale(canvas);

    // 2. Draw 1m / 5m Grid Lines
    ctx.lineWidth = 1;
    const [minScreenX, minScreenZ] = worldToScreen(-bWidth / 2 - 2, -bLength / 2 - 2, canvas);
    const [maxScreenX, maxScreenZ] = worldToScreen(bWidth / 2 + 2, bLength / 2 + 2, canvas);

    // Minor 1m grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    for (let x = Math.floor(-bWidth / 2 - 2); x <= Math.ceil(bWidth / 2 + 2); x += 1) {
      const [sx] = worldToScreen(x, 0, canvas);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, canvas.height);
      ctx.stroke();
    }
    for (let z = Math.floor(-bLength / 2 - 2); z <= Math.ceil(bLength / 2 + 2); z += 1) {
      const [, sz] = worldToScreen(0, z, canvas);
      ctx.beginPath();
      ctx.moveTo(0, sz);
      ctx.lineTo(canvas.width, sz);
      ctx.stroke();
    }

    // 3. Render Original Background Blueprint Image
    if (bgImage) {
      ctx.save();
      ctx.globalAlpha = bgOpacity;
      const [imgLeft, imgTop] = worldToScreen(-bWidth / 2, -bLength / 2, canvas);
      const [imgRight, imgBottom] = worldToScreen(bWidth / 2, bLength / 2, canvas);
      const imgW = imgRight - imgLeft;
      const imgH = imgBottom - imgTop;
      ctx.drawImage(bgImage, imgLeft, imgTop, imgW, imgH);
      ctx.restore();
    }

    // 4. Render Room Polygons (Semi-transparent fills)
    for (const room of layout.rooms) {
      if (!room.polygon || room.polygon.length < 3) continue;

      ctx.save();
      ctx.beginPath();
      const [startSx, startSz] = worldToScreen(room.polygon[0][0], room.polygon[0][1], canvas);
      ctx.moveTo(startSx, startSz);
      for (let i = 1; i < room.polygon.length; i++) {
        const [sx, sz] = worldToScreen(room.polygon[i][0], room.polygon[i][1], canvas);
        ctx.lineTo(sx, sz);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Room Name & Area Label
      const polyXs = room.polygon.map((p) => p[0]);
      const polyZs = room.polygon.map((p) => p[1]);
      const avgX = polyXs.reduce((a, b) => a + b, 0) / polyXs.length;
      const avgZ = polyZs.reduce((a, b) => a + b, 0) / polyZs.length;
      const [labelSx, labelSz] = worldToScreen(avgX, avgZ, canvas);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(room.vietnamese_name || room.name, labelSx, labelSz - 4);
      if (room.area_m2) {
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(`${room.area_m2} m²`, labelSx, labelSz + 10);
      }
      ctx.restore();
    }

    // 5. Render Neon Walls
    for (const wall of layout.walls) {
      const [x1, z1] = wall.start;
      const [x2, z2] = wall.end;
      const [sx1, sz1] = worldToScreen(x1, z1, canvas);
      const [sx2, sz2] = worldToScreen(x2, z2, canvas);

      const isSelected = selectedWallId === wall.id;
      const isExterior = wall.type === "exterior";

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sx1, sz1);
      ctx.lineTo(sx2, sz2);

      // Neon Line Styling
      if (isSelected) {
        ctx.strokeStyle = "#fde047"; // Yellow highlight
        ctx.lineWidth = isExterior ? 8 : 6;
        ctx.shadowColor = "#fde047";
        ctx.shadowBlur = 10;
      } else if (isExterior) {
        ctx.strokeStyle = "#38bdf8"; // Neon Sky Blue
        ctx.lineWidth = 6;
        ctx.shadowColor = "rgba(56, 189, 248, 0.4)";
        ctx.shadowBlur = 6;
      } else {
        ctx.strokeStyle = "#fb923c"; // Neon Orange
        ctx.lineWidth = 4;
        ctx.shadowColor = "rgba(251, 146, 60, 0.4)";
        ctx.shadowBlur = 4;
      }

      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();

      // Vertex Handles (Circle dots)
      for (const [vx, vz] of [
        [sx1, sz1],
        [sx2, sz2]
      ]) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(vx, vz, isSelected ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "#fde047" : "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 6. Render Openings (Doors & Windows)
    for (const op of layout.openings) {
      const [cx, cz] = op.center;
      const [scx, scz] = worldToScreen(cx, cz, canvas);
      const isDoor = op.type === "door";
      const isSelected = selectedOpeningId === op.id;

      ctx.save();
      ctx.translate(scx, scz);
      ctx.rotate((-((op.rotation_deg || 0) * Math.PI)) / 180);

      const opWidthPx = (op.width || 1.0) * scale;
      const opThickPx = 10;

      // Opening Indicator Box
      ctx.beginPath();
      ctx.rect(-opWidthPx / 2, -opThickPx / 2, opWidthPx, opThickPx);
      ctx.fillStyle = isSelected
        ? "rgba(253, 224, 71, 0.6)"
        : isDoor
        ? "rgba(52, 211, 153, 0.5)" // Emerald
        : "rgba(96, 165, 250, 0.5)"; // Blue
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#fde047" : isDoor ? "#34d399" : "#60a5fa";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Door Swing Arc
      if (isDoor) {
        ctx.beginPath();
        ctx.arc(-opWidthPx / 2, -opThickPx / 2, opWidthPx, 0, Math.PI / 2);
        ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
        ctx.setLineDash([3, 3]);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 7. Render Active Drawing Wall Preview
    if (drawingWallStart) {
      const [sx1, sz1] = worldToScreen(drawingWallStart[0], drawingWallStart[1], canvas);
      const [sx2, sz2] = worldToScreen(mouseWorldPos[0], mouseWorldPos[1], canvas);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sx1, sz1);
      ctx.lineTo(sx2, sz2);
      ctx.strokeStyle = activeTool === "add_ext_wall" ? "#38bdf8" : "#fb923c";
      ctx.lineWidth = activeTool === "add_ext_wall" ? 6 : 4;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.restore();
    }
  }, [
    layout,
    zoom,
    pan,
    bgImage,
    bgOpacity,
    selectedWallId,
    selectedOpeningId,
    drawingWallStart,
    mouseWorldPos,
    activeTool,
    bWidth,
    bLength,
    getScale,
    worldToScreen
  ]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawScene();
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawScene]);

  // Request redraw on state change
  useEffect(() => {
    drawScene();
  }, [drawScene]);

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((z) => Math.max(0.4, Math.min(4.0, z * factor)));
  };

  // Find vertex or wall under screen coordinates
  const hitTest = (sx: number, sy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    // 1. Check vertices first (within 12px)
    for (const wall of layout.walls) {
      const [s1x, s1z] = worldToScreen(wall.start[0], wall.start[1], canvas);
      if (Math.hypot(sx - s1x, sy - s1z) <= 12) {
        return { type: "vertex" as const, wallId: wall.id, isStart: true };
      }

      const [s2x, s2z] = worldToScreen(wall.end[0], wall.end[1], canvas);
      if (Math.hypot(sx - s2x, sy - s2z) <= 12) {
        return { type: "vertex" as const, wallId: wall.id, isStart: false };
      }
    }

    // 2. Check wall segments (distance to segment <= 10px)
    for (const wall of layout.walls) {
      const [s1x, s1z] = worldToScreen(wall.start[0], wall.start[1], canvas);
      const [s2x, s2z] = worldToScreen(wall.end[0], wall.end[1], canvas);

      const dx = s2x - s1x;
      const dz = s2z - s1z;
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) continue;

      const t = Math.max(0, Math.min(1, ((sx - s1x) * dx + (sy - s1z) * dz) / lenSq));
      const projX = s1x + t * dx;
      const projZ = s1z + t * dz;
      const dist = Math.hypot(sx - projX, sy - projZ);

      if (dist <= 10) {
        return { type: "wall" as const, wallId: wall.id };
      }
    }

    return null;
  };

  // Mouse Down Handler
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Middle click or Space+Click: Pan canvas
    if (e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: sx - pan.x, y: sy - pan.y });
      return;
    }

    const [wx, wz] = screenToWorld(sx, sy, canvas);
    const hit = hitTest(sx, sy);

    if (activeTool === "select") {
      if (hit?.type === "vertex") {
        setDraggedVertex({ wallId: hit.wallId, isStart: hit.isStart });
        setSelectedWallId(hit.wallId);
      } else if (hit?.type === "wall") {
        setSelectedWallId(hit.wallId);
      } else {
        setSelectedWallId(null);
        setSelectedOpeningId(null);
        // Start pan if clicked on empty space
        setIsPanning(true);
        setPanStart({ x: sx - pan.x, y: sy - pan.y });
      }
    } else if (activeTool === "add_ext_wall" || activeTool === "add_int_wall") {
      if (!drawingWallStart) {
        setDrawingWallStart([wx, wz]);
      } else {
        // Complete the new wall
        const newWall: WallSegment = {
          id: `wall_${Date.now()}`,
          type: activeTool === "add_ext_wall" ? "exterior" : "interior",
          start: drawingWallStart,
          end: [wx, wz],
          thickness: activeTool === "add_ext_wall" ? 0.22 : 0.11,
          height: layout.metadata.dimensions.default_ceiling_height || 3.3,
          openings: []
        };
        setLayout((prev) => ({
          ...prev,
          walls: [...prev.walls, newWall]
        }));
        setDrawingWallStart(null);
      }
    } else if (activeTool === "delete") {
      if (hit?.type === "wall") {
        setLayout((prev) => ({
          ...prev,
          walls: prev.walls.filter((w) => w.id !== hit.wallId),
          openings: prev.openings.filter((op) => op.wall_id !== hit.wallId)
        }));
      }
    } else if (activeTool === "add_door" || activeTool === "add_window") {
      const newOp: OpeningSpec = {
        id: `op_${Date.now()}`,
        type: activeTool === "add_door" ? "door" : "window",
        center: [wx, wz],
        width: activeTool === "add_door" ? 1.0 : 1.6,
        height: activeTool === "add_door" ? 2.2 : 1.5,
        sill_height: activeTool === "add_door" ? 0.0 : 0.9,
        door_type: activeTool === "add_door" ? "single_swing_wood" : undefined,
        window_type: activeTool === "add_window" ? "sliding_glass" : undefined
      };
      setLayout((prev) => ({
        ...prev,
        openings: [...prev.openings, newOp]
      }));
      setActiveTool("select");
    }
  };

  // Mouse Move Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isPanning) {
      setPan({ x: sx - panStart.x, y: sy - panStart.y });
      return;
    }

    const [wx, wz] = screenToWorld(sx, sy, canvas);
    setMouseWorldPos([wx, wz]);

    // Dragging a vertex point
    if (draggedVertex) {
      let targetX = wx;
      let targetZ = wz;

      // Snap to orthogonal if enabled
      if (autoOrtho) {
        const wall = layout.walls.find((w) => w.id === draggedVertex.wallId);
        if (wall) {
          const anchor = draggedVertex.isStart ? wall.end : wall.start;
          const dx = Math.abs(targetX - anchor[0]);
          const dz = Math.abs(targetZ - anchor[1]);
          if (dx < 0.25) targetX = anchor[0];
          if (dz < 0.25) targetZ = anchor[1];
        }
      }

      setLayout((prev) => {
        const nextWalls = prev.walls.map((w) => {
          if (w.id === draggedVertex.wallId) {
            return {
              ...w,
              start: draggedVertex.isStart ? [targetX, targetZ] as [number, number] : w.start,
              end: !draggedVertex.isStart ? [targetX, targetZ] as [number, number] : w.end
            };
          }
          return w;
        });
        return { ...prev, walls: nextWalls };
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedVertex(null);
  };

  // Auto clean geometry
  const handleAutoClean = () => {
    const cleaned = cleanupLayoutGeometry(layout);
    setLayout(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0f17] text-white">
      {/* 1. TOP HEADER TOOLBAR */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-[#12161f]">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
          <h2 className="text-sm font-semibold tracking-wide text-neutral-100 uppercase font-mono">
            Bộ Nắn Chỉnh Vector Mặt Bằng 2D (Correction Canvas)
          </h2>
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
            {layout.metadata.project_name}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Blueprint Opacity */}
          <div className="flex items-center gap-1.5 mr-3 text-xs text-neutral-400 font-mono">
            <span>Ảnh nền:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgOpacity}
              onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
              className="w-20 accent-amber-400 h-1 bg-neutral-700 rounded"
              title="Độ mờ ảnh bản vẽ gốc"
            />
            <span className="w-8 text-right">{Math.round(bgOpacity * 100)}%</span>
          </div>

          {/* Auto Clean Button */}
          <button
            onClick={handleAutoClean}
            className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-200 transition flex items-center gap-1.5"
            title="Tự động nắn góc vuông 90° và hít nối các đầu tường hở < 15cm"
          >
            <span>⚡ Tự Động Nắn Vuông</span>
          </button>

          {/* Ortho Snap Toggle */}
          <button
            onClick={() => setAutoOrtho((o) => !o)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition flex items-center gap-1.5 ${
              autoOrtho
                ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                : "border-neutral-700 bg-neutral-800 text-neutral-400"
            }`}
          >
            <span>{autoOrtho ? "✓ Hút Góc Vuông (ON)" : "Hút Góc Vuông (OFF)"}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE WITH FLOATING TOOLBOX & CANVAS */}
      <div className="relative flex-1 w-full h-full overflow-hidden" ref={containerRef}>
        {/* Floating Tool Palette */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 p-1.5 rounded-xl border border-neutral-800 bg-[#161b26]/90 backdrop-blur-md shadow-xl text-xs font-mono">
          <button
            onClick={() => setActiveTool("select")}
            className={`px-3 py-2 rounded-lg text-left transition flex items-center gap-2 ${
              activeTool === "select" ? "bg-amber-400 text-neutral-950 font-bold" : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <span>✋</span>
            <span>Chọn / Nắn Đỉnh</span>
          </button>

          <button
            onClick={() => {
              setActiveTool("add_ext_wall");
              setDrawingWallStart(null);
            }}
            className={`px-3 py-2 rounded-lg text-left transition flex items-center gap-2 ${
              activeTool === "add_ext_wall" ? "bg-sky-500 text-white font-bold" : "text-sky-300 hover:bg-neutral-800"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>+ Tường Bao (220mm)</span>
          </button>

          <button
            onClick={() => {
              setActiveTool("add_int_wall");
              setDrawingWallStart(null);
            }}
            className={`px-3 py-2 rounded-lg text-left transition flex items-center gap-2 ${
              activeTool === "add_int_wall" ? "bg-orange-500 text-white font-bold" : "text-orange-300 hover:bg-neutral-800"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <span>+ Tường Ngăn (110mm)</span>
          </button>

          <button
            onClick={() => setActiveTool("add_door")}
            className={`px-3 py-2 rounded-lg text-left transition flex items-center gap-2 ${
              activeTool === "add_door" ? "bg-emerald-500 text-white font-bold" : "text-emerald-300 hover:bg-neutral-800"
            }`}
          >
            <span>🚪</span>
            <span>+ Gắn Cửa Đi</span>
          </button>

          <button
            onClick={() => setActiveTool("add_window")}
            className={`px-3 py-2 rounded-lg text-left transition flex items-center gap-2 ${
              activeTool === "add_window" ? "bg-blue-500 text-white font-bold" : "text-blue-300 hover:bg-neutral-800"
            }`}
          >
            <span>🪟</span>
            <span>+ Gắn Cửa Sổ</span>
          </button>

          <button
            onClick={() => setActiveTool("delete")}
            className={`px-3 py-2 rounded-lg text-left transition flex items-center gap-2 ${
              activeTool === "delete" ? "bg-red-500 text-white font-bold" : "text-red-300 hover:bg-neutral-800"
            }`}
          >
            <span>🗑️</span>
            <span>Xóa Đối Tượng</span>
          </button>
        </div>

        {/* Cursor World Coordinates HUD */}
        <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg border border-neutral-800 bg-[#161b26]/90 backdrop-blur-md text-[11px] font-mono text-neutral-400 flex items-center gap-3">
          <span>X: <strong className="text-white">{mouseWorldPos[0]}m</strong></span>
          <span>Z: <strong className="text-white">{mouseWorldPos[1]}m</strong></span>
          <span>Zoom: <strong className="text-amber-400">{Math.round(zoom * 100)}%</strong></span>
        </div>

        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full h-full cursor-crosshair block select-none"
        />
      </div>

      {/* 3. FOOTER BAR */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800 bg-[#12161f]">
        <div className="text-xs text-neutral-400 font-mono flex items-center gap-4">
          <span>Số tường: <strong className="text-white">{layout.walls.length}</strong></span>
          <span>Số cửa: <strong className="text-white">{layout.openings.length}</strong></span>
          <span>Số phòng: <strong className="text-white">{layout.rooms.length}</strong></span>
          <span className="text-[11px] text-neutral-500">
            • Giữ chuột giữa / Shift để cuộn bản vẽ • Cuộn chuột để phóng to/thu nhỏ
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white transition"
          >
            Quay lại
          </button>
          <button
            onClick={() => onConfirm(layout)}
            className="px-6 py-2 rounded-xl font-mono font-bold text-xs bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
          >
            <span>✓ Xác Nhận & Dựng 3D</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    </div>
  );
}

