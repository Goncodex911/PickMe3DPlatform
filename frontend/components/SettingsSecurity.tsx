"use client";

import { useState } from "react";
import { clearAiKeys } from "@/lib/ai";
import s from "@/app/settings/settings.module.css";

export default function SettingsSecurity({ email }: { email: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function clearKeys() {
    if (!window.confirm("Xóa tất cả key AI đã lưu trên trình duyệt này?")) return;
    try {
      clearAiKeys();
      setMessage("Đã xóa các key AI đã lưu.");
      setError(false);
    } catch {
      setMessage("Không thể xóa dữ liệu trên trình duyệt này.");
      setError(true);
    }
  }

  function signOut() {
    localStorage.removeItem("pickme3d_token");
    localStorage.removeItem("pickme3d_user");
    window.dispatchEvent(new Event("storage"));
    window.location.assign("/login/");
  }

  return (
    <section className={s.card} aria-labelledby="security-title">
      <header className={s.cardHeader}>
        <div className={s.headingGroup}>
          <span className={s.iconTile} aria-hidden="true">
            <span className="material-symbols-rounded">shield_lock</span>
          </span>
          <div className={s.headingCopy}>
            <h1 id="security-title">Bảo mật</h1>
            <p>Quản lý tài khoản và dữ liệu truy cập.</p>
          </div>
        </div>
        <span className={s.badge}>Tài khoản</span>
      </header>

      <div className={s.securityRows}>
        <div className={s.securityRow}>
          <span className={s.securityIcon} aria-hidden="true">
            <span className="material-symbols-rounded">account_circle</span>
          </span>
          <div className={s.securityCopy}>
            <h3>Tài khoản đăng nhập</h3>
            <p>{email || "Tài khoản Google"}</p>
          </div>
          <a className={`${s.buttonLink} ${s.securityAction}`} href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">
            Quản lý <span className="material-symbols-rounded" aria-hidden="true">open_in_new</span>
          </a>
        </div>

        <div className={s.securityRow}>
          <span className={s.securityIcon} aria-hidden="true">
            <span className="material-symbols-rounded">key</span>
          </span>
          <div className={s.securityCopy}>
            <h3>API key AI</h3>
            <p>Key chỉ được lưu trong trình duyệt này.</p>
          </div>
          <button type="button" className={s.dangerButton} onClick={clearKeys}>Xóa key</button>
        </div>

        <div className={s.securityRow}>
          <span className={s.securityIcon} aria-hidden="true">
            <span className="material-symbols-rounded">devices</span>
          </span>
          <div className={s.securityCopy}>
            <h3>Phiên đăng nhập</h3>
            <p>Đăng xuất khỏi tài khoản trên thiết bị này.</p>
          </div>
          <button type="button" onClick={signOut}>Đăng xuất</button>
        </div>
      </div>

      <p className={s.feedback} role="status" aria-live="polite" data-tone={error ? "error" : message ? "success" : ""}>
        {message}
      </p>
    </section>
  );
}
