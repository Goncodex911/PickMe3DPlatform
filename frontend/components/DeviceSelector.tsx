"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ALL_DEVICES,
  DESKTOP_DEVICES,
  DEVICE_BRANDS,
  DeviceConfig,
  findDeviceById,
} from "@/constants/devices";

// ─── Brand icons (using Material Symbols text fallback) ───────────────────────
const BRAND_ICON: Record<string, string> = {
  Apple: "apple",
  Samsung: "smartphone",
  Xiaomi: "smartphone",
  Google: "google",
  OPPO: "smartphone",
  Generic: "laptop",
};

interface Props {
  /** Currently active device preset id (or null = no preset / free canvas) */
  activeDeviceId: string | null;
  /** Called when user picks a device */
  onSelect: (device: DeviceConfig | null) => void;
  /** Theme palette colours passed from Editor */
  surfaceColor: string;
  surfaceContainerColor: string;
  onSurfaceColor: string;
  onSurfaceVariantColor: string;
  primaryColor: string;
  onPrimaryColor: string;
}

export default function DeviceSelector({
  activeDeviceId,
  onSelect,
  surfaceColor,
  surfaceContainerColor,
  onSurfaceColor,
  onSurfaceVariantColor,
  primaryColor,
  onPrimaryColor,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"mobile" | "desktop">("mobile");
  const [activeBrand, setActiveBrand] = useState<string>("Apple");
  const [landscape, setLandscape] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeDevice = activeDeviceId ? findDeviceById(activeDeviceId) : null;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open]);

  const handleSelect = (device: DeviceConfig) => {
    const effective: DeviceConfig = landscape
      ? { ...device, width: device.height, height: device.width }
      : device;
    onSelect(effective);
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setOpen(false);
  };

  const visibleDevices: DeviceConfig[] =
    tab === "desktop"
      ? DESKTOP_DEVICES
      : DEVICE_BRANDS.find((b) => b.brand === activeBrand)?.devices ?? [];

  // ─── Label shown on trigger button ───────────────────────────────────────
  const triggerLabel = activeDevice
    ? landscape
      ? `${activeDevice.name} ↔`
      : activeDevice.name
    : "Viewport";

  const btn = (
    label: string,
    active: boolean,
    onClick: () => void,
    small = false,
  ) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        height: small ? 28 : 32,
        padding: small ? "0 10px" : "0 14px",
        borderRadius: small ? 14 : 16,
        border: "none",
        background: active ? primaryColor : "transparent",
        color: active ? onPrimaryColor : onSurfaceVariantColor,
        fontSize: small ? 12 : 13,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background 160ms, color 160ms",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={panelRef}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      {/* ── Trigger button ─────────────────────────────────────── */}
      <button
        id="device-selector-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Chọn preset thiết bị"
        style={{
          height: 38,
          padding: "0 12px 0 10px",
          borderRadius: 19,
          border: `1.5px solid ${activeDevice ? primaryColor : "rgba(128,128,128,0.25)"}`,
          background: activeDevice ? `${primaryColor}18` : "transparent",
          color: activeDevice ? primaryColor : onSurfaceVariantColor,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
          transition: "border-color 160ms, background 160ms",
        }}
      >
        <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 18, lineHeight: 1 }}>
          {activeDevice?.type === "desktop" ? "laptop_mac" : "smartphone"}
        </span>
        <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
          {triggerLabel}
        </span>
        {activeDevice && (
          <span style={{ fontSize: 11, opacity: 0.7 }}>
            {landscape ? `${activeDevice.height}×${activeDevice.width}` : `${activeDevice.width}×${activeDevice.height}`}
          </span>
        )}
        <span
          style={{
            fontFamily: "Material Symbols Rounded",
            fontSize: 16,
            lineHeight: 1,
            opacity: 0.6,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 200ms",
          }}
        >
          expand_more
        </span>
      </button>

      {/* ── Dropdown panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Chọn preset thiết bị"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: 0,
              zIndex: 200,
              width: 360,
              background: surfaceContainerColor,
              borderRadius: 20,
              boxShadow: "0 12px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.10)",
              overflow: "hidden",
            }}
          >
            {/* ── Header: Mobile / Desktop tab ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "10px 10px 8px",
                borderBottom: `1px solid rgba(128,128,128,0.12)`,
              }}
            >
              {btn("📱 Mobile", tab === "mobile", () => setTab("mobile"))}
              {btn("💻 Laptop / Desktop", tab === "desktop", () => setTab("desktop"))}
              <span style={{ flex: 1 }} />
              {/* Orientation toggle — only for mobile */}
              {tab === "mobile" && (
                <button
                  title={landscape ? "Chuyển sang Portrait" : "Chuyển sang Landscape"}
                  onClick={() => setLandscape((v) => !v)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    border: "none",
                    background: landscape ? `${primaryColor}22` : "transparent",
                    color: landscape ? primaryColor : onSurfaceVariantColor,
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Material Symbols Rounded",
                      fontSize: 20,
                      lineHeight: 1,
                      transform: landscape ? "rotate(90deg)" : "none",
                      transition: "transform 200ms",
                    }}
                  >
                    stay_current_portrait
                  </span>
                </button>
              )}
              {/* Clear selection */}
              {activeDeviceId && (
                <button
                  title="Xoá preset thiết bị"
                  onClick={handleClear}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    border: "none",
                    background: "transparent",
                    color: onSurfaceVariantColor,
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 18, lineHeight: 1 }}>
                    close
                  </span>
                </button>
              )}
            </div>

            {/* ── Brand tabs (mobile only) ── */}
            {tab === "mobile" && (
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  padding: "6px 10px",
                  overflowX: "auto",
                  borderBottom: `1px solid rgba(128,128,128,0.10)`,
                }}
              >
                {DEVICE_BRANDS.map(({ brand }) =>
                  btn(brand, activeBrand === brand, () => setActiveBrand(brand), true),
                )}
              </div>
            )}

            {/* ── Device list ── */}
            <div style={{ maxHeight: 320, overflowY: "auto", padding: "6px 8px 10px" }}>
              {visibleDevices.map((device) => {
                const w = landscape && tab === "mobile" ? device.height : device.width;
                const h = landscape && tab === "mobile" ? device.width : device.height;
                const isActive = device.id === activeDeviceId;
                return (
                  <button
                    key={device.id}
                    onClick={() => handleSelect(device)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 12,
                      border: "none",
                      background: isActive ? `${primaryColor}18` : "transparent",
                      color: isActive ? primaryColor : onSurfaceColor,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                      transition: "background 120ms",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(128,128,128,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Material Symbols Rounded",
                        fontSize: 20,
                        lineHeight: 1,
                        flexShrink: 0,
                        opacity: 0.7,
                        color: isActive ? primaryColor : onSurfaceVariantColor,
                      }}
                    >
                      {device.type === "desktop" ? "laptop_mac" : "smartphone"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, lineHeight: 1.3 }}>
                        {device.name}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
                        {w} × {h} &nbsp;·&nbsp; {device.aspectRatio}
                        {device.hasNotchOrIsland && " · Dynamic Island"}
                      </div>
                    </div>
                    {isActive && (
                      <span
                        style={{
                          fontFamily: "Material Symbols Rounded",
                          fontSize: 18,
                          lineHeight: 1,
                          color: primaryColor,
                        }}
                      >
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
