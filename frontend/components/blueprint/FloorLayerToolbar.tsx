"use client";

import React from "react";
import { ArchitecturalStyle } from "@/lib/floorplan-types";

export type CameraMode = "orbit" | "top_down" | "walkthrough" | "dollhouse";

/** Bảng mở rộng (flyout) hiện bên phải thanh công cụ */
export type RailPanel = "samples" | "layers" | "style";

export interface FloorLayerToolbarProps {
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  showCeilings: boolean;
  onToggleCeilings: () => void;
  showWalls: boolean;
  onToggleWalls: () => void;
  showFurniture: boolean;
  onToggleFurniture: () => void;
  showLandscape: boolean;
  onToggleLandscape: () => void;
  isRulerActive: boolean;
  onToggleRuler: () => void;
  measuredDistance: number | null;
  onClearMeasurement: () => void;
  onTriggerAIRender?: () => void;
  isAIRendering?: boolean;
  currentStyle?: ArchitecturalStyle;
  onSelectStyle?: (style: ArchitecturalStyle) => void;
  /** Bảng đang mở (do component cha quản lý để component này không cần hook) */
  openPanel?: RailPanel | null;
  onOpenPanelChange?: (panel: RailPanel | null) => void;
  // Tệp
  onUploadClick?: () => void;
  onExportGLB?: () => void;
  isExportingGLB?: boolean;
  onSelectArchetype?: (archId: string) => void;
  onResetToDemo?: () => void;
  // Hiển thị
  isWireframe?: boolean;
  onToggleWireframe?: () => void;
  // Thu phóng
  zoomScale?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
}

const MATERIAL_STYLES: { id: ArchitecturalStyle; label: string }[] = [
  { id: "scandinavian", label: "Bắc Âu Gỗ Sồi" },
  { id: "luxury_marble", label: "Marble Travertine" },
  { id: "casa_serra", label: "Mộc Mạc Brutalism" },
  { id: "tropical", label: "Nhiệt Đới Xanh" }
];

const SAMPLE_PLANS: { id: string; label: string }[] = [
  { id: "casa-serra", label: "Biệt thự Casa Serra" },
  { id: "nha-lau-2", label: "Nhà phố – Mặt bằng lầu 2" },
  { id: "modern-townhouse-5x20", label: "Nhà phố hiện đại 5×20m" },
  { id: "luxury-apartment-2br", label: "Căn hộ cao cấp 2 phòng ngủ" }
];

const CAMERA_MODES: { id: CameraMode; label: string; hint: string; icon: IconName }[] = [
  { id: "top_down", label: "Mặt Bằng (2D)", hint: "Nhìn thẳng từ trên xuống", icon: "plan" },
  { id: "dollhouse", label: "Sa Bàn (1.5m)", hint: "Cắt tường ở cao độ 1.5m", icon: "cutaway" },
  { id: "orbit", label: "Xoay 360°", hint: "Xoay tự do toàn cảnh", icon: "orbit" },
  { id: "walkthrough", label: "Đi Dạo (WASD)", hint: "Góc nhìn thứ nhất", icon: "walk" }
];

/* ------------------------------------------------------------------ */
/* Icons (SVG nét, kế thừa màu chữ)                                    */
/* ------------------------------------------------------------------ */

type IconName =
  | "upload" | "samples" | "download" | "plan" | "cutaway" | "orbit" | "walk"
  | "layers" | "palette" | "ruler" | "sparkle" | "plus" | "minus" | "fit" | "spinner";

const ICON_PATHS: Record<Exclude<IconName, "spinner">, React.ReactNode> = {
  upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
  samples: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  download: <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>,
  plan: <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 12h9v9" /><path d="M12 3v5" /></>,
  cutaway: <><path d="M3 9 12 4l9 5" /><path d="M5 10v9h14v-9" /><path d="M5 14h14" strokeDasharray="2 2" /></>,
  orbit: <><ellipse cx="12" cy="12" rx="9" ry="4" /><path d="M12 3v18" /><path d="m17.5 7.5 1.5-1.5 0.5 2" /></>,
  walk: <><circle cx="13" cy="4" r="2" /><path d="m9 21 2-6 3 3v3" /><path d="m7 12 3-4 4 1 3 3" /><path d="m11 15 1-5" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.6 0-1.2-1-1.6-1-2.6 0-.9.7-1.3 1.6-1.3H16a5 5 0 0 0 5-5C21 6.4 17 3 12 3Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  ruler: <><path d="M3 17 17 3l4 4L7 21l-4-4Z" /><path d="m7 13 2 2" /><path d="m10 10 2 2" /><path d="m13 7 2 2" /></>,
  sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <><path d="M5 12h14" /></>,
  fit: <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>
};

