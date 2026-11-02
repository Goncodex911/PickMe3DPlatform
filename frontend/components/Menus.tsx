"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Palette } from "@/lib/tokens";
import { LANGS, Lang, t, useLang } from "@/lib/i18n";
import { IconBtn } from "./ui";
import { Icon } from "./M3Node";
import UserAvatar from "./UserAvatar";
import { fetchMyProfileApi, mergeCurrentUserProfile } from "@/lib/userService";

const EASE = [0.2, 0, 0, 1] as const;

/** An icon button with a small menu anchored to it. `side` is where the menu opens. */
export function Popover({
  p,
  icon,
  title,
  side = "down",
  size = 40,
  children,
}: {
  p: Palette;
  icon: string;
  title: string;
  side?: "down" | "right";
  size?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const anchor: React.CSSProperties =
    side === "down"
      ? { top: size + 8, right: 0, transformOrigin: "top right" }
      : { left: size + 8, bottom: 0, transformOrigin: "bottom left" };
  const hidden = side === "down" ? { opacity: 0, y: -6, scale: 0.96 } : { opacity: 0, x: -6, scale: 0.96 };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconBtn icon={icon} p={p} on={open} onClick={() => setOpen((o) => !o)} title={title} size={size} />
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={hidden}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={hidden}
            transition={{ duration: 0.16, ease: EASE }}
            style={{
              position: "absolute",
              padding: 6,
              borderRadius: 18,
              background: p.surfaceContainerLow,
              boxShadow: "0 6px 20px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)",
              zIndex: 60,
              ...anchor,
            }}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LangMenu({ p, onLang, side, size }: { p: Palette; onLang: (l: Lang) => void; side?: "down" | "right"; size?: number }) {
  const lang = useLang();
  return (
    <Popover p={p} icon="translate" title={t("language", lang)} side={side} size={size}>
      {(close) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 140 }}>
          {LANGS.map((l) => {
            const on = l.key === lang;
            return (
              <button
                key={l.key}
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  onLang(l.key);
                  close();
                }}
                className="m3-press"
                style={{
                  height: 40,
                  padding: "0 14px 0 10px",
                  borderRadius: 12,
                  border: "none",
                  background: on ? p.secondaryContainer : "transparent",
                  color: on ? p.onSecondaryContainer : p.onSurface,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ width: 18, display: "inline-flex" }}>{on && <Icon name="check" size={18} />}</span>
                {l.label}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}

export function ProfileMenu({ p, size = 40, side = "down" }: { p: Palette; size?: number; side?: "down" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let active = true;
    let cachedUser: any = null;
    try {
      cachedUser = JSON.parse(localStorage.getItem("pickme3d_user") || "null");
      setUser(cachedUser);
    } catch { }

    void fetchMyProfileApi().then((profile) => {
      if (!active || !profile) return;
      let latestCachedUser = cachedUser || {};
      try {
        latestCachedUser = JSON.parse(localStorage.getItem("pickme3d_user") || "null") || latestCachedUser;
      } catch { }
      const refreshedUser = mergeCurrentUserProfile(latestCachedUser, profile);
      localStorage.setItem("pickme3d_user", JSON.stringify(refreshedUser));
      setUser(refreshedUser);
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      // Don't close if clicking inside modal
      const modalElement = document.getElementById("profile-modal-root");
      if (modalElement && modalElement.contains(e.target as Node)) return;
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = () => {
    localStorage.removeItem("pickme3d_token");
    localStorage.removeItem("pickme3d_user");
    window.location.reload();
  };

  const anchor: React.CSSProperties =
    side === "down"
      ? { top: size + 8, right: 0, transformOrigin: "top right" }
      : { left: size + 8, bottom: 0, transformOrigin: "bottom left" };
  const hidden = side === "down" ? { opacity: 0, y: -6, scale: 0.96 } : { opacity: 0, x: -6, scale: 0.96 };

  return (
    <>
      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((o) => !o)}
          title="Profile"
          className="m3-press"
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            border: "none",
            padding: 0,
            background: open ? p.secondaryContainer : "transparent",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          <UserAvatar
            picture={user?.picture}
            googlePicture={user?.googlePicture}
            name={user?.name}
            email={user?.email}
            size={size - 4}
            alt="Avatar"
          />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              role="menu"
              initial={hidden}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={hidden}
              transition={{ duration: 0.16, ease: EASE }}
              style={{
                position: "absolute",
                padding: 6,
                borderRadius: 18,
                background: p.surfaceContainerLow,
                boxShadow: "0 6px 20px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)",
                zIndex: 60,
                minWidth: 160,
                ...anchor,
              }}
            >
              <div style={{ padding: "8px 12px", borderBottom: `1px solid ${p.outlineVariant}`, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: p.onSurface }}>{user?.name || "Người dùng"}</div>
                <div style={{ fontSize: 12, color: p.onSurfaceVariant }}>{user?.email}</div>
              </div>
              {user?.role === "admin" && (
                <button
                  onClick={() => {
                    window.location.href = "/admin";
                  }}
                  className="m3-press"
                  style={{
                    width: "100%",
                    height: 40,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: "none",
                    background: "rgba(99, 102, 241, 0.12)",
                    color: "#818cf8",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  <Icon name="admin_panel_settings" size={18} />
                  Bảng Quản Trị
                </button>
              )}
              <button
                onClick={() => {
                  window.location.href = "/profile";
                }}
                className="m3-press"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "none",
                  background: "transparent",
                  color: p.onSurface,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 2,
                }}
              >
                <Icon name="person" size={18} />
                Hồ sơ cá nhân
              </button>
              <button
                onClick={() => {
                  window.location.href = "/ui-marketplace/";
                }}
                className="m3-press"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "none",
                  background: "transparent",
                  color: p.onSurface,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 2,
                }}
              >
                <Icon name="storefront" size={18} />
                UI Marketplace
              </button>
              <button
                onClick={() => {
                  window.location.href = "/templates/";
                }}
                className="m3-press"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "none",
                  background: "transparent",
                  color: p.onSurface,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 2,
                }}
              >
                <Icon name="category" size={18} />
                Bộ sưu tập mẫu
              </button>
              <button
                onClick={handleLogout}
                className="m3-press"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "none",
                  background: "transparent",
                  color: p.error,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Icon name="logout" size={18} />
                Đăng xuất
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
