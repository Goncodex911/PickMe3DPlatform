import { describe, expect, it } from "vitest";
import { formatVnd, planAllows } from "./paymentService";

describe("payment plans", () => {
  it("formats VND without trusting a client amount", () => {
    expect(formatVnd(99000)).toMatch(/99\.000đ|99,000đ/);
  });

  it("keeps PPTX and brand kit behind the paid plans", () => {
    expect(planAllows("free", "export-pptx")).toBe(false);
    expect(planAllows("pro", "export-pptx")).toBe(true);
    expect(planAllows("pro", "brand")).toBe(false);
    expect(planAllows("studio", "brand")).toBe(true);
  });
});
