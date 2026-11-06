"use client";

import React, { useMemo } from "react";
import {
  Action,
  actionsOf,
  Frame,
  frameSizeOf,
  Group,
  Item,
  layoutOf,
  Palette,
  Transition,
} from "@/lib/tokens";

export interface Wire {
  id: string;
  sourceType: "item" | "frame";
  sourceId: string;
  sourceName: string;
  sourceRect: { x: number; y: number; w: number; h: number };
  targetFrameId: string;
  targetFrameName: string;
  targetRect: { x: number; y: number; w: number; h: number };
  transition: Transition;
  url?: string;
  isBack?: boolean;
}

interface Props {
  frames: Frame[];
  groups: Group[];
  widths?: Record<string, number>;
  zoom?: number;
  panX?: number;
  panY?: number;
  active?: boolean;
  selectedIds?: string[];
  onSelectWire?: (wire: Wire) => void;
  p?: Palette;
}

const TRANSITION_COLORS: Record<Transition | "back", string> = {
  slide: "#3b82f6",      // Blue
  slideLeft: "#0ea5e9",  // Sky
  slideUp: "#06b6d4",    // Cyan
  slideDown: "#14b8a6",  // Teal
  fade: "#8b5cf6",       // Violet
  expand: "#10b981",     // Emerald
  none: "#71717a",       // Gray
  back: "#f59e0b",       // Amber
};

