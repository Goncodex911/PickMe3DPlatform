import { describe, expect, it } from "vitest";
import {
  buildCoverDoc,
  editorUrlForSavedDesign,
  isDraftVersionId,
  resolveEditorSource,
  versionHistoryIdFor,
} from "./editorSession";

const base = { editId: null, coverId: null, storedEditItem: null, storedCoverId: null, hasLocalDoc: true };

describe("resolveEditorSource", () => {
  it("keeps the working copy when the edit marker names the requested design", () => {
    const item = { _id: "d1", title: "Mine" };
    const res = resolveEditorSource({ ...base, editId: "d1", storedEditItem: JSON.stringify(item) });
    expect(res).toEqual({ kind: "local", editItem: item });
  });

  it("fetches the design when no edit marker exists, even if m3e:doc holds another document", () => {
    expect(resolveEditorSource({ ...base, editId: "d1" })).toEqual({ kind: "fetch-edit", id: "d1" });
  });

  it("fetches the design when the edit marker names a different design", () => {
    const res = resolveEditorSource({ ...base, editId: "d1", storedEditItem: JSON.stringify({ _id: "d2" }) });
    expect(res).toEqual({ kind: "fetch-edit", id: "d1" });
  });

  it("fetches the design when the edit marker is corrupt", () => {
    expect(resolveEditorSource({ ...base, editId: "d1", storedEditItem: "{not json" })).toEqual({ kind: "fetch-edit", id: "d1" });
  });

  it("uses the marker's docData when the working copy is empty", () => {
    const item = { id: "d1", docData: { frames: [] } };
    const res = resolveEditorSource({ ...base, hasLocalDoc: false, editId: "d1", storedEditItem: JSON.stringify(item) });
    expect(res).toEqual({ kind: "local", editItem: item });
  });

  it("keeps a cover's working copy only for the same template", () => {
    expect(resolveEditorSource({ ...base, coverId: "t1", storedCoverId: "t1" })).toEqual({ kind: "local", editItem: null });
    expect(resolveEditorSource({ ...base, coverId: "t1", storedCoverId: "t2" })).toEqual({ kind: "fetch-cover", id: "t1" });
    expect(resolveEditorSource({ ...base, coverId: "t1" })).toEqual({ kind: "fetch-cover", id: "t1" });
    expect(resolveEditorSource({ ...base, coverId: "t1", storedCoverId: "t1", hasLocalDoc: false })).toEqual({ kind: "fetch-cover", id: "t1" });
  });

  it("treats a plain /editor as a draft and editId as taking priority over coverId", () => {
    expect(resolveEditorSource(base)).toEqual({ kind: "draft" });
    expect(resolveEditorSource({ ...base, editId: "d1", coverId: "t1", storedCoverId: "t1" })).toEqual({ kind: "fetch-edit", id: "d1" });
  });
});

describe("editorUrlForSavedDesign", () => {
  it("turns a plain draft URL into an editId URL, keeping the trailing slash", () => {
    expect(editorUrlForSavedDesign("http://localhost:3000/editor/", "d1")).toBe("/editor/?editId=d1");
  });

  it("replaces coverId and keeps the base path, other params and the hash", () => {
    expect(editorUrlForSavedDesign("https://x.dev/app/editor/?coverId=t1&lang=vi#panel", "d1")).toBe(
      "/app/editor/?lang=vi&editId=d1#panel",
    );
  });

  it("returns null when the URL already points at the design or input is unusable", () => {
    expect(editorUrlForSavedDesign("http://localhost:3000/editor/?editId=d1", "d1")).toBeNull();
    expect(editorUrlForSavedDesign("not a url", "d1")).toBeNull();
    expect(editorUrlForSavedDesign("http://localhost:3000/editor/", "")).toBeNull();
  });

  it("a reload of the rewritten URL keeps the saved design (no duplicate on next save)", () => {
    const next = editorUrlForSavedDesign("http://localhost:3000/editor/", "d1")!;
    const editId = new URL(next, "http://localhost:3000").searchParams.get("editId");
    const res = resolveEditorSource({
      editId,
      coverId: null,
      storedEditItem: JSON.stringify({ _id: "d1" }),
      storedCoverId: null,
      hasLocalDoc: true,
    });
    expect(res).toEqual({ kind: "local", editItem: { _id: "d1" } });
  });
});

describe("buildCoverDoc", () => {
  it("copies the template content under a (Cover) title", () => {
    expect(buildCoverDoc({ title: "UI Mobile", docData: { frames: [1] } })).toEqual({ frames: [1], title: "UI Mobile (Cover)" });
  });

  it("returns null when the template has no content", () => {
    expect(buildCoverDoc({ title: "Locked", docData: null })).toBeNull();
  });
});

describe("version history ids", () => {
  it("gives each cover its own local history and keeps saved designs on their id", () => {
    expect(versionHistoryIdFor("d1", "t1")).toBe("d1");
    expect(versionHistoryIdFor(undefined, "t1")).toBe("draft-cover-t1");
    expect(versionHistoryIdFor(undefined, "t2")).not.toBe(versionHistoryIdFor(undefined, "t1"));
    expect(versionHistoryIdFor(undefined, null)).toBe("draft");
  });

  it("recognises draft ids as local-only", () => {
    expect(isDraftVersionId("draft")).toBe(true);
    expect(isDraftVersionId("draft-cover-t1")).toBe(true);
    expect(isDraftVersionId("")).toBe(true);
    expect(isDraftVersionId("665f0c0a9b1e")).toBe(false);
  });
});
