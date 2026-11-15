import { describe, expect, it } from "vitest";
import { normalise, validate, type DialogField } from "./ActionDialog";

const refundFields: DialogField[] = [
  { name: "reference", label: "Mã giao dịch", required: true },
  { name: "proof", label: "Link chứng từ" },
  { name: "revokeAccess", label: "Rút ngắn hạn gói", type: "checkbox", defaultChecked: true },
];

describe("ActionDialog validation", () => {
  it("requires mandatory text and ignores optional / checkbox fields", () => {
    expect(validate(refundFields, { reference: "   ", proof: "", revokeAccess: false })).toEqual({ reference: "Bắt buộc nhập" });
    expect(validate(refundFields, { reference: "FT123", proof: "", revokeAccess: true })).toEqual({});
  });

  it("checks number bounds for amounts", () => {
    const fields: DialogField[] = [{ name: "amount", label: "Số tiền", type: "number", required: true, min: 1, max: 99000 }];
    expect(validate(fields, { amount: "" })).toEqual({ amount: "Bắt buộc nhập" });
    expect(validate(fields, { amount: "abc" })).toEqual({ amount: "Phải là số" });
    expect(validate(fields, { amount: "150000" }).amount).toMatch(/^Tối đa/);
    expect(validate(fields, { amount: "0" }).amount).toMatch(/^Tối thiểu/);
    expect(validate(fields, { amount: "99.000" })).toEqual({});
  });

  it("enforces minimum length only when text is present", () => {
    const fields: DialogField[] = [{ name: "note", label: "Ghi chú", minLength: 10 }];
    expect(validate(fields, { note: "" })).toEqual({});
    expect(validate(fields, { note: "ngắn" })).toEqual({ note: "Tối thiểu 10 ký tự" });
  });

  it("returns trimmed strings, numbers and booleans", () => {
    expect(normalise(refundFields, { reference: "  FT123 ", proof: " ", revokeAccess: true })).toEqual({ reference: "FT123", proof: "", revokeAccess: true });
    expect(normalise([{ name: "amount", label: "Số tiền", type: "number" }], { amount: "99.000" })).toEqual({ amount: 99000 });
  });
});
