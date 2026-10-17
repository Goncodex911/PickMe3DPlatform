import { describe, it, expect } from "vitest";
import {
  ALL_DEVICES,
  DEVICE_BRANDS,
  DESKTOP_DEVICES,
  findDeviceById,
  DeviceConfig,
} from "./devices";

describe("Device Presets (constants/devices.ts)", () => {
  it("contains unique IDs across all devices", () => {
    const ids = ALL_DEVICES.map((d) => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("ensures every device has positive width, height, and valid pixelRatio", () => {
    for (const d of ALL_DEVICES) {
      expect(d.width).toBeGreaterThan(0);
      expect(d.height).toBeGreaterThan(0);
      expect(d.pixelRatio).toBeGreaterThanOrEqual(1);
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.brand.length).toBeGreaterThan(0);
      expect(["mobile", "desktop"]).toContain(d.type);
    }
  });

  it("includes at least 5 mobile brands with at least 5 devices each", () => {
    expect(DEVICE_BRANDS.length).toBeGreaterThanOrEqual(5);
    for (const brandGroup of DEVICE_BRANDS) {
      expect(brandGroup.devices.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("includes popular desktop screen presets (16:9, 16:10, 21:9 Ultrawide, 32:9 Super Ultrawide, 4:3)", () => {
    expect(DESKTOP_DEVICES.length).toBeGreaterThanOrEqual(5);
    const aspectRatios = DESKTOP_DEVICES.map((d) => d.aspectRatio);
    expect(aspectRatios).toContain("16:9");
    expect(aspectRatios).toContain("16:10");
    expect(aspectRatios).toContain("21:9");
    expect(aspectRatios).toContain("32:9");
    expect(aspectRatios).toContain("4:3");
  });

  it("findDeviceById retrieves existing device correctly", () => {
    const iphone = findDeviceById("iphone-16-pro-max");
    expect(iphone).toBeDefined();
    expect(iphone?.name).toBe("iPhone 16 Pro Max");
    expect(iphone?.width).toBe(440);
    expect(iphone?.height).toBe(956);
  });

  it("findDeviceById returns undefined for nonexistent device", () => {
    expect(findDeviceById("non-existent-device-id")).toBeUndefined();
  });
});
