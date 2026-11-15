/**
 * Decides which document the Canvas Editor opens from the URL and what localStorage holds.
 *
 * `m3e:doc` is a single working copy shared by every editor session in the browser, so it can
 * only be trusted when a marker says which design/template it belongs to:
 * - `pickme3d_edit_item` (the saved design being edited, matched against `?editId=`)
 * - `pickme3d_cover_id`  (the template being covered, matched against `?coverId=`)
 * Anything else means the working copy belongs to another session and must be replaced.
 */

export const DOC_STORAGE_KEY = "m3e:doc";
export const EDIT_ID_KEY = "pickme3d_edit_id";
export const EDIT_ITEM_KEY = "pickme3d_edit_item";
export const COVER_ID_KEY = "pickme3d_cover_id";

/** Version-history id for documents that have no saved design yet. */
export const DRAFT_VERSION_ID = "draft";

export type EditorSource =
  /** Keep the local working copy; `editItem` is the matching saved design when editing. */
  | { kind: "local"; editItem: any | null }
  /** The working copy belongs to something else: load this saved design for editing. */
  | { kind: "fetch-edit"; id: string }
  /** The working copy belongs to something else: load this template as a cover. */
  | { kind: "fetch-cover"; id: string }
  /** Plain `/editor`: keep the working copy as an unsaved draft. */
  | { kind: "draft" };

export interface EditorSourceInput {
  editId: string | null;
  coverId: string | null;
  /** Raw `pickme3d_edit_item` value. */
  storedEditItem: string | null;
  /** Raw `pickme3d_cover_id` value. */
  storedCoverId: string | null;
  /** Whether `m3e:doc` holds a document. */
  hasLocalDoc: boolean;
}

function parseItem(raw: string | null): any | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function resolveEditorSource(input: EditorSourceInput): EditorSource {
  const editId = input.editId?.trim() || null;
  const coverId = input.coverId?.trim() || null;

  if (editId) {
    const item = parseItem(input.storedEditItem);
    const itemId = item ? item._id || item.id : null;
    // The working copy is this design's draft only when the marker names the same design.
    if (itemId === editId && (input.hasLocalDoc || item?.docData)) {
      return { kind: "local", editItem: item };
    }
    return { kind: "fetch-edit", id: editId };
  }

  if (coverId) {
    if (input.hasLocalDoc && input.storedCoverId === coverId) {
      return { kind: "local", editItem: null };
    }
    return { kind: "fetch-cover", id: coverId };
  }

  return { kind: "draft" };
}

/**
 * The editor URL after a design is saved: `?editId=<id>` replaces `?coverId=`, other params, the
 * path (base path, trailing slash) and the hash stay. Reloading or copying it reopens the saved
 * design instead of an unsaved draft, so the next save updates it rather than creating a copy.
 * Returns null when the URL cannot be parsed or nothing would change.
 */
export function editorUrlForSavedDesign(currentHref: string, designId: string): string | null {
  if (!designId) return null;
  let url: URL;
  try {
    url = new URL(currentHref);
  } catch {
    return null;
  }
  if (url.searchParams.get("editId") === designId && !url.searchParams.has("coverId")) return null;
  url.searchParams.delete("coverId");
  url.searchParams.set("editId", designId);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** The document a cover starts from: the template's content under a "(Cover)" title. */
export function buildCoverDoc<T extends Record<string, any>>(template: { title?: string; docData?: T | null }): (T & { title: string }) | null {
  if (!template?.docData || typeof template.docData !== "object") return null;
  const base = template.title || (typeof template.docData.title === "string" ? template.docData.title : "") || "Untitled";
  return { ...template.docData, title: `${base} (Cover)` };
}

/**
 * Version-history id: the saved design's id, or a per-template draft id for covers so two
 * covers never share (and roll back into) each other's history.
 */
export function versionHistoryIdFor(designId: string | null | undefined, coverId: string | null | undefined): string {
  if (designId) return designId;
  if (coverId) return `${DRAFT_VERSION_ID}-cover-${coverId}`;
  return DRAFT_VERSION_ID;
}

/** True for ids that only live in localStorage (never sent to the versions API). */
export function isDraftVersionId(id: string | null | undefined): boolean {
  return !id || id === DRAFT_VERSION_ID || id.startsWith(`${DRAFT_VERSION_ID}-`);
}
