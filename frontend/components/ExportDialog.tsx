"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "./M3Node";
import styles from "./ExportDialog.module.css";
import type { Palette } from "@/lib/tokens";
import type { ExportFormat } from "@/lib/screenExport";

type Props = {
  palette: Palette;
  width: number;
  height: number;
  frameName?: string;
  initialTab?: "code" | "image";
  prompt?: string;
  onClose: () => void;
  onExport: (
    format: ExportFormat,
    width: number,
    height: number,
    mode?: "folder" | "code"
  ) => Promise<string | void>;
};

type OptionItem = {
  id: ExportFormat | "prompt-copy";
  title: string;
  badge?: string;
  category: "code" | "image";
  desc: string;
};

const CODE_OPTIONS: OptionItem[] = [
  {
    id: "html-folder",
    title: "HTML & CSS",
    badge: "FOLDER / WEB",
    category: "code",
    desc: "A ready-to-use folder with HTML, CSS and setup instructions.",
  },
  {
    id: "react-folder",
    title: "ReactJS",
    badge: "VITE + REACT",
    category: "code",
    desc: "A React project with Vite, components and styles.",
  },
  {
    id: "angular-folder",
    title: "Angular",
    badge: "STANDALONE",
    category: "code",
    desc: "A standalone Angular component with template and styles.",
  },
  {
    id: "all-folder",
    title: "All frameworks (.zip)",
    badge: "FULL BUNDLE",
    category: "code",
    desc: "HTML, React and Angular projects in one ZIP file.",
  },
  {
    id: "html",
    title: "Copy source code",
    badge: "COPY CODE",
    category: "code",
    desc: "Copy the generated markup and styles to your project.",
  },
  {
    id: "prompt-copy",
    title: "AI coding prompt",
    badge: "PROMPT",
    category: "code",
    desc: "Copy a design prompt for your AI coding tools.",
  },
];

const IMAGE_OPTIONS: OptionItem[] = [
  {
    id: "png",
    title: "PNG image",
    badge: "PNG",
    category: "image",
    desc: "High-quality image with transparency.",
  },
  {
    id: "jpeg",
    title: "JPEG image",
    badge: "JPEG (COMPRESSED)",
    category: "image",
    desc: "A smaller image optimized for the web.",
  },
  {
    id: "pdf",
    title: "PDF document",
    badge: "DOCUMENT (PDF)",
    category: "image",
    desc: "A single-page PDF at your selected dimensions.",
  },
];

const PRESETS = [
  { label: "Original", w: 0, h: 0 },
  { label: "Mobile (390×844)", w: 390, h: 844 },
  { label: "Tablet (768×1024)", w: 768, h: 1024 },
  { label: "Desktop (1440×900)", w: 1440, h: 900 },
];

const SCALES = [1, 1.5, 2, 3];

