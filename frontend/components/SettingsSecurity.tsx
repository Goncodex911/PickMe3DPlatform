"use client";

import { useState } from "react";
import { clearAiKeys } from "@/lib/ai";
import s from "@/app/settings/settings.module.css";

export default function SettingsSecurity({ email }: { email: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function clearKeys() {
    if (!window.confirm("Delete all AI keys saved in this browser?")) return;
    try {
      clearAiKeys();
      setMessage("Saved AI keys were deleted.");
      setError(false);
    } catch {
      setMessage("Could not delete data from this browser.");
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
            <h1 id="security-title">Security</h1>
            <p>Manage your account and access data.</p>
          </div>
        </div>
        <span className={s.badge}>Account</span>
      </header>

      <div className={s.securityRows}>
        <div className={s.securityRow}>
          <span className={s.securityIcon} aria-hidden="true">
            <span className="material-symbols-rounded">account_circle</span>
          </span>
          <div className={s.securityCopy}>
            <h3>Sign-in account</h3>
            <p>{email || "Google account"}</p>
          </div>
          <a className={`${s.buttonLink} ${s.securityAction}`} href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">
            Manage <span className="material-symbols-rounded" aria-hidden="true">open_in_new</span>
          </a>
        </div>

        <div className={s.securityRow}>
          <span className={s.securityIcon} aria-hidden="true">
            <span className="material-symbols-rounded">key</span>
          </span>
          <div className={s.securityCopy}>
            <h3>API key AI</h3>
            <p>Keys are stored only in this browser.</p>
          </div>
          <button type="button" className={s.dangerButton} onClick={clearKeys}>Delete keys</button>
        </div>

        <div className={s.securityRow}>
          <span className={s.securityIcon} aria-hidden="true">
            <span className="material-symbols-rounded">devices</span>
          </span>
          <div className={s.securityCopy}>
            <h3>Current session</h3>
            <p>Sign out of your account on this device.</p>
          </div>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <p className={s.feedback} role="status" aria-live="polite" data-tone={error ? "error" : message ? "success" : ""}>
        {message}
      </p>
    </section>
  );
}
