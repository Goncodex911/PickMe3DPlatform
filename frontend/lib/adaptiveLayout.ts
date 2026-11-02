/**
 * adaptiveLayout.ts — PickMe3D Adaptive Layout Conversion Engine
 *
 * Automatically converts, scales, and restructures UI layouts when switching
 * device viewports (e.g., Mobile -> PC/Desktop, PC -> Mobile, Mobile -> Mobile, Desktop -> Desktop).
 *
 * Core Principles:
 * 1. No Fixed-Scale Shrinkage: Elements never stay glued at small mobile widths on a large PC screen.
 * 2. Adaptive Restructuring:
 *    - Mobile -> PC: 1-column stack transforms into Multi-column (e.g. Hero 3D showcase on left,
 *      feature specs & actions on right) or responsive Grid (2-4 columns) with Fill Container / Stretch.
 *    - PC -> Mobile: Multi-columns collapse into a single-column flow with ergonomic touch targets.
 *    - Mobile <-> Mobile: Proportional scaling matching device pixel density & width.
 *    - Desktop <-> Desktop: Proportional DPI scaling for 2K/4K/Ultrawide displays.
 * 3. Content & Hierarchy Preservation: Keeps 100% of elements, text, 3D properties, and icons intact.
 */

import {
  Group,
  Frame,
  Item,
  Kind,
  PHONE_W,
  PHONE_H,
  PHONE_MARGIN,
  contentWidth,
  halfWidth,
  frameRect,
  frameSizeOf,
  frameOfGroup,
  groupBounds,
  FULL_WIDTH,
  NAV_BAR_H,
} from "./tokens";
import { DeviceConfig } from "@/constants/devices";

export interface AdaptLayoutOptions {
  groups: Group[];
  currentFrame: Frame;
  targetWidth: number;
  targetHeight: number;
  targetName?: string;
  frames: Frame[];
  widths: Record<string, number>;
  sourceDevice?: DeviceConfig | null;
  targetDevice?: DeviceConfig | null;
}

export interface AdaptLayoutResult {
  frames: Frame[];
  groups: Group[];
}

/** Check if element is a navigation bar */
function isTopNav(item: Item): boolean {
  return item.kind === "topAppBar";
}

function isBottomNav(item: Item): boolean {
  return item.kind === "bottomNav";
}

function isRail(item: Item): boolean {
  return item.kind === "navRail";
}

/** Check if element is a visual/hero media container (Card, Box with 3D/image, Camera, Map) */
function isHeroOrMedia(item: Item): boolean {
  return (
    item.kind === "card" ||
    item.kind === "box" ||
    item.kind === "camera" ||
    item.kind === "image" ||
    item.kind === "animation" ||
    item.kind === "map"
  );
}

/** Check if element is an action control (Buttons, FAB) */
function isActionControl(item: Item): boolean {
  return (
    item.kind === "button" ||
    item.kind === "splitButton" ||
    item.kind === "iconButton" ||
    item.kind === "fab" ||
    item.kind === "extendedFab"
  );
}

/** Check if element is a feature spec / list item / input */
function isFeatureOrInput(item: Item): boolean {
  return (
    item.kind === "listItem" ||
    item.kind === "textField" ||
    item.kind === "select" ||
    item.kind === "chip" ||
    item.kind === "switch" ||
    item.kind === "checkbox" ||
    item.kind === "radio" ||
    item.kind === "slider" ||
    item.kind === "linearProgress"
  );
}

/**
 * Main adaptive layout function
 */
