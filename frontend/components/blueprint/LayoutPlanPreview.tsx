"use client";

import React from "react";
import type { LayoutData, RoomCategory } from "@/lib/floorplan-types";

/** Màu nền phòng theo công năng (tông nhạt, hợp nền giấy kem của trang 3D) */
const ROOM_FILL: Partial<Record<RoomCategory, string>> = {
  living: "#fbe3d3",
  bedroom: "#dfe9f8",
  kitchen: "#fbefc8",
  bath: "#d9f0ee",
  outdoor: "#e1efd6",
  hallway: "#eeeae2",
  utility: "#e9e3f3",
  office: "#f3e1ea"
};

export interface LayoutPlanPreviewProps {
  layout: LayoutData;
  className?: string;
}

/**
 * Sơ đồ mặt bằng 2D vẽ từ LayoutData (kết quả AI / nắn chỉnh): phòng, tường, ô cửa.
 * Trục SVG: x = x (m), y = z (m), giống góc nhìn từ trên xuống của bản vẽ.
 */
export default function LayoutPlanPreview({ layout, className = "" }: LayoutPlanPreviewProps) {
  const points: [number, number][] = [
    ...layout.walls.flatMap((w) => [w.start, w.end]),
    ...layout.rooms.flatMap((r) => r.polygon)
  ];
  if (points.length === 0) {
    return <div className={`flex items-center justify-center text-xs text-neutral-400 ${className}`}>Chưa có dữ liệu mặt bằng</div>;
  }

  const minX = Math.min(...points.map((p) => p[0]));
  const maxX = Math.max(...points.map((p) => p[0]));
  const minZ = Math.min(...points.map((p) => p[1]));
  const maxZ = Math.max(...points.map((p) => p[1]));
  const span = Math.max(maxX - minX, maxZ - minZ, 1);
  const pad = span * 0.06;
  const fontSize = span * 0.03;
  const wallById = new Map(layout.walls.map((w) => [w.id, w]));

  return (
    <svg
      viewBox={`${minX - pad} ${minZ - pad} ${maxX - minX + pad * 2} ${maxZ - minZ + pad * 2}`}
      className={className}
      role="img"
      aria-label={`Sơ đồ mặt bằng AI nhận diện: ${layout.rooms.length} phòng, ${layout.walls.length} đoạn tường`}
    >
      {/* Phòng */}
      {layout.rooms.map((room) => {
        const cx = room.polygon.reduce((s, p) => s + p[0], 0) / Math.max(1, room.polygon.length);
        const cz = room.polygon.reduce((s, p) => s + p[1], 0) / Math.max(1, room.polygon.length);
        const xs = room.polygon.map((p) => p[0]);
        const roomW = Math.max(...xs) - Math.min(...xs);
        const label = room.vietnamese_name || room.name;
        return (
          <g key={room.id}>
            <polygon
              points={room.polygon.map((p) => `${p[0]},${p[1]}`).join(" ")}
              fill={ROOM_FILL[room.category] ?? "#efece6"}
              stroke="#c9c2b4"
              strokeWidth={span * 0.002}
            />
            {roomW > fontSize * 4 && (
              <text
                x={cx}
                y={cz}
                fontSize={fontSize}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#3f3a33"
                style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
              >
                {label.length > 22 ? `${label.slice(0, 21)}…` : label}
              </text>
            )}
          </g>
        );
      })}

      {/* Tường */}
      {layout.walls.map((w) => (
        <line
          key={w.id}
          x1={w.start[0]}
          y1={w.start[1]}
          x2={w.end[0]}
          y2={w.end[1]}
          stroke="#1d1d1f"
          strokeWidth={Math.max(w.thickness, span * 0.006)}
          strokeLinecap="square"
        />
      ))}

      {/* Ô cửa: đoạn màu cam dọc theo tường chứa nó */}
      {layout.openings.map((op) => {
        const wall = op.wall_id ? wallById.get(op.wall_id) : undefined;
        let ux = 1;
        let uz = 0;
        if (wall) {
          const len = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]) || 1;
          ux = (wall.end[0] - wall.start[0]) / len;
          uz = (wall.end[1] - wall.start[1]) / len;
        }
        const half = (op.width || 1) / 2;
        return (
          <line
            key={op.id}
            x1={op.center[0] - ux * half}
            y1={op.center[1] - uz * half}
            x2={op.center[0] + ux * half}
            y2={op.center[1] + uz * half}
            stroke={op.type === "window" ? "#3b82f6" : "#FF4D00"}
            strokeWidth={Math.max((wall?.thickness ?? 0.2) * 1.4, span * 0.008)}
          />
        );
      })}
    </svg>
  );
}
