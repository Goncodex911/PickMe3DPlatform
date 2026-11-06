"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsAI from "@/components/SettingsAI";
import SettingsSecurity from "@/components/SettingsSecurity";
import BillingHistory from "@/components/BillingHistory";
import styles from "./settings.module.css";

const SETTINGS_TABS = [
  ["ai", "AI"],
  ["security", "Bảo mật"],
  ["billing", "Biên lai"],
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [tab, setTab] = useState("ai");
  const focusAdjacentTab = (currentIndex: number, direction: -1 | 1) => {
    const nextIndex = (currentIndex + direction + SETTINGS_TABS.length) % SETTINGS_TABS.length;
    const nextTab = SETTINGS_TABS[nextIndex][0];
    setTab(nextTab);
    window.location.hash = nextTab;
    document.getElementById(`settings-tab-${nextTab}`)?.focus();
  };
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      setTab(["ai", "security", "billing"].includes(hash) ? hash : "ai");
    };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("pickme3d_user");
    if (!storedUser || !localStorage.getItem("pickme3d_token")) {
      router.push("/");
      return;
    }
    try {
      const parsedUser = JSON.parse(storedUser);
      if (!parsedUser) { router.replace("/login/"); return; }
      setUser(parsedUser);
      setLoading(false);
    } catch {
      router.replace("/login/");
    }
  }, [router]);

  if (loading) return null;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.tabs} aria-label="Các mục cài đặt" role="tablist">
          {SETTINGS_TABS.map(([id, label], index) =>
            <button
              key={id}
              type="button"
              role="tab"
              id={`settings-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="settings-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => { setTab(id); window.location.hash = id; }}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") { event.preventDefault(); focusAdjacentTab(index, 1); }
                if (event.key === "ArrowLeft") { event.preventDefault(); focusAdjacentTab(index, -1); }
              }}
            >{label}</button>)}
        </nav>
        <div className={styles.panel} id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`} tabIndex={0}>
          {tab === "ai" && <SettingsAI />}
          {tab === "security" && <SettingsSecurity email={user.email} />}
          {tab === "billing" && <BillingHistory />}

        </div>
      </div>
    </main>
  );
}