export default function PrototypeWiresOverlay({
  frames,
  groups,
  widths = {},
  zoom = 1,
  panX = 0,
  panY = 0,
  active = true,
  selectedIds = [],
  onSelectWire,
  p,
}: Props) {
  // Collect all wire links between items/frames and target screens
  const wires: Wire[] = useMemo(() => {
    if (!active) return [];

    const frameMap = new Map<string, Frame>();
    frames.forEach((f) => frameMap.set(f.id, f));

    const result: Wire[] = [];

    // Helper to calculate frame bounding box on canvas
    const getFrameRect = (f: Frame) => {
      const sz = frameSizeOf(f);
      return {
        x: f.x ?? 0,
        y: f.y ?? 0,
        w: sz.w,
        h: sz.h,
      };
    };

    // 1. Check frame-level swipe gestures
    frames.forEach((f) => {
      const sourceRect = getFrameRect(f);

      if (f.swipe) {
        Object.entries(f.swipe).forEach(([dir, targetId]) => {
          if (targetId) {
            const isBack = targetId === "back";
            const targetFrame = isBack ? null : frameMap.get(targetId);
            const targetRect = targetFrame
              ? getFrameRect(targetFrame)
              : { x: sourceRect.x + 240, y: sourceRect.y + 120, w: 120, h: 80 };

            result.push({
              id: `wire_swipe_${f.id}_${dir}`,
              sourceType: "frame",
              sourceId: f.id,
              sourceName: `${f.name || "Màn hình"} (Vuốt ${dir.toUpperCase()})`,
              sourceRect,
              targetFrameId: targetId,
              targetFrameName: isBack ? "Quay lại (Back)" : targetFrame?.name || targetId,
              targetRect,
              transition: "slide",
              isBack,
            });
          }
        });
      }
    });

    // 2. Check item-level actions across all groups
    groups.forEach((g) => {
      const placements = layoutOf(g, widths);
      placements.forEach((pl) => {
        const it = pl.item;
        const acts = actionsOf(it);
        acts.forEach(({ slot, action }) => {
          if (action?.to) {
            const isBack = action.to === "back";
            const targetFrame = isBack ? null : frameMap.get(action.to);
            const sourceRect = {
              x: pl.x,
              y: pl.y,
              w: pl.w,
              h: pl.h,
            };

            const targetRect = targetFrame
              ? getFrameRect(targetFrame)
              : { x: sourceRect.x + 200, y: sourceRect.y + 100, w: 100, h: 80 };

            const slotText = slot ? ` [${slot}]` : "";
            result.push({
              id: `wire_item_${it.id}_${slot || "main"}`,
              sourceType: "item",
              sourceId: it.id,
              sourceName: `${it.label || it.kind}${slotText}`,
              sourceRect,
              targetFrameId: action.to,
              targetFrameName: isBack ? "Quay lại (Back)" : targetFrame?.name || action.to,
              targetRect,
              transition: action.transition || "slide",
              url: action.url,
              isBack,
            });
          }
        });
      });
    });

    return result;
  }, [frames, groups, widths, active]);

  if (!active || wires.length === 0) return null;

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 35,
        overflow: "visible",
      }}
    >
      <defs>
        {Object.entries(TRANSITION_COLORS).map(([key, color]) => (
          <marker
            key={key}
            id={`arrow-${key}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill={color} />
          </marker>
        ))}
      </defs>

      {wires.map((wire) => {
        // Source anchor: right-middle of source node
        const startX = (wire.sourceRect.x + wire.sourceRect.w) * zoom + panX;
        const startY = (wire.sourceRect.y + wire.sourceRect.h / 2) * zoom + panY;

        // Target anchor: left-middle of destination frame
        const endX = wire.targetRect.x * zoom + panX;
        const endY = (wire.targetRect.y + Math.min(80, wire.targetRect.h / 2)) * zoom + panY;

        // Curvature calculation
        const dx = Math.abs(endX - startX) * 0.5;
        const cp1X = startX + Math.max(60, dx);
        const cp1Y = startY;
        const cp2X = endX - Math.max(60, dx);
        const cp2Y = endY;

        const pathD = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        const wireColor = wire.isBack
          ? TRANSITION_COLORS.back
          : TRANSITION_COLORS[wire.transition] || "#3b82f6";

        const isSelected = selectedIds.includes(wire.sourceId);

        return (
          <g key={wire.id} style={{ pointerEvents: "auto", cursor: "pointer" }}>
            {/* Wider transparent hit-area for clicking */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              onClick={() => onSelectWire && onSelectWire(wire)}
            />

            {/* Glowing highlight when selected */}
            {isSelected && (
              <path
                d={pathD}
                fill="none"
                stroke={wireColor}
                strokeWidth={7}
                strokeOpacity={0.35}
              />
            )}

            {/* Main wire curve */}
            <path
              d={pathD}
              fill="none"
              stroke={wireColor}
              strokeWidth={isSelected ? 3 : 2}
              strokeDasharray={wire.isBack ? "6 4" : "none"}
              markerEnd={`url(#arrow-${wire.isBack ? "back" : wire.transition})`}
            />

            {/* Animated interaction flow particles */}
            <path
              d={pathD}
              fill="none"
              stroke="#ffffff"
              strokeWidth={2}
              strokeDasharray="4 16"
              strokeOpacity={0.8}
              style={{
                animation: "wireDash 1.2s linear infinite",
              }}
            />

            {/* Connection anchor dot at source */}
            <circle
              cx={startX}
              cy={startY}
              r={4}
              fill={wireColor}
              stroke="#ffffff"
              strokeWidth={1.5}
            />

            {/* Interactive tag label at the midpoint */}
            <g
              transform={`translate(${midX}, ${midY})`}
              onClick={() => onSelectWire && onSelectWire(wire)}
            >
              <rect
                x={-50}
                y={-12}
                width={100}
                height={24}
                rx={12}
                fill="#18181b"
                stroke={wireColor}
                strokeWidth={1.5}
                filter="drop-shadow(0 2px 5px rgba(0,0,0,0.5))"
              />
              <text
                x={0}
                y={4}
                fill="#ffffff"
                fontSize={10}
                fontWeight={600}
                textAnchor="middle"
                style={{ userSelect: "none" }}
              >
                {wire.isBack ? "Quay lại (Back)" : wire.transition}
              </text>
            </g>
          </g>
        );
      })}

      <style>{`
        @keyframes wireDash {
          from {
            stroke-dashoffset: 20;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  );
}
