"use client";

import React, { useState, useEffect } from "react";
import { TemplateItem, saveDesignApi, updateDesignApi } from "@/lib/templateService";

interface SaveDesignModalProps {
  open: boolean;
  onClose: () => void;
  docData: any;
  editingDesign?: TemplateItem | null;
  onSaved?: (savedItem?: TemplateItem) => void;
}

const PRESET_TAGS = [
  "summer", "winter", "autumn", "spring",
  "minimal", "retro", "cyberpunk", "luxury",
  "streetwear", "casual", "formal", "avant-garde",
  "monochrome", "colorful", "pastel", "dark",
  "feminine", "masculine", "unisex", "editorial",
];

export default function SaveDesignModal({
  open,
  onClose,
  docData,
  editingDesign,
  onSaved,
}: SaveDesignModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [saveMode, setSaveMode] = useState<"overwrite" | "new">("overwrite");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editingDesign) {
        setTitle(editingDesign.title || docData?.title || "My design");
        setDescription(editingDesign.description || docData?.brief || "");
        setSelectedTags(editingDesign.tags || []);
        setIsPublic(editingDesign.isPublic ?? true);
        setSaveMode("overwrite");
      } else {
        setTitle(docData?.title || "My design");
        setDescription(docData?.brief || "");
        setSelectedTags([]);
        setIsPublic(true);
        setSaveMode("new");
      }
      setSaving(false);
      setSaved(false);
      setErrorMessage(null);
    }
  }, [open, docData, editingDesign]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage("Enter a design name.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);

    const designId = editingDesign ? (editingDesign._id || editingDesign.id) : null;

    if (editingDesign && designId && saveMode === "overwrite") {
      // Overwrite existing design
      const result = await updateDesignApi(designId, {
        title: title.trim(),
        description: description.trim(),
        tags: selectedTags,
        isPublic,
        docData,
      });

      setSaving(false);
      if (result.success) {
        setSaved(true);
        setTimeout(() => {
          onSaved?.(result.data);
          onClose();
        }, 1200);
      } else {
        setErrorMessage("Could not update the design. Please try again.");
      }
    } else {
      // Save as new design
      const result = await saveDesignApi({
        title: title.trim(),
        description: description.trim(),
        category: editingDesign?.category || "Outfit",
        tags: selectedTags,
        isPublic,
        docData,
      });

      setSaving(false);
      if (result.success) {
        setSaved(true);
        setTimeout(() => {
          onSaved?.(result.data);
          onClose();
        }, 1200);
      } else {
        setErrorMessage(result.message || "Could not save the design. Please try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-md bg-[#0e1422] border border-white/10 shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#12192c]">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-rounded text-lg text-red-500">cloud_upload</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {editingDesign && saveMode === "overwrite" ? "Update Design" : "Save New Design"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-rounded text-base">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {saved ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <span className="material-symbols-rounded text-2xl">check</span>
              </div>
              <h3 className="text-sm font-bold text-white">
                {editingDesign && saveMode === "overwrite"
                  ? "Design updated successfully!"
                  : "Design saved successfully!"}
              </h3>
              <p className="text-xs text-slate-400">
                {editingDesign && saveMode === "overwrite"
                  ? "The original design now includes your latest changes."
                  : isPublic
                  ? "Your design is now public in the gallery."
                  : "Your design is saved as private."}
              </p>
            </div>
          ) : (
            <>
              {/* Overwrite or New Option if editing existing design */}
              {editingDesign && (
                <div className="p-3 rounded-md bg-slate-900 border border-white/10 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                    Save options:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSaveMode("overwrite")}
                      className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                        saveMode === "overwrite"
                          ? "bg-red-600/15 border-red-500 text-white font-semibold"
                          : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className="block text-[11px] font-bold text-white">Overwrite original</span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Updating: {editingDesign.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveMode("new")}
                      className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                        saveMode === "new"
                          ? "bg-red-600/15 border-red-500 text-white font-semibold"
                          : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className="block text-[11px] font-bold text-white">Save as a new copy</span>
                      <span className="text-[10px] text-slate-400 block">Create a new design</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">
                  Design name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a design name..."
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-white/15  text-white text-xs outline-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your design..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-white/15  text-white text-xs outline-none resize-none transition-colors"
                />
              </div>

              {/* Privacy Toggle */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Who can see this?</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    aria-pressed={isPublic}
                    className={`py-2 px-3 rounded-md border text-center transition-colors cursor-pointer ${
                      isPublic
                        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center gap-1.5"><span className="material-symbols-rounded text-sm" aria-hidden="true">public</span>Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    aria-pressed={!isPublic}
                    className={`py-2 px-3 rounded-md border text-center transition-colors cursor-pointer ${
                      !isPublic
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center gap-1.5"><span className="material-symbols-rounded text-sm" aria-hidden="true">lock</span>Private</span>
                  </button>
                </div>
                <p className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-400">
                  <span className="material-symbols-rounded mt-0.5 text-sm text-slate-500" aria-hidden="true">info</span>
                  {isPublic ? "Your design will appear in the gallery and on your creator page." : "Only you can see this design."}
                </p>
              </div>

              {/* Hashtag Preset Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 font-medium">Hashtags</label>
                  {selectedTags.length > 0 && (
                    <span className="text-[11px] text-red-400 font-mono">
                      {selectedTags.length} selected
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-950 rounded-md border border-white/5">
                  {PRESET_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                          active
                            ? "bg-red-600 border-red-500 text-white"
                            : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {errorMessage}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div className="px-6 py-3.5 border-t border-white/10 bg-[#12192c] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="px-5 py-2 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-sm">cloud_upload</span>
                  <span>
                    {editingDesign && saveMode === "overwrite" ? "Overwrite design" : "Save design"}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