export function adaptFrameLayout(options: AdaptLayoutOptions): AdaptLayoutResult {
  const {
    groups,
    currentFrame,
    targetWidth: toW,
    targetHeight: toH,
    targetName,
    frames,
    widths,
    sourceDevice,
    targetDevice,
  } = options;

  const fromW = currentFrame.w ?? PHONE_W;
  const fromH = currentFrame.h ?? PHONE_H;

  // Determine transition types
  const fromIsMobile =
    sourceDevice?.type === "mobile" || fromW <= 600 || fromW < fromH;
  const toIsMobile =
    targetDevice?.type === "mobile" || toW <= 600 || (toW < toH && toW <= 768);

  const isMobileToDesktop = fromIsMobile && !toIsMobile;
  const isDesktopToMobile = !fromIsMobile && toIsMobile;
  const isMobileToMobile = fromIsMobile && toIsMobile;
  const isDesktopToDesktop = !fromIsMobile && !toIsMobile;

  // Identify groups belonging to this frame
  const mine = groups.filter(
    (g) => frameOfGroup(g, frames, widths)?.id === currentFrame.id
  );
  const others = groups.filter(
    (g) => frameOfGroup(g, frames, widths)?.id !== currentFrame.id
  );

  // Calculate canvas shift for frames to the right
  const shiftX = toW - fromW;
  const updatedFrames = frames.map((f) =>
    f.id === currentFrame.id
      ? { ...f, w: toW, h: toH, name: targetName ?? f.name }
      : f.x >= currentFrame.x + fromW
      ? { ...f, x: f.x + shiftX }
      : f
  );

  if (mine.length === 0) {
    return { frames: updatedFrames, groups };
  }

  const frameX = currentFrame.x;
  const frameY = currentFrame.y;

  let adaptedMine: Group[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // CASE A: MOBILE -> PC / DESKTOP (Multi-column & Grid Restructuring)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isMobileToDesktop) {
    adaptedMine = convertMobileToDesktop({
      mine,
      frameX,
      frameY,
      fromW,
      fromH,
      toW,
      toH,
      widths,
    });
  }
  // ─────────────────────────────────────────────────────────────────────────────
  // CASE B: PC / DESKTOP -> MOBILE (Collapse to Single-Column Flow)
  // ─────────────────────────────────────────────────────────────────────────────
  else if (isDesktopToMobile) {
    adaptedMine = convertDesktopToMobile({
      mine,
      frameX,
      frameY,
      fromW,
      fromH,
      toW,
      toH,
      widths,
    });
  }
  // ─────────────────────────────────────────────────────────────────────────────
  // CASE C: MOBILE -> MOBILE (Proportional Scaling & Alignment)
  // ─────────────────────────────────────────────────────────────────────────────
  else if (isMobileToMobile) {
    adaptedMine = convertMobileToMobile({
      mine,
      frameX,
      frameY,
      fromW,
      fromH,
      toW,
      toH,
      widths,
    });
  }
  // ─────────────────────────────────────────────────────────────────────────────
  // CASE D: DESKTOP -> DESKTOP (High-DPI / 4K / Ultrawide Responsive Scale)
  // ─────────────────────────────────────────────────────────────────────────────
  else {
    adaptedMine = convertDesktopToDesktop({
      mine,
      frameX,
      frameY,
      fromW,
      fromH,
      toW,
      toH,
      widths,
    });
  }

  // Combine adapted frame groups with other frames' groups (shifted if to the right)
  const movedOtherGroups = others.map((g) => {
    const parent = frameOfGroup(g, frames, widths);
    if (parent && parent.id !== currentFrame.id && parent.x >= currentFrame.x + fromW) {
      return { ...g, x: g.x + shiftX };
    }
    return g;
  });

  return {
    frames: updatedFrames,
    groups: [...movedOtherGroups, ...adaptedMine],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTATION: Mobile -> PC / Desktop
// ─────────────────────────────────────────────────────────────────────────────
function convertMobileToDesktop({
  mine,
  frameX,
  frameY,
  fromW,
  fromH,
  toW,
  toH,
  widths,
}: {
  mine: Group[];
  frameX: number;
  frameY: number;
  fromW: number;
  fromH: number;
  toW: number;
  toH: number;
  widths: Record<string, number>;
}): Group[] {
  // 1. High-DPI UI scale factor for 2K / 4K UHD displays (e.g. 3840x2160)
  const is4K = toW >= 2560;
  const uiScale = is4K ? Math.min(2.0, 1.0 + (toW - 1920) / 1920) : 1.0;

  // Ergonomic desktop layout dimensions
  const desktopMargin = Math.round(
    Math.min(72, Math.max(36, toW * 0.04)) * (is4K ? 1.4 : 1.0)
  );
  const gutter = Math.round(24 * (is4K ? 1.4 : 1.0));

  // Sort groups by original vertical order
  const sorted = [...mine].sort((a, b) => a.y - b.y || a.x - b.x);

  // Identify navigation components
  const topNavGroup = sorted.find((g) => g.items.some(isTopNav));
  const bottomNavGroup = sorted.find((g) => g.items.some(isBottomNav));
  const railGroup = sorted.find((g) => g.items.some(isRail));

  let topBarH = 0;
  let hasRail = false;
  let railW = 0;

  const result: Group[] = [];

  // Adapt Top App Bar
  if (topNavGroup) {
    topBarH = Math.round(64 * (is4K ? 1.3 : 1.0));
    const adaptedItems = topNavGroup.items.map((it) =>
      isTopNav(it)
        ? {
            ...it,
            size: toW,
            size2: topBarH,
          }
        : it
    );
    result.push({
      ...topNavGroup,
      x: frameX,
      y: frameY,
      items: adaptedItems,
    });
  }

  // Convert Mobile BottomNav to Desktop Navigation Rail (Left Docked)
  const navToConvert = bottomNavGroup || railGroup;
  if (navToConvert) {
    hasRail = true;
    railW = Math.round(96 * (is4K ? 1.3 : 1.0));
    const adaptedItems = navToConvert.items.map((it) => {
      if (isBottomNav(it) || isRail(it)) {
        return {
          ...it,
          kind: "navRail" as Kind,
          size: undefined,
          size2: toH - topBarH,
          railExpanded: false,
          radiusTop: it.radiusBottom,
          radiusBottom: it.radiusTop,
        };
      }
      return it;
    });
    result.push({
      ...navToConvert,
      x: frameX,
      y: frameY + topBarH,
      items: adaptedItems,
    });
  }

  // Calculate available body area for desktop content
  const contentLeft = frameX + (hasRail ? railW : 0) + desktopMargin;
  const contentRight = frameX + toW - desktopMargin;
  const contentW = contentRight - contentLeft;
  const contentTop = frameY + topBarH + desktopMargin;
  const contentH = toH - topBarH - desktopMargin * 2;

  // Filter out the nav groups from body items
  const bodyGroups = sorted.filter(
    (g) => g !== topNavGroup && g !== bottomNavGroup && g !== railGroup
  );

  if (bodyGroups.length === 0) {
    return result;
  }

  // Separate body elements into semantic roles
  const heroGroups: Group[] = [];
  const featureGroups: Group[] = [];
  const actionGroups: Group[] = [];
  const otherGroups: Group[] = [];

  bodyGroups.forEach((g) => {
    const mainItem = g.items[0];
    if (isActionControl(mainItem)) {
      actionGroups.push(g);
    } else if (isHeroOrMedia(mainItem) && heroGroups.length === 0) {
      // First prominent visual container acts as the Hero / 3D Canvas Showcase
      heroGroups.push(g);
    } else if (isFeatureOrInput(mainItem)) {
      featureGroups.push(g);
    } else {
      otherGroups.push(g);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PATTERN 1: 2-COLUMN SPLIT SHOWCASE (Hero/3D Model on Left, Specs & Actions on Right)
  // This matches the user's SmartWatch 3D Showcase in the screenshot!
  // ─────────────────────────────────────────────────────────────────────────
  if (heroGroups.length > 0 && (featureGroups.length > 0 || actionGroups.length > 0)) {
    const col1W = Math.round(contentW * 0.52);
    const col2Left = contentLeft + col1W + gutter;
    const col2W = contentW - col1W - gutter;

    // LEFT COLUMN: Prominent Hero / 3D Card (Fills Left Container)
    const hero = heroGroups[0];
    const heroH = Math.min(
      Math.round(col1W * 0.76),
      Math.max(420, contentH - 40)
    );
    const adaptedHeroItems = hero.items.map((it) => {
      if (isHeroOrMedia(it)) {
        return {
          ...it,
          size: col1W, // Fill Container horizontally
          size2: heroH, // Fill Container vertically
        };
      }
      return it;
    });

    result.push({
      ...hero,
      x: contentLeft,
      y: contentTop,
      items: adaptedHeroItems,
    });

    // RIGHT COLUMN: Feature List & Specifications (Stacking vertically)
    let currentY = contentTop;
    const itemGap = Math.round(14 * (is4K ? 1.3 : 1.0));

    featureGroups.forEach((g) => {
      const adaptedItems = g.items.map((it) => {
        // Expand list items, chips, inputs to fill the right column
        const baseH = it.size2 ?? 56;
        return {
          ...it,
          size: col2W, // Fill Container for column 2
          size2: is4K ? Math.round(baseH * uiScale) : baseH,
        };
      });

      result.push({
        ...g,
        x: col2Left,
        y: currentY,
        items: adaptedItems,
      });

      const h = Math.round(56 * (is4K ? uiScale : 1.0));
      currentY += h + itemGap;
    });

    // Other secondary items in right column
    otherGroups.forEach((g) => {
      const adaptedItems = g.items.map((it) => ({
        ...it,
        size: col2W,
      }));
      result.push({
        ...g,
        x: col2Left,
        y: currentY,
        items: adaptedItems,
      });
      currentY += 60 + itemGap;
    });

    // ACTION BUTTONS: Placed neatly at the bottom of the right column
    currentY += Math.round(10 * (is4K ? 1.4 : 1.0));

    actionGroups.forEach((g) => {
      const btnCount = g.items.length;
      const btnGap = Math.round(12 * (is4K ? 1.3 : 1.0));
      const btnH = Math.round(52 * (is4K ? 1.3 : 1.0));

      if (btnCount > 1) {
        // Multi-button row: share column width equally
        const singleBtnW = Math.floor(
          (col2W - (btnCount - 1) * btnGap) / btnCount
        );
        const adaptedItems = g.items.map((it) => ({
          ...it,
          size: singleBtnW,
          size2: btnH,
        }));
        result.push({
          ...g,
          x: col2Left,
          y: currentY,
          axis: "x",
          items: adaptedItems,
        });
      } else {
        // Single action button: spans full column width
        const adaptedItems = g.items.map((it) => ({
          ...it,
          size: col2W,
          size2: btnH,
        }));
        result.push({
          ...g,
          x: col2Left,
          y: currentY,
          items: adaptedItems,
        });
      }
      currentY += btnH + itemGap;
    });

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATTERN 2: MULTI-COLUMN RESPONSIVE GRID (Multiple cards/boxes)
  // ─────────────────────────────────────────────────────────────────────────
  const numCols = toW >= 2560 ? 4 : toW >= 1440 ? 3 : 2;
  const colW = Math.floor((contentW - (numCols - 1) * gutter) / numCols);
  let curRow = 0;
  let curCol = 0;
  let rowTop = contentTop;
  let maxRowH = 0;

  bodyGroups.forEach((g) => {
    const mainItem = g.items[0];
    const isFullWidth = FULL_WIDTH.includes(mainItem.kind);

    if (isFullWidth) {
      // Full width element (e.g. tabs, divider, searchBar): span all columns
      if (curCol > 0) {
        rowTop += maxRowH + gutter;
        curRow++;
        curCol = 0;
        maxRowH = 0;
      }
      const adaptedItems = g.items.map((it) => ({
        ...it,
        size: contentW,
      }));
      result.push({
        ...g,
        x: contentLeft,
        y: rowTop,
        items: adaptedItems,
      });
      rowTop += 64 + gutter;
      return;
    }

    const adaptedItems = g.items.map((it) => {
      const baseH = it.size2 ?? (isHeroOrMedia(it) ? Math.round(colW * 0.6) : 56);
      return {
        ...it,
        size: colW, // Fill Container for grid column
        size2: is4K ? Math.round(baseH * uiScale) : baseH,
      };
    });

    const itemH = isHeroOrMedia(mainItem) ? Math.round(colW * 0.6) : 60;
    maxRowH = Math.max(maxRowH, itemH);

    result.push({
      ...g,
      x: contentLeft + curCol * (colW + gutter),
      y: rowTop,
      items: adaptedItems,
    });

    curCol++;
    if (curCol >= numCols) {
      curCol = 0;
      curRow++;
      rowTop += maxRowH + gutter;
      maxRowH = 0;
    }
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTATION: PC / Desktop -> Mobile (Single Column Flow)
// ─────────────────────────────────────────────────────────────────────────────
function convertDesktopToMobile({
  mine,
  frameX,
  frameY,
  fromW,
  fromH,
  toW,
  toH,
  widths,
}: {
  mine: Group[];
  frameX: number;
  frameY: number;
  fromW: number;
  fromH: number;
  toW: number;
  toH: number;
  widths: Record<string, number>;
}): Group[] {
  const mobileMargin = PHONE_MARGIN;
  const mobileContentW = contentWidth(toW);
  const rowGap = 12;

  const sorted = [...mine].sort((a, b) => a.y - b.y || a.x - b.x);

  const topNavGroup = sorted.find((g) => g.items.some(isTopNav));
  const bottomNavGroup = sorted.find((g) => g.items.some(isBottomNav));
  const railGroup = sorted.find((g) => g.items.some(isRail));

  let topBarH = 0;
  const result: Group[] = [];

  // Top App Bar for mobile
  if (topNavGroup) {
    topBarH = 64;
    const adaptedItems = topNavGroup.items.map((it) => ({
      ...it,
      size: toW,
      size2: topBarH,
    }));
    result.push({
      ...topNavGroup,
      x: frameX,
      y: frameY,
      items: adaptedItems,
    });
  }

  // Convert Desktop NavRail back to Mobile BottomNav
  const navToConvert = railGroup || bottomNavGroup;
  if (navToConvert) {
    const adaptedItems = navToConvert.items.map((it) => {
      const {
        railExpanded: _e,
        railModal: _m,
        ...rest
      } = it as any;
      return {
        ...rest,
        kind: "bottomNav" as Kind,
        size: toW,
        size2: undefined,
        radiusTop: it.radiusBottom,
        radiusBottom: it.radiusTop,
      };
    });
    result.push({
      ...navToConvert,
      x: frameX,
      y: frameY + toH - NAV_BAR_H - 56,
      items: adaptedItems,
    });
  }

  // Content starts below top bar
  let currentY = frameY + topBarH + mobileMargin;

  const bodyGroups = sorted.filter(
    (g) => g !== topNavGroup && g !== bottomNavGroup && g !== railGroup
  );

  bodyGroups.forEach((g) => {
    const mainItem = g.items[0];

    // Scale elements to fit mobile content width
    const adaptedItems = g.items.map((it) => {
      if (isActionControl(it)) {
        return {
          ...it,
          size: g.items.length > 1 ? Math.floor((mobileContentW - 8) / g.items.length) : mobileContentW,
          size2: 48,
        };
      }
      if (isHeroOrMedia(it)) {
        return {
          ...it,
          size: mobileContentW,
          size2: Math.min(Math.round(mobileContentW * 0.6), 260),
        };
      }
      return {
        ...it,
        size: mobileContentW,
        size2: undefined,
      };
    });

    result.push({
      ...g,
      x: frameX + mobileMargin,
      y: currentY,
      items: adaptedItems,
    });

    const h = isHeroOrMedia(mainItem) ? Math.min(Math.round(mobileContentW * 0.6), 260) : 56;
    currentY += h + rowGap;
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTATION: Mobile -> Mobile (Proportional Scaling)
// ─────────────────────────────────────────────────────────────────────────────
function convertMobileToMobile({
  mine,
  frameX,
  frameY,
  fromW,
  fromH,
  toW,
  toH,
  widths,
}: {
  mine: Group[];
  frameX: number;
  frameY: number;
  fromW: number;
  fromH: number;
  toW: number;
  toH: number;
  widths: Record<string, number>;
}): Group[] {
  const fromContentW = contentWidth(fromW);
  const toContentW = contentWidth(toW);
  const scale = toContentW / fromContentW;

  return mine.map((g) => {
    const adaptedItems = g.items.map((it) => {
      if (isTopNav(it) || isBottomNav(it)) {
        return { ...it, size: toW };
      }
      if (it.size) {
        if (it.size >= fromContentW - 8) {
          return { ...it, size: toContentW };
        }
        if (Math.abs(it.size - halfWidth(fromW)) < 12) {
          return { ...it, size: halfWidth(toW) };
        }
        return { ...it, size: Math.round(it.size * scale) };
      }
      return it;
    });

    const relX = g.x - frameX;
    const newX = frameX + Math.round(relX * scale);

    return {
      ...g,
      x: newX,
      items: adaptedItems,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTATION: Desktop -> Desktop (High-DPI / 4K Scaling)
// ─────────────────────────────────────────────────────────────────────────────
function convertDesktopToDesktop({
  mine,
  frameX,
  frameY,
  fromW,
  fromH,
  toW,
  toH,
  widths,
}: {
  mine: Group[];
  frameX: number;
  frameY: number;
  fromW: number;
  fromH: number;
  toW: number;
  toH: number;
  widths: Record<string, number>;
}): Group[] {
  const scaleX = toW / fromW;
  const isTarget4K = toW >= 2560;

  return mine.map((g) => {
    const adaptedItems = g.items.map((it) => {
      if (isTopNav(it)) {
        return { ...it, size: toW, size2: isTarget4K ? 84 : 64 };
      }
      if (isRail(it)) {
        return { ...it, size2: toH };
      }
      if (it.size) {
        return { ...it, size: Math.round(it.size * scaleX) };
      }
      return it;
    });

    const relX = g.x - frameX;
    const relY = g.y - frameY;
    const newX = frameX + Math.round(relX * scaleX);
    const newY = frameY + (toH >= fromH ? Math.round(relY * (toH / fromH)) : relY);

    return {
      ...g,
      x: newX,
      y: newY,
      items: adaptedItems,
    };
  });
}
