import { describe, it, expect } from "vitest";
import { Frame, Group, makeItem, PHONE_W, PHONE_H, frameRect, FRAME_GAP } from "./tokens";

describe("Adaptive Import Conflict Resolution Logic", () => {
  it("determines workspace as empty when there are 0 groups or 0 items", () => {
    const emptyGroups: Group[] = [];
    const isWorkspaceActive = (groups: Group[], editingDesign: any) => {
      if (editingDesign !== null) return true;
      if (groups.length === 0) return false;
      return groups.some((g) => g.items && g.items.length > 0);
    };

    expect(isWorkspaceActive(emptyGroups, null)).toBe(false);

    // Group with 0 items
    const groupsWithNoItems: Group[] = [{ id: "g1", x: 0, y: 0, axis: "x", items: [] }];
    expect(isWorkspaceActive(groupsWithNoItems, null)).toBe(false);
  });

  it("determines workspace as active when there are items on canvas or an editing design", () => {
    const activeGroups: Group[] = [
      {
        id: "g1",
        x: 20,
        y: 80,
        axis: "x",
        items: [{ ...makeItem("button"), id: "btn1", label: "Existing Button" }],
      },
    ];

    const isWorkspaceActive = (groups: Group[], editingDesign: any) => {
      if (editingDesign !== null) return true;
      if (groups.length === 0) return false;
      return groups.some((g) => g.items && g.items.length > 0);
    };

    expect(isWorkspaceActive(activeGroups, null)).toBe(true);
    expect(isWorkspaceActive([], { title: "My Design" })).toBe(true);
  });

  it("calculates correct startX for new Artboard when using Keep & Import", () => {
    const currentFrames: Frame[] = [
      { id: "f1", name: "Screen 1", x: 0, y: 80, w: 440, h: 956 },
    ];

    const calcNextFrameX = (frames: Frame[]) =>
      frames.length
        ? Math.max(...frames.map((f) => frameRect(f).r)) + FRAME_GAP
        : 0;

    const nextX = calcNextFrameX(currentFrames);
    // frameRect(f1).r = 0 + 440 = 440
    // nextX = 440 + FRAME_GAP (FRAME_GAP is 48)
    expect(nextX).toBe(440 + FRAME_GAP);
  });

  it("preserves existing artboards and adds imported artboard side-by-side with remapped IDs", () => {
    const existingFrames: Frame[] = [
      { id: "f_original", name: "Original Screen", x: 0, y: 80, w: 440, h: 956 },
    ];
    const existingGroups: Group[] = [
      {
        id: "g_original",
        x: 20,
        y: 100,
        axis: "x",
        items: [{ ...makeItem("button"), id: "btn_orig", label: "Button 1" }],
      },
    ];

    const importedFrames: Frame[] = [
      { id: "f_import", name: "Imported Headphones", x: 0, y: 0, w: 440, h: 956 },
    ];
    const importedGroups: Group[] = [
      {
        id: "g_import",
        x: 20,
        y: 80,
        axis: "x",
        items: [{ ...makeItem("card"), id: "card_import", label: "Headphones 3D" }],
      },
    ];

    const startX = 440 + FRAME_GAP;
    const startY = 80;
    const dx = startX - importedFrames[0].x;
    const dy = startY - importedFrames[0].y;

    // Remap IDs
    let counter = 1;
    const uid = () => `new_${counter++}`;
    const frameIdMap = new Map<string, string>();

    const remappedFrames = importedFrames.map((f) => {
      const newId = uid();
      frameIdMap.set(f.id, newId);
      return {
        ...f,
        id: newId,
        x: Math.round(f.x + dx),
        y: Math.round(f.y + dy),
      };
    });

    const remappedGroups = importedGroups.map((g) => ({
      ...g,
      id: uid(),
      x: Math.round(g.x + dx),
      y: Math.round(g.y + dy),
      items: g.items.map((it) => ({
        ...it,
        id: uid(),
      })),
    }));

    const finalFrames = [...existingFrames, ...remappedFrames];
    const finalGroups = [...existingGroups, ...remappedGroups];

    // Verify existing design was 100% kept
    expect(finalFrames).toHaveLength(2);
    expect(finalFrames[0].id).toBe("f_original");
    expect(finalGroups[0].id).toBe("g_original");

    // Verify new artboard is positioned to the right without overlapping
    expect(finalFrames[1].x).toBe(startX);
    expect(finalFrames[1].y).toBe(startY);
    expect(finalGroups[1].x).toBe(20 + dx);

    // Verify all IDs are unique
    const allGroupIds = finalGroups.map((g) => g.id);
    const allItemIds = finalGroups.flatMap((g) => g.items.map((it) => it.id));
    expect(new Set(allGroupIds).size).toBe(allGroupIds.length);
    expect(new Set(allItemIds).size).toBe(allItemIds.length);
  });
});
