import { describe, expect, it } from "vitest";
import { formatPlanExpiry, planExpiry } from "./planExpiry";

const NOW = new Date("2026-11-15T11:33:00+07:00").getTime();
const DAY = 24 * 60 * 60 * 1000;

describe("planExpiry", () => {
  it("returns null for free plans and missing or invalid dates", () => {
    expect(planExpiry("free", new Date(NOW + DAY), NOW)).toBeNull();
    expect(planExpiry("pro", null, NOW)).toBeNull();
    expect(planExpiry("pro", "not-a-date", NOW)).toBeNull();
    expect(planExpiry(undefined, new Date(NOW + DAY), NOW)).toBeNull();
  });

  it("counts 30 days for a fresh one-month purchase", () => {
    const info = planExpiry("pro", new Date(NOW + 30 * DAY).toISOString(), NOW)!;
    expect(info.daysLeft).toBe(30);
    expect(info.expired).toBe(false);
    expect(formatPlanExpiry(info)).toMatch(/^Hết hạn .+ · còn 30 ngày$/);
  });

  it("rounds a partial last day up and marks past dates as expired", () => {
    expect(planExpiry("pro", new Date(NOW + 2 * 60 * 60 * 1000), NOW)!.daysLeft).toBe(1);
    const past = planExpiry("pro", new Date(NOW - DAY), NOW)!;
    expect(past).toMatchObject({ daysLeft: 0, expired: true });
    expect(formatPlanExpiry(past)).toMatch(/^Đã hết hạn /);
  });
});
