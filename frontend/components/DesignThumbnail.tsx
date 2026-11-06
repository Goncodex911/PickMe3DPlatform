"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { isDesignCover, previewDocument } from "@/lib/designPreview";
import styles from "./DesignThumbnail.module.css";

const CanvasPreview = dynamic(() => import("./DesignCanvasPreview"), { ssr: false });

/** A saved cover or a read-only rendering of the actual saved Canvas, never a stock photo. */
export default function DesignThumbnail({ docData, thumbnailUrl, title, className = "" }: {
  docData: unknown;
  thumbnailUrl?: string;
  title: string;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [failedSource, setFailedSource] = useState("");
  const doc = useMemo(() => previewDocument(docData), [docData]);
  const hasCover = isDesignCover(thumbnailUrl) && failedSource !== thumbnailUrl;

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} className={`${styles.thumbnail} ${className}`} role="img" aria-label={`Bản xem trước: ${title}`}>
      {hasCover ? (
        <img className={styles.cover} src={thumbnailUrl} alt="" loading="lazy" onError={() => setFailedSource(thumbnailUrl || "")} />
      ) : doc && visible ? (
        <CanvasPreview doc={doc} />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          <span className="material-symbols-rounded">dashboard</span>
          <span>{doc ? "Đang tải bản xem trước…" : "Chưa có bản xem trước"}</span>
        </div>
      )}
    </div>
  );
}
