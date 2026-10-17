"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TemplateItem, getCoverEditorLink, prepareEditorSession, trackCoverTemplateApi } from "@/lib/templateService";
import styles from "./TemplateCard.module.css";

interface TemplateCardProps {
  template: TemplateItem;
  onSelect?: (template: TemplateItem) => void;
}

export default function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const router = useRouter();
  const templateId = template._id || template.id || "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const openDetails = () => {
    if (onSelect) onSelect(template);
    else if (templateId) router.push(`/templates/${templateId}`);
  };

  return (
    <article className={styles.card}>
      <button className={styles.preview} onClick={openDetails} aria-label={`View details ${template.title}`}>
        <img src={template.thumbnailUrl || `${basePath}/hero/card-couture.png`} alt={template.title} loading="lazy" />
        <span className={styles.category}>{template.category === "Dạ hội" ? "Eveningwear" : template.category}</span>
        <span className={styles.view}>View details <span aria-hidden="true">↗</span></span>
      </button>
      <div className={styles.info}>
        <div className={styles.metrics}>
          <span>{template.forksCount || 0} reuses</span>
          <span>{template.avgRating && template.avgRating > 0 ? `${template.avgRating.toFixed(1)} / 5 · ${template.ratingsCount || 0} ${(template.ratingsCount || 0) === 1 ? "review" : "reviews"}` : "No ratings yet"}</span>
        </div>
        <button className={styles.title} onClick={openDetails}>{template.title}</button>
        <p className={styles.description}>{template.description || "A design from the PickMe3D community."}</p>
        <div className={styles.statistics}><span>{template.likesCount || 0} {(template.likesCount || 0) === 1 ? "like" : "likes"}</span><span>{template.viewsCount || 0} views</span></div>
        <div className={styles.bottom}>
          <div className={styles.author}>
            {template.authorAvatar ? <img src={template.authorAvatar} alt="" loading="lazy" /> : <span className={styles.avatar}>{template.authorName?.[0] || "P"}</span>}
            <span>{template.authorName || "PickMe3D community"}</span>
          </div>
          <Link href={getCoverEditorLink(template)} onClick={() => {
            prepareEditorSession(template, false);
            if (templateId) void trackCoverTemplateApi(templateId);
          }} className={styles.use}>Use template <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </article>
  );
}
