"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ALL_DEVICES,
  DESKTOP_DEVICES,
  TABLET_DEVICES,
  DEVICE_BRANDS,
  DeviceConfig,
  findDeviceById,
} from "@/constants/devices";

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
  const [tab, setTab] = useState<"mobile" | "tablet" | "desktop">("mobile");
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
      : tab === "tablet"
      ? TABLET_DEVICES
      : DEVICE_BRANDS.find((b) => b.brand === activeBrand)?.devices ?? [];

  // Label shown on trigger button
  const triggerLabel = activeDevice
    ? landscape
      ? `${activeDevice.name} (Ngang)`
      : activeDevice.name
    : "Chọn thiết bị Viewport";

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
      style={{ position: "relative", display: "inline-flex", width: "100%" }}
    >
      {/* ── Trigger button (Pure text, no icon) ── */}
      <button
        id="device-selector-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Chọn preset thiết bị"
        style={{
          width: "100%",
          height: 36,
          padding: "0 12px",
          borderRadius: 10,
          border: `1px solid ${activeDevice ? primaryColor : "rgba(128,128,128,0.25)"}`,
          background: activeDevice ? `${primaryColor}14` : "transparent",
          color: activeDevice ? primaryColor : onSurfaceColor,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          whiteSpace: "nowrap",
          transition: "border-color 160ms, background 160ms",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {triggerLabel}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {activeDevice && (
            <span style={{ fontSize: 11, opacity: 0.7 }}>
              {landscape ? `${activeDevice.height}×${activeDevice.width}` : `${activeDevice.width}×${activeDevice.height}`}
            </span>
          )}
          <span style={{ fontSize: 11, opacity: 0.6 }}>▾</span>
        </div>
      </button>

      {/* ── Dropdown panel ── */}
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
              width: 340,
              background: surfaceContainerColor,
              borderRadius: 16,
              boxShadow: "0 12px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15)",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Header: Tabs (Pure text) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "8px 10px",
                borderBottom: `1px solid rgba(128,128,128,0.12)`,
              }}
            >
              {btn("Mobile", tab === "mobile", () => setTab("mobile"))}
              {btn("Tablet", tab === "tablet", () => setTab("tablet"))}
              {btn("Desktop", tab === "desktop", () => setTab("desktop"))}
              <span style={{ flex: 1 }} />
              {/* Orientation toggle */}
              {tab !== "desktop" && (
                <button
                  title={landscape ? "Chuyển sang Portrait" : "Chuyển sang Landscape"}
                  onClick={() => setLandscape((v) => !v)}
                  style={{
                    height: 26,
                    padding: "0 8px",
                    borderRadius: 13,
                    border: "none",
                    background: landscape ? `${primaryColor}22` : "rgba(128,128,128,0.12)",
                    color: landscape ? primaryColor : onSurfaceVariantColor,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {landscape ? "Ngang" : "Dọc"}
                </button>
              )}
              {/* Clear selection */}
              {activeDeviceId && (
                <button
                  title="Xoá preset thiết bị"
                  onClick={handleClear}
                  style={{
                    height: 26,
                    padding: "0 8px",
                    borderRadius: 13,
                    border: "none",
                    background: "rgba(128,128,128,0.12)",
                    color: onSurfaceVariantColor,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  Mặc định
                </button>
              )}
            </div>

            {/* Brand tabs (mobile only) */}
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

            {/* Device list (Pure text) */}
            <div style={{ maxHeight: 280, overflowY: "auto", padding: "6px 8px 8px" }}>
              {visibleDevices.map((device) => {
                const w = landscape && tab !== "desktop" ? device.height : device.width;
                const h = landscape && tab !== "desktop" ? device.width : device.height;
                const isActive = device.id === activeDeviceId;
                return (
                  <button
                    key={device.id}
                    onClick={() => handleSelect(device)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "none",
                      background: isActive ? `${primaryColor}18` : "transparent",
                      color: isActive ? primaryColor : onSurfaceColor,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      textAlign: "left",
                      transition: "background 120ms",
                      marginBottom: 2,
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, lineHeight: 1.3 }}>
                        {device.name}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
                        {w} × {h} · {device.aspectRatio}
                      </div>
                    </div>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: primaryColor,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: `${primaryColor}20`,
                        }}
                      >
                        Đang chọn
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
