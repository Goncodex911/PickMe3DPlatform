"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CollectionItem,
  fetchMyCollectionsApi,
  createCollectionApi,
  deleteCollectionApi,
  addTemplateToCollectionApi,
  removeTemplateFromCollectionApi,
} from "@/lib/collectionService";

/* ── Add-to-Collection Modal (shown when user clicks "Save to Collection") ── */
interface AddToCollectionModalProps {
  templateId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddToCollectionModal({
  templateId,
  isOpen,
  onClose,
}: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(
    null
  );

  const loadCollections = useCallback(async () => {
    setLoading(true);
    const data = await fetchMyCollectionsApi();
    setCollections(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
      setFeedback(null);
    }
  }, [isOpen, loadCollections]);

  const handleAdd = async (collectionId: string) => {
    const result = await addTemplateToCollectionApi(collectionId, templateId);
    if (result.success) {
      setFeedback({ type: "success", msg: "Đã thêm vào bộ sưu tập!" });
    } else {
      setFeedback({
        type: "error",
        msg: result.message || "Không thể thêm vào bộ sưu tập",
      });
    }
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createCollectionApi({ name: newName.trim() });
    if (result.success && result.data) {
      setCollections((prev) => [result.data!, ...prev]);
      // Auto-add the template to the new collection
      await addTemplateToCollectionApi(result.data._id, templateId);
      setNewName("");
      setShowCreate(false);
      setFeedback({ type: "success", msg: "Đã tạo bộ sưu tập và thêm mẫu!" });
    } else {
      setFeedback({
        type: "error",
        msg: result.message || "Không thể tạo bộ sưu tập",
      });
    }
    setCreating(false);
    setTimeout(() => setFeedback(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md mx-4 rounded-xl bg-[#0e1422] border border-white/10 shadow-2xl overflow-hidden"
        style={{ animation: "scaleIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-rounded text-base text-amber-400">bookmark</span>
            Lưu vào Bộ Sưu Tập
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-rounded text-lg text-slate-400">close</span>
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mx-5 mt-3 px-3 py-2 rounded-lg text-xs font-medium ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {/* Collections list */}
        <div className="px-5 py-3 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
            </div>
          ) : collections.length === 0 && !showCreate ? (
            <div className="py-6 text-center">
              <span className="material-symbols-rounded text-2xl text-slate-600 block mb-1">
                collections_bookmark
              </span>
              <p className="text-xs text-slate-500">Chưa có bộ sưu tập nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map((col) => {
                const templateIds = col.templates.map((t) =>
                  typeof t === "string" ? t : (t as any)._id
                );
                const isAdded = templateIds.includes(templateId);

                return (
                  <div
                    key={col._id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/15 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-rounded text-base text-amber-400/70">
                        folder
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-white block truncate">
                          {col.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {col.templates.length} mẫu
                        </span>
                      </div>
                    </div>
                    {isAdded ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <span className="material-symbols-rounded text-xs">check_circle</span>
                        Đã thêm
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdd(col._id)}
                        className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 text-[11px] font-medium hover:bg-amber-500/30 transition-colors"
                      >
                        + Thêm
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create new collection */}
        <div className="px-5 py-3 border-t border-white/10">
          {showCreate ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Tên bộ sưu tập..."
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500/50 transition-colors"
                autoFocus
                disabled={creating}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
              >
                {creating ? "..." : "Tạo"}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-rounded text-sm text-slate-400">close</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-dashed border-white/15 text-xs text-slate-300 hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-rounded text-sm">add</span>
              Tạo bộ sưu tập mới
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ── Collection Card (for display on Profile/Public pages) ── */
interface CollectionCardProps {
  collection: CollectionItem;
  onDelete?: (id: string) => void;
  isOwner?: boolean;
}

export function CollectionCard({ collection, onDelete, isOwner }: CollectionCardProps) {
  const templatePreviews = collection.templates.slice(0, 4);

  return (
    <div className="rounded-xl bg-[#0e1422] border border-white/10 hover:border-slate-500 transition-colors overflow-hidden group">
      {/* Grid preview of templates */}
      <div className="grid grid-cols-2 aspect-[4/3] bg-slate-900">
        {templatePreviews.map((tpl, i) => {
          const thumb =
            typeof tpl === "string" ? "" : (tpl as any).thumbnailUrl || "";
          return (
            <div
              key={i}
              className="w-full h-full overflow-hidden border-r border-b border-white/5 last:border-r-0"
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <span className="material-symbols-rounded text-xl text-slate-700">
                    image
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {/* Fill empty slots */}
        {Array.from({ length: Math.max(0, 4 - templatePreviews.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-full h-full bg-slate-800/50 border-r border-b border-white/5 last:border-r-0"
          />
        ))}
      </div>

      {/* Info */}
      <div className="p-3 flex items-center justify-between">
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-white truncate">{collection.name}</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {collection.templates.length} mẫu thiết kế
            {!collection.isPublic && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-slate-600">
                <span className="material-symbols-rounded text-[10px]">lock</span>
                Riêng tư
              </span>
            )}
          </p>
        </div>

        {isOwner && onDelete && (
          <button
            onClick={() => onDelete(collection._id)}
            className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
            title="Xóa bộ sưu tập"
          >
            <span className="material-symbols-rounded text-sm text-slate-500 hover:text-red-400">
              delete
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
