"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmDigitalPurchase } from "@/lib/paymentService";
import { TemplateItem, checkoutTemplateApi, getCoverEditorLink, prepareEditorSession, trackCoverTemplateApi } from "@/lib/templateService";
import { getCreatorProfileHref } from "@/lib/userService";
import styles from "./TemplateCard.module.css";
import DesignThumbnail from "./DesignThumbnail";

interface TemplateCardProps {
  template: TemplateItem;
  onSelect?: (template: TemplateItem) => void;
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}₫`;

export default function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const router = useRouter();
  const templateId = template._id || template.id || "";
  const creatorHref = getCreatorProfileHref(template.author);
  const price = Number(template.price || 0);
  // Only a price drop is announced (tag on the preview + old price struck through); an increase just shows the new price.
  const purchased = Boolean(template.purchased);
  // A price drop is irrelevant to someone who already bought it.
  const drop = !purchased && price > 0 && template.priceDrop && template.priceDrop.previousPrice > price ? template.priceDrop : null;
  // Not bought yet: the preview is shown, but details stay closed until the template is purchased.
  const locked = Boolean(template.locked);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");
  const buy = async () => {
    if (!templateId || buying) return;
    if (!confirmDigitalPurchase(template.title ? `Template "${template.title}"` : "Template")) return;
    setBuying(true);
    setBuyError("");
    const res = await checkoutTemplateApi(templateId);
    if (res.success && res.checkoutUrl) {
      window.location.href = res.checkoutUrl;
      return;
    }
    setBuying(false);
    if (res.code === "LOGIN_REQUIRED") {
      router.push("/login");
      return;
    }
    setBuyError(res.message || "Không thể tạo thanh toán");
  };
  const openDetails = () => {
    if (locked) return;
    if (onSelect) onSelect(template);
    else if (templateId) router.push(`/templates/${templateId}`);
  };

  return (
    <article className={styles.card}>
      <button
        className={`${styles.preview} ${locked ? styles.previewLocked : ""}`}
        onClick={openDetails}
        disabled={locked}
        aria-label={locked ? `${template.title}: mua để xem chi tiết` : `View details ${template.title}`}
      >
        <DesignThumbnail docData={template.docData} thumbnailUrl={template.thumbnailUrl} title={template.title} />
        {/* category and price-drop tag share one row; a long owner note scrolls inside the tag */}
        <span className={styles.badges}>
          <span className={styles.category}>{template.category === "Dạ hội" ? "Eveningwear" : template.category}</span>
          {purchased && (
            <span className={styles.ownedTag}><span className="material-symbols-rounded" aria-hidden="true">check</span>Đã mua</span>
          )}
          {drop && (
            <span className={styles.promo} title={drop.note || `Giảm giá ${drop.percent}%`}>
              {drop.note ? (
                <span className={styles.marquee} aria-label={drop.note}>
                  <span className={styles.marqueeTrack} aria-hidden="true">
                    <span>{drop.note}</span>
                    <span>{drop.note}</span>
                  </span>
                </span>
              ) : (
                <span>Giảm {drop.percent}%</span>
              )}
              {drop.note && <strong>-{drop.percent}%</strong>}
            </span>
          )}
        </span>
        {locked ? (
          <span className={styles.lockNote}><span className="material-symbols-rounded" aria-hidden="true">lock</span>Mua để xem chi tiết</span>
        ) : (
          <span className={styles.view}>View details <span aria-hidden="true">↗</span></span>
        )}
      </button>
      <div className={styles.info}>
        <div className={styles.metrics}>
          <span>{template.forksCount || 0} reuses</span>
          <span>{template.avgRating && template.avgRating > 0 ? `${template.avgRating.toFixed(1)} / 5 · ${template.ratingsCount || 0} ${(template.ratingsCount || 0) === 1 ? "review" : "reviews"}` : "No ratings yet"}</span>
        </div>
        {locked ? <h3 className={`${styles.title} ${styles.titleStatic}`}>{template.title}</h3> : <button className={styles.title} onClick={openDetails}>{template.title}</button>}
        <p className={styles.description}>{template.description || "A design from the PickMe3D community."}</p>
        <div className={styles.statistics}><span>{template.likesCount || 0} {(template.likesCount || 0) === 1 ? "like" : "likes"}</span><span>{template.viewsCount || 0} views</span></div>
        <div className={styles.bottom}>
          {creatorHref ? <Link href={creatorHref} className={`${styles.author} ${styles.authorLink}`} aria-label={`View ${template.authorName || "creator"}'s profile`}>
            {template.authorAvatar ? <img src={template.authorAvatar} alt="" loading="lazy" /> : <span className={styles.avatar}>{template.authorName?.[0] || "P"}</span>}
            <span>{template.authorName || "PickMe3D community"}</span>
          </Link> : <div className={styles.author}>
            {template.authorAvatar ? <img src={template.authorAvatar} alt="" loading="lazy" /> : <span className={styles.avatar}>{template.authorName?.[0] || "P"}</span>}
            <span>{template.authorName || "PickMe3D community"}</span>
          </div>}
          <div className={styles.price} aria-label={purchased ? "Đã mua" : price ? `Giá ${vnd(price)}` : "Miễn phí"}>
            {purchased ? (
              <span className={styles.owned}><span className="material-symbols-rounded" aria-hidden="true">check_circle</span>Đã mua</span>
            ) : price > 0 ? (
              <>
                {drop && <s>{vnd(drop.previousPrice)}</s>}
                <strong>{vnd(price)}</strong>
              </>
            ) : (
              <span className={styles.free}>Miễn phí</span>
            )}
          </div>
          {locked ? (
            // Paid template without access: Buy goes straight to the existing payment page.
            <button type="button" onClick={() => void buy()} disabled={buying} className={styles.use} title={buyError || undefined}>
              {buying ? "Đang chuyển…" : "Buy"} <span aria-hidden="true">↗</span>
            </button>
          ) : (
            <Link href={getCoverEditorLink(template)} onClick={() => {
              prepareEditorSession(template, false);
              if (templateId) void trackCoverTemplateApi(templateId);
            }} className={styles.use}>Use template <span aria-hidden="true">↗</span></Link>
          )}
        </div>
        {buyError && <p className={styles.buyError} role="alert">{buyError}</p>}
      </div>
    </article>
  );
}