export function ExportDialog({
  palette,
  width: initialWidth,
  height: initialHeight,
  frameName = "Screen",
  initialTab = "code",
  prompt = "",
  onClose,
  onExport,
}: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"code" | "image">(initialTab);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | "prompt-copy">(
    initialTab === "code" ? "html-folder" : "png"
  );
  const [exportMode, setExportMode] = useState<"folder" | "code">("folder");
  const [webLang, setWebLang] = useState<"html" | "react" | "angular">("html");

  const [w, setW] = useState(initialWidth);
  const [h, setH] = useState(initialHeight);
  const [locked, setLocked] = useState(true);
  const [currentScale, setCurrentScale] = useState<number>(1);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Synchronize format when tab switches
  const handleTabChange = (tab: "code" | "image") => {
    setActiveTab(tab);
    setExportMode("folder");
    setCopiedCode("");
    setCopySuccess(false);
    setError("");
    if (tab === "code") {
      setSelectedFormat("html-folder");
    } else {
      setSelectedFormat("png");
    }
  };

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = modalRef.current;
    dialog?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trapFocus);
    return () => { document.removeEventListener("keydown", trapFocus); previous?.focus(); };
  }, []);

  const applyScale = (scale: number) => {
    setCurrentScale(scale);
    setW(Math.round(initialWidth * scale));
    setH(Math.round(initialHeight * scale));
  };

  const applyPreset = (presetW: number, presetH: number) => {
    if (presetW === 0 && presetH === 0) {
      setW(initialWidth);
      setH(initialHeight);
      setCurrentScale(1);
    } else {
      setW(presetW);
      setH(presetH);
      setCurrentScale(0);
    }
  };

  const currentOptions = activeTab === "code" ? CODE_OPTIONS : IMAGE_OPTIONS;
  const currentOption = currentOptions.find((o) => o.id === selectedFormat) || currentOptions[0];

  const handleAction = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    setCopySuccess(false);

    try {
      if (selectedFormat === "prompt-copy") {
        if (!prompt) throw new Error("No design prompt is available for this screen.");
        await navigator.clipboard.writeText(prompt);
        setCopySuccess(true);
        return;
      }

      let targetFormat: ExportFormat = selectedFormat as ExportFormat;
      let mode: "folder" | "code" = "folder";

      if (selectedFormat === "html" || selectedFormat === "react" || selectedFormat === "angular") {
        targetFormat = webLang;
        mode = "code";
      } else if (selectedFormat === "html-folder") {
        targetFormat = exportMode === "code" ? "html" : "html-folder";
        mode = exportMode;
      } else if (selectedFormat === "react-folder") {
        targetFormat = exportMode === "code" ? "react" : "react-folder";
        mode = exportMode;
      } else if (selectedFormat === "angular-folder") {
        targetFormat = exportMode === "code" ? "angular" : "angular-folder";
        mode = exportMode;
      }

      const result = await onExport(targetFormat, w, h, mode);

      if (typeof result === "string") {
        setCopiedCode(result);
        try {
          await navigator.clipboard.writeText(result);
          setCopySuccess(true);
        } catch {}
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const getActionButtonText = () => {
    if (busy) return "Exporting…";
    if (copySuccess) return "Copied to clipboard";
    if (selectedFormat === "prompt-copy") return "Copy AI prompt";
    if (selectedFormat === "html" || (["html-folder", "react-folder", "angular-folder"].includes(selectedFormat) && exportMode === "code")) return "Copy code";
    if (selectedFormat === "pdf") return "Download PDF";
    if (selectedFormat === "png") return "Download PNG";
    if (selectedFormat === "jpeg") return "Download JPEG";
    return "Download ZIP";
  };

  return (
    <div className={styles.overlay} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="export-dialog-title" tabIndex={-1} className={styles.dialog}
        style={{ "--surface": palette.surface, "--container": palette.surfaceContainerLow, "--selected": palette.surfaceContainerHigh, "--text": palette.onSurface, "--muted": palette.onSurfaceVariant, "--border": palette.outlineVariant } as CSSProperties}>
        <header className={styles.header}>
          <div><h2 id="export-dialog-title">Export</h2><p>{frameName} <span>· {initialWidth} × {initialHeight} px</span></p></div>
          <button className={styles.iconButton} onClick={onClose} disabled={busy} aria-label="Close export"><Icon name="close" size={20} /></button>
        </header>
        <div className={styles.tabs} role="tablist" aria-label="Export type">
          {(["code", "image"] as const).map((tab) => <button key={tab} id={`export-tab-${tab}`} role="tab" aria-selected={activeTab === tab} aria-controls="export-panel" onClick={() => handleTabChange(tab)} disabled={busy}><Icon name={tab === "code" ? "code" : "image"} size={18} />{tab === "code" ? "Code" : "Image & PDF"}</button>)}
        </div>
        <div id="export-panel" role="tabpanel" aria-labelledby={`export-tab-${activeTab}`} className={styles.body}>
          <fieldset disabled={busy} className={styles.formats}>
            <legend>Format</legend>
            {currentOptions.map((option) => <label key={option.id} className={styles.option}>
              <input type="radio" name="export-format" checked={selectedFormat === option.id} onChange={() => { setSelectedFormat(option.id); setCopiedCode(""); setCopySuccess(false); setError(""); }} />
              <span>{option.title}</span>
            </label>)}
          </fieldset>
          {activeTab === "code" && selectedFormat !== "all-folder" && selectedFormat !== "prompt-copy" && <fieldset disabled={busy} className={styles.settings}>
            <legend>Output</legend>
            {selectedFormat === "html" ? <div className={styles.segments}>{(["html", "react", "angular"] as const).map((language) => <button key={language} aria-pressed={webLang === language} onClick={() => { setWebLang(language); setCopiedCode(""); setCopySuccess(false); }}>{language.toUpperCase()}</button>)}</div> : <div className={styles.segments}>
              <button aria-pressed={exportMode === "folder"} onClick={() => { setExportMode("folder"); setCopySuccess(false); }}>Project folder</button>
              <button aria-pressed={exportMode === "code"} onClick={() => { setExportMode("code"); setCopySuccess(false); }}>Copy code</button>
            </div>}
          </fieldset>}
          {selectedFormat !== "prompt-copy" && <fieldset disabled={busy} className={styles.settings}>
            <legend>Dimensions</legend>
            <div className={styles.dimensionHeading}><span>Size in pixels</span><button className={styles.lock} aria-label="Lock aspect ratio" aria-pressed={locked} onClick={() => setLocked(!locked)}><Icon name={locked ? "lock" : "lock_open"} size={16} />{locked ? "Locked" : "Unlocked"}</button></div>
            <div className={styles.dimensions}>
              <label>Width<input type="number" min={1} max={8192} value={w} onChange={(event) => { const value = Math.max(1, Math.min(8192, Number(event.target.value) || 1)); setW(value); if (locked && initialWidth > 0) setH(Math.max(1, Math.round(value * initialHeight / initialWidth))); setCurrentScale(0); }} /></label>
              <span aria-hidden="true">×</span>
              <label>Height<input type="number" min={1} max={8192} value={h} onChange={(event) => { const value = Math.max(1, Math.min(8192, Number(event.target.value) || 1)); setH(value); if (locked && initialHeight > 0) setW(Math.max(1, Math.round(value * initialWidth / initialHeight))); setCurrentScale(0); }} /></label>
            </div>
            <div className={styles.sizing}><div className={styles.scales} aria-label="Export scale">{SCALES.map((scale) => <button key={scale} aria-pressed={currentScale === scale} onClick={() => applyScale(scale)}>{scale}×</button>)}</div><label className={styles.preset}>Preset<select defaultValue="0x0" onChange={(event) => { const [width, height] = event.target.value.split("x").map(Number); applyPreset(width, height); }}>{PRESETS.map((preset) => <option key={preset.label} value={`${preset.w}x${preset.h}`}>{preset.label}</option>)}</select></label></div>
          </fieldset>}
          <p className={styles.description}>{currentOption.desc}</p>
          {copiedCode && <div className={styles.codePreview}><label htmlFor="export-code">Generated code</label><textarea id="export-code" readOnly value={copiedCode} onFocus={(event) => event.currentTarget.select()} /></div>}
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
        <footer className={styles.footer}><button className={styles.action} disabled={busy} onClick={handleAction}>{busy ? <span className={styles.spinner} /> : <Icon name={copySuccess ? "check" : selectedFormat === "prompt-copy" || selectedFormat === "html" || (activeTab === "code" && exportMode === "code") ? "content_copy" : "download"} size={18} />}<span>{getActionButtonText()}</span></button></footer>
      </div>
    </div>
  );
}
