"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { M3Static } from "./M3Node";
import { fontFamilyOf, frameRadius, frameSizeOf, freeRadii, groupsInFrame, paletteOf, radiiOfRuns, type Doc } from "@/lib/tokens";
import styles from "./DesignThumbnail.module.css";

export default function DesignCanvasPreview({ doc }: { doc: Doc }) {
  const root = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const frame = doc.frames[0];
  const size = frameSizeOf(frame);
  const palette = paletteOf(doc.paletteKey, doc.customPalette, doc.theme);
  const groups = useMemo(() => groupsInFrame(doc.groups, frame, doc.frames, {}), [doc, frame]);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const padding = Math.min(22, box.height * .08);
  const scale = Math.max(0, Math.min((box.width - padding * 2) / size.w, (box.height - padding * 2) / size.h));

  return (
    <div className={styles.canvas} ref={root} aria-hidden="true" inert>
      <div className={styles.screen} style={{ width: size.w, height: size.h, left: (box.width - size.w * scale) / 2, top: (box.height - size.h * scale) / 2, transform: `scale(${scale})`, borderRadius: frameRadius(frame), background: frame.bg ? palette[frame.bg] : palette.surface, color: palette.onSurface, fontFamily: fontFamilyOf(doc.theme?.font || "roboto") }}>
        {groups.map((group) => {
          const radii = group.free ? freeRadii(group, {}) : radiiOfRuns([group]);
          return <div key={group.id} style={{ position: "absolute", left: group.x - frame.x, top: group.y - frame.y, display: "flex", flexDirection: group.axis === "y" ? "column" : "row", gap: 3 }}>
            {group.items.map((item) => <M3Static key={item.id} item={item} palette={palette} radii={radii.get(item.id)} style={group.free ? { position: "absolute", left: group.pos?.[item.id]?.x || 0, top: group.pos?.[item.id]?.y || 0 } : undefined} />)}
          </div>;
        })}
      </div>
    </div>
  );
}
