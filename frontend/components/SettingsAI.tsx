"use client";

import { useEffect, useState } from "react";
import {
  AiSettings,
  Provider,
  PROVIDERS,
  loadAiSettings,
  loadProviderSettings,
  providerSpec,
  saveAiSettings,
} from "@/lib/ai";
import s from "@/app/settings/settings.module.css";

const PROVIDER_MARKS: Record<Provider, string> = {
  openai: "AI",
  gemini: "G",
  claude: "C",
  deepseek: "DS",
};

export default function SettingsAI() {
  const [config, setConfig] = useState<AiSettings | null>(null);
  const [message, setMessage] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error" | "">("");
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setConfig(loadAiSettings());
  }, []);

  if (!config) {
    return <section className={s.card} aria-busy="true"><div className={s.skeletonRow} /></section>;
  }

  const activeConfig = config;
  const selectedProvider = providerSpec(activeConfig.provider);
  const hasSavedKey = Boolean(activeConfig.key.trim());

  function selectProvider(provider: Provider) {
    setConfig(loadProviderSettings(provider));
    setMessage("");
    setFeedbackTone("");
    setShow(false);
  }

  function showFeedback(text: string, tone: "success" | "error") {
    setMessage(text);
    setFeedbackTone(tone);
  }

  async function testConnection() {
    if (!activeConfig.key.trim() || !activeConfig.model.trim()) {
      showFeedback("Nhập API key và model trước khi kiểm tra.", "error");
      return;
    }

    setTesting(true);
    setMessage("");
    setFeedbackTone("");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"}/ai/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activeConfig),
          signal: AbortSignal.timeout(30000),
        },
      );
      const result = await response.json();
      showFeedback(
        result.message || result.error || "Không thể kiểm tra kết nối.",
        response.ok && result.success !== false ? "success" : "error",
      );
    } catch {
      showFeedback("Không thể kết nối máy chủ AI. Vui lòng thử lại.", "error");
    } finally {
      setTesting(false);
    }
  }

  function saveSettings() {
    const saved = saveAiSettings({ ...activeConfig, key: activeConfig.key.trim(), model: activeConfig.model.trim() });
    showFeedback(
      saved ? "Cấu hình đã lưu trên trình duyệt này." : "Không thể lưu cấu hình trên trình duyệt này.",
      saved ? "success" : "error",
    );
  }

  function clearCurrentKey() {
    const next = { ...activeConfig, key: "" };
    setConfig(next);
    const saved = saveAiSettings(next);
    showFeedback(
      saved ? `Đã xóa key ${selectedProvider.label}.` : "Không thể xóa key.",
      saved ? "success" : "error",
    );
  }

  return (
    <section className={s.card} aria-labelledby="ai-settings-title">
      <header className={s.cardHeader}>
        <div className={s.headingGroup}>
          <span className={s.iconTile} aria-hidden="true">
            <span className="material-symbols-rounded">auto_awesome</span>
          </span>
          <div className={s.headingCopy}>
            <h1 id="ai-settings-title">Cài đặt AI</h1>
            <p>Chọn nhà cung cấp và cấu hình key.</p>
          </div>
        </div>
        <span className={s.badge} data-ready={hasSavedKey}>
          {hasSavedKey ? "Đã nhập key" : "Chưa có key"}
        </span>
      </header>

      <fieldset className="border-0 p-0 m-0">
        <legend className={s.sectionLabel}>Nhà cung cấp</legend>
        <div className={s.providerGrid}>
          {PROVIDERS.map((provider) => (
            <button
              key={provider.key}
              type="button"
              className={s.providerOption}
              aria-pressed={activeConfig.provider === provider.key}
              disabled={testing}
              onClick={() => selectProvider(provider.key)}
            >
              <span className={s.providerMark} aria-hidden="true">{PROVIDER_MARKS[provider.key]}</span>
              <span className={s.providerName}>{provider.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <p className={s.providerHint}>
        <span>{selectedProvider.hint || selectedProvider.label}</span>
        {selectedProvider.keysUrl && (
          <a href={selectedProvider.keysUrl} target="_blank" rel="noopener noreferrer">
            Lấy API key <span className="material-symbols-rounded" aria-hidden="true">open_in_new</span>
          </a>
        )}
      </p>

      <label>
        API key
        <span className={s.fieldWithAction}>
          <input
            type={show ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={activeConfig.key}
            disabled={testing}
            placeholder="Nhập API key"
            onChange={(event) => {
              setConfig({ ...activeConfig, key: event.target.value });
              setMessage("");
              setFeedbackTone("");
            }}
          />
          <button
            type="button"
            aria-label={show ? "Ẩn API key" : "Hiện API key"}
            aria-pressed={show}
            disabled={testing}
            onClick={() => setShow((value) => !value)}
          >
            <span className="material-symbols-rounded" aria-hidden="true">{show ? "visibility_off" : "visibility"}</span>
          </button>
        </span>
      </label>

      <label>
        Model
        <input
          list={`models-${activeConfig.provider}`}
          value={activeConfig.model}
          disabled={testing}
          placeholder="Nhập model ID"
          onChange={(event) => setConfig({ ...activeConfig, model: event.target.value })}
        />
        <datalist id={`models-${activeConfig.provider}`}>
          {selectedProvider.suggestedModels.map((model) => <option key={model} value={model} />)}
        </datalist>
      </label>

      <div className={s.keyNote}>
        <span className="material-symbols-rounded" aria-hidden="true">lock</span>
        <span>Key được lưu riêng trong trình duyệt này.</span>
      </div>

      <div className={s.actions}>
        <button type="button" className={s.primary} disabled={testing || !activeConfig.model.trim()} onClick={saveSettings}>
          <span className="material-symbols-rounded" aria-hidden="true">save</span>Lưu
        </button>
        <button type="button" disabled={testing} onClick={testConnection}>
          <span className="material-symbols-rounded" aria-hidden="true">bolt</span>
          {testing ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
        </button>
        <button type="button" className="dangerButton" disabled={testing || !hasSavedKey} onClick={clearCurrentKey}>
          Xóa key
        </button>
      </div>

      <p className={s.feedback} role="status" aria-live="polite" data-tone={feedbackTone}>
        {message}
      </p>
    </section>
  );
}
