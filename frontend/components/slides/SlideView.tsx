"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { RATIO, VIEWPORT, type RenderElement, type RenderSlide } from "@/lib/slideLegacy";
import { backgroundCss, gradientCss, safeSrc, sanitizeRichText } from "@/lib/slideRender";

// Vẽ một slide PPTist (hoặc slide cũ đã đổi qua toRenderSlides) bằng DOM thường, co theo bề rộng ô chứa.
// Hỗ trợ chữ, ảnh, hình, đường, bảng; biểu đồ, công thức, video và âm thanh hiện ô giữ chỗ.

function useScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / VIEWPORT);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}

function RichText({ html, style }: { html: string; style?: CSSProperties }) {
  const safe = useMemo(() => sanitizeRichText(html), [html]);
  return <div className="pm-rich" style={style} dangerouslySetInnerHTML={{ __html: safe }} />;
}

function box(el: RenderElement): CSSProperties {
  return {
    position: "absolute",
    left: el.left,
    top: el.top,
    width: el.width,
    height: el.height,
    transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
  };
}

function textStyle(el: Record<string, unknown>): CSSProperties {
  const inset = Array.isArray(el.inset) ? (el.inset as number[]) : [10, 10, 10, 10];
  return {
    fontFamily: typeof el.defaultFontName === "string" && el.defaultFontName ? `"${el.defaultFontName}", "Plus Jakarta Sans", sans-serif` : undefined,
    color: typeof el.defaultColor === "string" ? el.defaultColor : undefined,
    lineHeight: typeof el.lineHeight === "number" ? el.lineHeight : 1.5,
    letterSpacing: typeof el.wordSpace === "number" ? `${el.wordSpace}px` : undefined,
    padding: `${inset[0]}px ${inset[1]}px ${inset[2]}px ${inset[3]}px`,
    ["--paragraphSpace" as string]: `${typeof el.paragraphSpace === "number" ? el.paragraphSpace : 5}px`,
  };
}

function TextEl({ el }: { el: RenderElement }) {
  const outline = el.outline as { width?: number; color?: string; style?: string } | undefined;
  return (
    <div
      style={{
        ...box(el),
        height: el.fixedHeight ? el.height : "auto",
        background: typeof el.fill === "string" ? el.fill : undefined,
        opacity: typeof el.opacity === "number" ? el.opacity : undefined,
        writingMode: el.vertical ? "vertical-rl" : undefined,
        border: outline?.width ? `${outline.width}px ${outline.style || "solid"} ${outline.color || "#000"}` : undefined,
      }}
    >
      <RichText html={String(el.content || "")} style={textStyle(el)} />
    </div>
  );
}

function ImageEl({ el }: { el: RenderElement }) {
  const src = safeSrc(el.src);
  if (!src) return null;
  const clip = el.clip as { range?: [[number, number], [number, number]] } | undefined;
  const range = clip?.range;
  const flip = `${el.flipH ? "scaleX(-1)" : ""} ${el.flipV ? "scaleY(-1)" : ""}`.trim();
  const imgStyle: CSSProperties = range
    ? {
        position: "absolute",
        width: `${(100 * 100) / Math.max(1, range[1][0] - range[0][0])}%`,
        height: `${(100 * 100) / Math.max(1, range[1][1] - range[0][1])}%`,
        left: `${(-range[0][0] / Math.max(1, range[1][0] - range[0][0])) * 100}%`,
        top: `${(-range[0][1] / Math.max(1, range[1][1] - range[0][1])) * 100}%`,
        maxWidth: "none",
      }
    : { width: "100%", height: "100%", objectFit: "cover" };
  return (
    <div style={{ ...box(el), overflow: "hidden", borderRadius: typeof el.radius === "number" ? el.radius : undefined, transform: [box(el).transform, flip].filter(Boolean).join(" ") || undefined }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} style={imgStyle} />
    </div>
  );
}

