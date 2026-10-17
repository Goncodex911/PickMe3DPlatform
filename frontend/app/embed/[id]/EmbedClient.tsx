"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

interface TemplateDoc {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  authorName?: string;
  docData?: unknown;
}

interface Props {
  id: string;
}

/**
 * EmbedClient — a clean, full-bleed viewer for embedding a PickMe3D design
 * in a third-party website via <iframe>.
 */
export default function EmbedClient({ id }: Props) {
  const [template, setTemplate] = useState<TemplateDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const themeParam = searchParams.get("theme") || "dark";
  const watermarkParam = searchParams.get("watermark");
  const showWatermark = watermarkParam !== "false" && watermarkParam !== "0";
  const isDark = themeParam !== "light";

  useEffect(() => {
    // 1. If id === "preview", load live preview from localStorage or fallback to SmartWatch Pro
    if (id === "preview") {
      let docTitle = "Mẫu Trưng Bày 3D SmartWatch Pro";
      let docDesc = "Bản xem trước nhúng iframe cho thiết kế PickMe3D (iPhone 16 Pro Max)";
      try {
        const saved = typeof window !== "undefined" ? localStorage.getItem("pickme3d_doc") : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.title) docTitle = parsed.title;
          if (parsed.brief) docDesc = parsed.brief;
        }
      } catch { }

      setTemplate({
        id: "preview",
        title: docTitle,
        description: docDesc,
        authorName: "PickMe3D Creator",
        thumbnailUrl: "",
      });
      setLoading(false);
      return;
    }

    // 2. Fetch template by id from backend
    const controller = new AbortController();
    fetch(`${API_BASE}/templates/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.success && data.data) {
          setTemplate(data.data);
        } else {
          // Graceful fallback template so embed never renders broken
          setTemplate({
            id,
            title: "Mẫu Thiết Kế 3D PickMe3D",
            description: "Thiết kế tương tác được nhúng trực tiếp qua PickMe3D iFrame Widget.",
            authorName: "PickMe3D Creator",
          });
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setTemplate({
            id,
            title: "Mẫu Thiết Kế 3D PickMe3D",
            description: "Thiết kế tương tác được nhúng trực tiếp qua PickMe3D iFrame Widget.",
            authorName: "PickMe3D Creator",
          });
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  const editorUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/editor?editId=${id}`
      : `/editor?editId=${id}`;

  const textColor = isDark ? "#f1f5f9" : "#0f172a";
  const subtextColor = isDark ? "#94a3b8" : "#64748b";
  const descColor = isDark ? "#cbd5e1" : "#334155";
  const bgColor = isDark ? "#07090e" : "#f8fafc";
  const cardBg = isDark
    ? "linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)"
    : "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #f1f5f9 100%)";

  /* ── Shared container style ── */
  const root: React.CSSProperties = {
    width: "100vw",
    height: "100vh",
    background: bgColor,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
    color: textColor,
    transition: "background 0.3s ease, color 0.3s ease",
  };

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div style={root}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "3px solid #ef4444",
            borderTopColor: "transparent",
            animation: "spin 0.9s linear infinite",
          }}
        />
        <p style={{ marginTop: 18, fontSize: 14, color: subtextColor }}>Đang tải thiết kế…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ─── Error state ─── */
  if (error || !template) {
    return (
      <div style={root}>
        <span
          style={{
            fontFamily: "Material Symbols Rounded",
            fontSize: 56,
            color: "#ef4444",
            lineHeight: 1,
          }}
        >
          error_outline
        </span>
        <p style={{ marginTop: 16, fontSize: 16, fontWeight: 700 }}>
          {error ?? "Không tìm thấy template"}
        </p>
        <p style={{ fontSize: 13, color: subtextColor, marginTop: 6 }}>
          ID: <code>{id}</code>
        </p>
      </div>
    );
  }

  /* ─── Success: render design preview ─── */
  return (
    <div style={root}>
      {/* Background: blurred thumbnail */}
      {template.thumbnailUrl && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${template.thumbnailUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(32px) brightness(0.3)",
            transform: "scale(1.1)",
          }}
        />
      )}

      {/* Main preview card */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          padding: "0 24px",
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Thumbnail */}
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.title}
            style={{
              width: "100%",
              maxWidth: 360,
              borderRadius: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              objectFit: "contain",
            }}
          />
        ) : (
          /* Placeholder when no thumbnail */
          <div
            style={{
              width: 280,
              height: 420,
              borderRadius: 20,
              background: cardBg,
              display: "grid",
              placeItems: "center",
              boxShadow: isDark
                ? "0 20px 60px rgba(0,0,0,0.5)"
                : "0 20px 50px rgba(0,0,0,0.1)",
              border: isDark
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <span
              style={{
                fontFamily: "Material Symbols Rounded",
                fontSize: 64,
                color: isDark ? "#64748b" : "#94a3b8",
              }}
            >
              deployed_code
            </span>
          </div>
        )}

        {/* Title & author */}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              color: textColor,
            }}
          >
            {template.title}
          </h1>
          {template.authorName && (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: subtextColor }}>
              by {template.authorName}
            </p>
          )}
          {template.description && (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13,
                color: descColor,
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {template.description}
            </p>
          )}
        </div>

        {/* CTA */}
        <a
          href={editorUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 44,
            padding: "0 24px",
            borderRadius: 22,
            background: "linear-gradient(135deg, #ef4444 0%, #e11d48 100%)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 6px 20px rgba(225,29,72,0.4)",
          }}
        >
          <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 20 }}>edit</span>
          Mở trong Editor
        </a>
      </div>

      {/* ── Powered-by watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            right: 16,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 5,
            opacity: 0.65,
            fontSize: 11,
            color: textColor,
            userSelect: "none",
          }}
        >
          <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 14, lineHeight: 1 }}>
            deployed_code
          </span>
          <a
            href={
              typeof window !== "undefined"
                ? window.location.origin
                : "https://pickme3d.com"
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}
          >
            Powered by PickMe3D
          </a>
        </div>
      )}
    </div>
  );
}
