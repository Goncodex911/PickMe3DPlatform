import { describe, it, expect, vi } from "vitest";
import React from "react";
import FloorLayerToolbar, { CameraMode } from "./FloorLayerToolbar";

describe("STORY-THUAN-BP08: 3D WebGL Viewer Controls & FloorLayerToolbar", () => {
  it("renders correctly with default props", () => {
    const onCameraModeChange = vi.fn();
    const onToggleCeilings = vi.fn();
    const onToggleWalls = vi.fn();
    const onToggleFurniture = vi.fn();
    const onToggleLandscape = vi.fn();
    const onToggleRuler = vi.fn();
    const onClearMeasurement = vi.fn();

    const element = FloorLayerToolbar({
      cameraMode: "orbit",
      onCameraModeChange,
      showCeilings: true,
      onToggleCeilings,
      showWalls: true,
      onToggleWalls,
      showFurniture: true,
      onToggleFurniture,
      showLandscape: true,
      onToggleLandscape,
      isRulerActive: false,
      onToggleRuler,
      measuredDistance: null,
      onClearMeasurement
    });

    expect(element).toBeDefined();
    expect(element.type).toBe("div");
  });

  it("displays measured distance when ruler has 2 points", () => {
    const onClearMeasurement = vi.fn();

    const element = FloorLayerToolbar({
      cameraMode: "orbit",
      onCameraModeChange: vi.fn(),
      showCeilings: true,
      onToggleCeilings: vi.fn(),
      showWalls: true,
      onToggleWalls: vi.fn(),
      showFurniture: true,
      onToggleFurniture: vi.fn(),
      showLandscape: true,
      onToggleLandscape: vi.fn(),
      isRulerActive: true,
      onToggleRuler: vi.fn(),
      measuredDistance: 4.85,
      onClearMeasurement
    });

    // Check that measurement string is present in tree
    const jsonStr = JSON.stringify(element);
    expect(jsonStr).toContain('"4.85"');
    expect(jsonStr).toContain('" m"');
  });

  it("displays walkthrough instructions when cameraMode is walkthrough", () => {
    const element = FloorLayerToolbar({
      cameraMode: "walkthrough",
      onCameraModeChange: vi.fn(),
      showCeilings: true,
      onToggleCeilings: vi.fn(),
      showWalls: true,
      onToggleWalls: vi.fn(),
      showFurniture: true,
      onToggleFurniture: vi.fn(),
      showLandscape: true,
      onToggleLandscape: vi.fn(),
      isRulerActive: false,
      onToggleRuler: vi.fn(),
      measuredDistance: null,
      onClearMeasurement: vi.fn()
    });

    const jsonStr = JSON.stringify(element);
    expect(jsonStr).toContain("W-A-S-D");
    expect(jsonStr).toContain("First-Person");
  });
});