function ShapeEl({ el }: { el: RenderElement }) {
  const viewBox = Array.isArray(el.viewBox) ? (el.viewBox as number[]) : [el.width, el.height];
  const outline = el.outline as { width?: number; color?: string; style?: string } | undefined;
  const gradient = el.gradient as { type: string; colors: { pos: number; color: string }[]; rotate: number } | undefined;
  const gradientId = `g-${el.id}`;
  const text = el.text as { content?: string; align?: string } & Record<string, unknown> | undefined;
  const flip = `${el.flipH ? "scaleX(-1)" : ""} ${el.flipV ? "scaleY(-1)" : ""}`.trim();
  return (
    <div style={{ ...box(el), opacity: typeof el.opacity === "number" ? el.opacity : undefined }}>
      <svg width={el.width} height={el.height} viewBox={`0 0 ${viewBox[0]} ${viewBox[1]}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, overflow: "visible", transform: flip || undefined }}>
        {gradient && gradientCss(gradient) && (
          <defs>
            {gradient.type === "radial" ? (
              <radialGradient id={gradientId}>{gradient.colors.map((c, i) => <stop key={i} offset={`${c.pos}%`} stopColor={c.color} />)}</radialGradient>
            ) : (
              <linearGradient id={gradientId} gradientTransform={`rotate(${gradient.rotate || 0} 0.5 0.5)`}>{gradient.colors.map((c, i) => <stop key={i} offset={`${c.pos}%`} stopColor={c.color} />)}</linearGradient>
            )}
          </defs>
        )}
        <path
          d={String(el.path || "")}
          fill={gradient ? `url(#${gradientId})` : String(el.fill || "transparent")}
          stroke={outline?.width ? outline.color || "#000" : "none"}
          strokeWidth={outline?.width || 0}
          strokeDasharray={outline?.style === "dashed" ? "10 6" : outline?.style === "dotted" ? "2 4" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {text?.content && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: text.align === "top" ? "flex-start" : text.align === "bottom" ? "flex-end" : "center" }}>
          <RichText html={String(text.content)} style={textStyle(text)} />
        </div>
      )}
    </div>
  );
}

function LineEl({ el }: { el: RenderElement }) {
  const start = (el.start as number[]) || [0, 0];
  const end = (el.end as number[]) || [0, 0];
  const color = String(el.color || "#fff");
  const width = Number(el.width) || 2;
  const curve = el.curve as number[] | undefined;
  const broken = el.broken as number[] | undefined;
  const d = curve
    ? `M${start[0]},${start[1]} Q${curve[0]},${curve[1]} ${end[0]},${end[1]}`
    : broken
      ? `M${start[0]},${start[1]} L${broken[0]},${broken[1]} L${end[0]},${end[1]}`
      : `M${start[0]},${start[1]} L${end[0]},${end[1]}`;
  return (
    <svg style={{ position: "absolute", left: el.left, top: el.top, overflow: "visible" }} width={1} height={1}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={el.style === "dashed" ? `${width * 5} ${width * 2.5}` : el.style === "dotted" ? `${width} ${width * 1.5}` : undefined} strokeLinecap="round" />
    </svg>
  );
}

type Cell = { id: string; colspan: number; rowspan: number; text: string; style?: Record<string, unknown> };

