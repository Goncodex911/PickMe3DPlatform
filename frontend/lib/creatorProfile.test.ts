import { describe, expect, it } from "vitest";
import { getCreatorProfileHref } from "./userService";

describe("getCreatorProfileHref", () => {
  it("prefers username query route when author has username", () => {
    expect(
      getCreatorProfileHref({ _id: "660000000000000000000001", username: "hieuthuan" }, "Nguyễn Hiếu Thuận")
    ).toBe("/creator/?username=hieuthuan");
  });

  it("falls back to id query route when author has no username", () => {
    expect(
      getCreatorProfileHref({ _id: "660000000000000000000001", name: "Nguyễn Hiếu Thuận" }, "Nguyễn Hiếu Thuận")
    ).toBe("/creator/?id=660000000000000000000001");
  });

  it("handles raw ObjectId string author", () => {
    expect(getCreatorProfileHref("660000000000000000000002")).toBe(
      "/creator/?id=660000000000000000000002"
    );
  });

  it("falls back to authorName when author object is absent", () => {
    expect(getCreatorProfileHref(null, "Nguyễn Hiếu Thuận")).toBe(
      "/creator/?username=Nguy%E1%BB%85n%20Hi%E1%BA%BFu%20Thu%E1%BA%ADn"
    );
  });

  it("returns null for generic community or local placeholder authors", () => {
    expect(getCreatorProfileHref(null, "PickMe3D community")).toBeNull();
    expect(getCreatorProfileHref("local_123456", "Bạn")).toBeNull();
  });
});