function Icon({ name }: { name: IconName }) {
  if (name === "spinner") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Thành phần con                                                       */
/* ------------------------------------------------------------------ */

interface RailButtonProps {
  icon: IconName;
  label: string;
  hint?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  accent?: boolean;
  expanded?: boolean;
}

/** Nút icon vuông, nhãn hiện ra bên phải khi rê chuột / focus bàn phím. */
function RailButton({ icon, label, hint, onClick, active = false, disabled = false, accent = false, expanded }: RailButtonProps) {
  const tone = accent
    ? "bg-[#FF4D00] text-white hover:bg-[#e04400] shadow-sm"
    : active
      ? "bg-neutral-900 text-white shadow-sm"
      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900";

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={expanded === undefined ? active : undefined}
        aria-expanded={expanded}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D00]/60 disabled:opacity-50 disabled:cursor-wait ${tone}`}
      >
        <Icon name={icon} />
      </button>
      {/* Nhãn chú thích */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-40 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[11px] font-sans text-white shadow-lg opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0"
      >
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-[10px] text-neutral-300 font-normal">{hint}</span>}
      </span>
    </div>
  );
}

function RailDivider() {
  return <div className="w-6 h-px bg-neutral-200 my-1" aria-hidden="true" />;
}

function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      data-no-scroll="true"
      className="w-60 rounded-2xl bg-white/95 backdrop-blur-xl border border-neutral-200 shadow-2xl p-3 font-sans text-xs animate-in fade-in slide-in-from-left-1 duration-150"
    >
      <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-2 px-1">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function OptionRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition ${
        selected ? "bg-neutral-900 text-white font-semibold" : "text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      <span className="truncate">{label}</span>
      {selected && <span aria-hidden="true">✓</span>}
    </button>
  );
}

function ToggleRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-800 hover:bg-neutral-100 transition"
    >
      <span>{label}</span>
      <span className={`relative inline-flex h-4 w-7 rounded-full transition ${on ? "bg-neutral-900" : "bg-neutral-300"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${on ? "left-3.5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Thanh công cụ dọc bên trái                                           */
/* ------------------------------------------------------------------ */

export default function FloorLayerToolbar({
  cameraMode,
  onCameraModeChange,
  showCeilings,
  onToggleCeilings,
  showWalls,
  onToggleWalls,
  showFurniture,
  onToggleFurniture,
  showLandscape,
  onToggleLandscape,
  isRulerActive,
  onToggleRuler,
  measuredDistance,
  onClearMeasurement,
  onTriggerAIRender,
  isAIRendering = false,
  currentStyle = "casa_serra",
  onSelectStyle,
  openPanel = null,
  onOpenPanelChange,
  onUploadClick,
  onExportGLB,
  isExportingGLB = false,
  onSelectArchetype,
  onResetToDemo,
  isWireframe = false,
  onToggleWireframe,
  zoomScale = 1,
  onZoomIn,
  onZoomOut,
  onZoomFit
}: FloorLayerToolbarProps) {
  const togglePanel = (panel: RailPanel) => onOpenPanelChange?.(openPanel === panel ? null : panel);
  const closePanel = () => onOpenPanelChange?.(null);
  const hasZoom = Boolean(onZoomIn || onZoomOut || onZoomFit);

  return (
    <div className="contents">
      {/* Lớp nền trong suốt: bấm ra ngoài để đóng bảng */}
      {openPanel && (
        <div className="absolute inset-0 z-[25]" aria-hidden="true" onClick={closePanel} />
      )}

      <nav
        aria-label="Công cụ bản vẽ 3D"
        data-no-scroll="true"
        className="absolute left-2 sm:left-3 top-14 sm:top-16 bottom-3 z-30 flex items-start pointer-events-none select-none"
      >
        {/* THANH NÚT */}
        {/* Không đặt overflow mặc định để nhãn chú thích không bị cắt; chỉ cuộn khi màn hình thấp */}
        <div className="pointer-events-auto max-h-full [@media(max-height:740px)]:overflow-y-auto [scrollbar-width:none] rounded-2xl bg-white/95 backdrop-blur-xl border border-neutral-200 shadow-xl p-1.5 flex flex-col items-center gap-0.5">
          {/* Tệp */}
          {onUploadClick && <RailButton icon="upload" label="Tải bản vẽ 2D" hint="AI quét tường, cửa, phòng" onClick={onUploadClick} />}
          {onSelectArchetype && (
            <RailButton
              icon="samples"
              label="Mặt bằng mẫu"
              onClick={() => togglePanel("samples")}
              active={openPanel === "samples"}
              expanded={openPanel === "samples"}
            />
          )}
          {onExportGLB && (
            <RailButton
              icon={isExportingGLB ? "spinner" : "download"}
              label={isExportingGLB ? "Đang xuất GLB..." : "Xuất 3D (.GLB)"}
              hint="Nén Draco khi đã đăng nhập"
              onClick={onExportGLB}
              disabled={isExportingGLB}
            />
          )}
          {(onUploadClick || onSelectArchetype || onExportGLB) && <RailDivider />}

          {/* Chế độ xem */}
          {CAMERA_MODES.map((mode) => (
            <RailButton
              key={mode.id}
              icon={mode.icon}
              label={mode.label}
              hint={mode.hint}
              active={cameraMode === mode.id}
              onClick={() => onCameraModeChange(mode.id)}
            />
          ))}
          <RailDivider />

          {/* Hiển thị */}
          <RailButton
            icon="layers"
            label="Lớp hiển thị"
            hint="Trần, tường, nội thất, sân vườn"
            onClick={() => togglePanel("layers")}
            active={openPanel === "layers"}
            expanded={openPanel === "layers"}
          />
          {onSelectStyle && (
            <RailButton
              icon="palette"
              label="Phong cách vật liệu"
              onClick={() => togglePanel("style")}
              active={openPanel === "style"}
              expanded={openPanel === "style"}
            />
          )}
          <RailButton
            icon="ruler"
            label={isRulerActive ? "Tắt thước đo" : "Thước đo 3D"}
            hint="Bấm 2 điểm để đo khoảng cách"
            onClick={onToggleRuler}
            active={isRulerActive}
          />

          {/* AI */}
          {onTriggerAIRender && (
            <>
              <RailDivider />
              <RailButton
                icon={isAIRendering ? "spinner" : "sparkle"}
                label={isAIRendering ? "Đang render AI..." : "AI Render phối cảnh"}
                hint="Gemini dựng ảnh chân thực"
                onClick={onTriggerAIRender}
                disabled={isAIRendering}
                accent
              />
            </>
          )}

          {/* Thu phóng */}
          {hasZoom && (
            <>
              <RailDivider />
              {onZoomIn && <RailButton icon="plus" label="Phóng to" onClick={onZoomIn} />}
              <span className="text-[10px] font-mono font-bold text-neutral-500 leading-none py-0.5" aria-live="polite">
                {Math.round(zoomScale * 100)}%
              </span>
              {onZoomOut && <RailButton icon="minus" label="Thu nhỏ" onClick={onZoomOut} />}
              {onZoomFit && <RailButton icon="fit" label="Khớp màn hình" hint="Về bản vẽ 2D, hướng Bắc" onClick={onZoomFit} />}
            </>
          )}
        </div>

        {/* BẢNG MỞ RỘNG bên phải thanh */}
        {openPanel && (
          <div className="pointer-events-auto ml-2">
            {openPanel === "samples" && onSelectArchetype && (
              <PanelShell title="Mặt bằng mẫu">
                {SAMPLE_PLANS.map((plan) => (
                  <OptionRow
                    key={plan.id}
                    label={plan.label}
                    selected={false}
                    onClick={() => {
                      onSelectArchetype(plan.id);
                      closePanel();
                    }}
                  />
                ))}
                {onResetToDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetToDemo();
                      closePanel();
                    }}
                    className="w-full mt-1 px-2.5 py-2 rounded-lg text-left text-neutral-500 hover:bg-neutral-100 border-t border-neutral-100"
                  >
                    ↺ Khôi phục bản demo ban đầu
                  </button>
                )}
              </PanelShell>
            )}

            {openPanel === "layers" && (
              <PanelShell title="Lớp hiển thị">
                <ToggleRow label="Trần / Mái" on={showCeilings} onClick={onToggleCeilings} />
                <ToggleRow label="Tường" on={showWalls} onClick={onToggleWalls} />
                <ToggleRow label="Nội thất" on={showFurniture} onClick={onToggleFurniture} />
                <ToggleRow label="Sân vườn" on={showLandscape} onClick={onToggleLandscape} />
                {onToggleWireframe && <ToggleRow label="Khung dây (Wireframe)" on={isWireframe} onClick={onToggleWireframe} />}
              </PanelShell>
            )}

            {openPanel === "style" && onSelectStyle && (
              <PanelShell title="Phong cách vật liệu">
                {MATERIAL_STYLES.map((st) => (
                  <OptionRow key={st.id} label={st.label} selected={currentStyle === st.id} onClick={() => onSelectStyle(st.id)} />
                ))}
              </PanelShell>
            )}
          </div>
        )}
      </nav>

      {/* KẾT QUẢ THƯỚC ĐO (hiện khi đang đo) */}
      {(isRulerActive || measuredDistance !== null) && (
        <div
          data-no-scroll="true"
          className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-emerald-500/40 shadow-md text-xs font-mono"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          {measuredDistance !== null ? (
            <>
              <span className="font-bold text-emerald-700">{measuredDistance.toFixed(2)}</span>
              <span className="text-emerald-700">{" m"}</span>
              <button type="button" onClick={onClearMeasurement} className="text-neutral-400 hover:text-red-500 px-1" aria-label="Xoá kết quả đo">
                ✕
              </button>
            </>
          ) : (
            <span className="text-neutral-700">Bấm 2 điểm trong không gian 3D để đo</span>
          )}
        </div>
      )}

      {/* WALKTHROUGH FLOATING TOAST (First-Person Walkthrough instruction) */}
      {cameraMode === "walkthrough" && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto px-4 py-2 rounded-full bg-neutral-900/90 backdrop-blur-md border border-neutral-700 text-white text-xs font-mono flex items-center gap-3 shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <span className="text-amber-400 font-bold">🎮 Chế độ Đi Dạo (First-Person):</span>
          <span>Dùng <strong>W-A-S-D</strong> hoặc phím mũi tên để di chuyển • Giữ chuột để xoay nhìn 360°</span>
        </div>
      )}
    </div>
  );
}