function TableEl({ el }: { el: RenderElement }) {
  const data = (Array.isArray(el.data) ? el.data : []) as Cell[][];
  const widths = (Array.isArray(el.colWidths) ? el.colWidths : []) as number[];
  const outline = el.outline as { width?: number; color?: string } | undefined;
  const border = `${outline?.width ?? 1}px solid ${outline?.color || "#d0d0d0"}`;
  return (
    <div style={{ ...box(el), height: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 14 }}>
        <colgroup>{widths.map((w, i) => <col key={i} style={{ width: `${w * 100}%` }} />)}</colgroup>
        <tbody>
          {data.map((row, r) => (
            <tr key={r} style={{ height: Number(el.cellMinHeight) || 36 }}>
              {row.map((cell) => {
                const st = cell.style || {};
                return (
                  <td
                    key={cell.id}
                    colSpan={cell.colspan}
                    rowSpan={cell.rowspan}
                    style={{
                      border,
                      padding: "4px 8px",
                      color: typeof st.color === "string" ? st.color : undefined,
                      background: typeof st.backcolor === "string" ? st.backcolor : undefined,
                      fontSize: typeof st.fontsize === "string" ? st.fontsize : undefined,
                      fontWeight: st.bold ? 700 : undefined,
                      fontStyle: st.em ? "italic" : undefined,
                      textAlign: (st.align as CSSProperties["textAlign"]) || undefined,
                      fontFamily: typeof st.fontname === "string" ? st.fontname : undefined,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {cell.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Biểu đồ vẽ bằng SVG đơn giản (không kèm thư viện): cột, thanh ngang, đường, vùng, phân tán, tròn, vành khuyên.
// Radar vẽ tạm dạng đường.
function ChartEl({ el }: { el: RenderElement }) {
  const data = (el.data || {}) as { labels?: string[]; legends?: string[]; series?: number[][] };
  const labels = data.labels || [];
  const series = (data.series || []).map((row) => row.map((v) => Number(v) || 0));
  const colors = (Array.isArray(el.themeColors) && el.themeColors.length ? el.themeColors : ["#e8294f", "#f0a3b5", "#e6c47e", "#7fd3b0"]) as string[];
  const text = typeof el.textColor === "string" ? el.textColor : "#6b7385";
  const grid = typeof el.lineColor === "string" ? el.lineColor : "rgba(127,127,127,.25)";
  const type = String(el.chartType || "bar");
  const options = (el.options || {}) as { stack?: boolean; lineSmooth?: boolean };
  const W = el.width;
  const H = el.height;
  const color = (i: number) => colors[i % colors.length];

  if (type === "pie" || type === "ring") {
    const values = series[0] || [];
    const total = values.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    const r = Math.min(W, H) / 2 - 8;
    const cx = W / 2;
    const cy = H / 2;
    let angle = -Math.PI / 2;
    return (
      <svg style={box(el)} viewBox={`0 0 ${W} ${H}`}>
        {values.map((v, i) => {
          const sweep = (Math.max(0, v) / total) * Math.PI * 2;
          const a0 = angle;
          const a1 = angle + sweep;
          angle = a1;
          const large = sweep > Math.PI ? 1 : 0;
          const p = (a: number, rr: number) => `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
          const inner = type === "ring" ? r * 0.58 : 0;
          const d = inner
            ? `M${p(a0, r)} A${r},${r} 0 ${large} 1 ${p(a1, r)} L${p(a1, inner)} A${inner},${inner} 0 ${large} 0 ${p(a0, inner)} Z`
            : `M${cx},${cy} L${p(a0, r)} A${r},${r} 0 ${large} 1 ${p(a1, r)} Z`;
          return <path key={i} d={sweep >= Math.PI * 2 - 1e-6 ? `M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0` : d} fill={color(i)} stroke="rgba(255,255,255,.6)" strokeWidth={1} />;
        })}
      </svg>
    );
  }

  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const iw = Math.max(1, W - pad.l - pad.r);
  const ih = Math.max(1, H - pad.t - pad.b);
  const stacked = Boolean(options.stack);
  const sums = labels.map((_, i) => series.reduce((a, row) => a + Math.max(0, row[i] || 0), 0));
  const max = Math.max(1, ...(stacked ? sums : series.flat()));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const horizontal = type === "column";
  const n = Math.max(1, labels.length);
  const band = (horizontal ? ih : iw) / n;
  const pos = (i: number) => pad.l + band * i + band / 2;
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const fmt = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v * 10) / 10));

  return (
    <svg style={box(el)} viewBox={`0 0 ${W} ${H}`} fontFamily="'Plus Jakarta Sans', sans-serif" fontSize={11} fill={text}>
      {ticks.map((t) => (horizontal ? (
        <g key={t}>
          <line x1={pad.l + t * iw} x2={pad.l + t * iw} y1={pad.t} y2={pad.t + ih} stroke={grid} />
          <text x={pad.l + t * iw} y={H - 8} textAnchor="middle">{fmt(t * max)}</text>
        </g>
      ) : (
        <g key={t}>
          <line x1={pad.l} x2={pad.l + iw} y1={y(t * max)} y2={y(t * max)} stroke={grid} />
          <text x={pad.l - 6} y={y(t * max) + 4} textAnchor="end">{fmt(t * max)}</text>
        </g>
      )))}
      {labels.map((label, i) => (horizontal ? (
        <text key={i} x={pad.l - 6} y={pad.t + band * i + band / 2 + 4} textAnchor="end">{label}</text>
      ) : (
        <text key={i} x={pos(i)} y={H - 8} textAnchor="middle">{label}</text>
      )))}
      {(type === "bar" || type === "column") && series.map((row, s) => labels.map((_, i) => {
        const v = Math.max(0, row[i] || 0);
        const below = stacked ? series.slice(0, s).reduce((a, r) => a + Math.max(0, r[i] || 0), 0) : 0;
        const groups = stacked ? 1 : series.length;
        const thick = (band * 0.7) / groups;
        const offset = stacked ? 0 : s * thick;
        if (horizontal) {
          const x0 = pad.l + (below / max) * iw;
          return <rect key={`${s}-${i}`} x={x0} y={pad.t + band * i + band * 0.15 + offset} width={(v / max) * iw} height={thick} fill={color(s)} />;
        }
        return <rect key={`${s}-${i}`} x={pad.l + band * i + band * 0.15 + offset} y={y(v + below)} width={thick} height={(v / max) * ih} fill={color(s)} />;
      }))}
      {(type === "line" || type === "area" || type === "radar") && series.map((row, s) => {
        const pts = labels.map((_, i) => `${pos(i)},${y(row[i] || 0)}`);
        return (
          <g key={s}>
            {type === "area" && <path d={`M${pos(0)},${y(0)} L${pts.join(" L")} L${pos(labels.length - 1)},${y(0)} Z`} fill={color(s)} opacity={0.3} />}
            <polyline points={pts.join(" ")} fill="none" stroke={color(s)} strokeWidth={2.5} strokeLinejoin="round" />
          </g>
        );
      })}
      {type === "scatter" && series.length >= 2 && (series[0] || []).map((xv, i) => {
        const xmax = Math.max(1, ...series[0]);
        return <circle key={i} cx={pad.l + (xv / xmax) * iw} cy={y(series[1][i] || 0)} r={5} fill={color(0)} />;
      })}
    </svg>
  );
}

const PLACEHOLDER: Record<string, string> = { latex: "Công thức", video: "Video", audio: "Âm thanh" };

function Placeholder({ el }: { el: RenderElement }) {
  return (
    <div style={{ ...box(el), display: "grid", placeItems: "center", border: "2px dashed rgba(127,127,127,.45)", borderRadius: 8, color: "rgba(127,127,127,.9)", font: "600 18px/1 'Plus Jakarta Sans', sans-serif" }}>
      {PLACEHOLDER[el.type] || el.type}
    </div>
  );
}

function Element({ el }: { el: RenderElement }) {
  if (el.hidden) return null;
  if (el.type === "text") return <TextEl el={el} />;
  if (el.type === "image") return <ImageEl el={el} />;
  if (el.type === "shape") return <ShapeEl el={el} />;
  if (el.type === "line") return <LineEl el={el} />;
  if (el.type === "table") return <TableEl el={el} />;
  if (el.type === "chart") return <ChartEl el={el} />;
  if (el.type === "latex" && typeof el.path === "string" && Array.isArray(el.viewBox)) {
    const [vw, vh] = el.viewBox as number[];
    return (
      <svg style={box(el)} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none" overflow="visible">
        <path d={el.path} fill="none" stroke={String(el.color || "#000")} strokeWidth={Number(el.strokeWidth) || 2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return <Placeholder el={el} />;
}

export default function SlideView({
  slide,
  fallbackBg = "#151c2c",
  ratio = RATIO,
  className,
}: {
  slide: RenderSlide | undefined;
  fallbackBg?: string;
  ratio?: number;
  className?: string;
}) {
  const { ref, scale } = useScale();
  const bg = backgroundCss(slide?.background as Parameters<typeof backgroundCss>[0], fallbackBg);
  return (
    <div ref={ref} className={className} style={{ position: "relative", aspectRatio: `${1 / ratio}`, overflow: "hidden", ...bg }}>
      {slide && scale > 0 && (
        <div style={{ position: "absolute", left: 0, top: 0, width: VIEWPORT, height: VIEWPORT * ratio, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          {slide.elements.map((el) => <Element key={el.id} el={el} />)}
        </div>
      )}
    </div>
  );
}

