"use client";

import React from "react";
import Link from "next/link";

export default function AdminBillingPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Quản Trị Tổ Chức & Gói Dịch Vụ (Enterprise & Billing)
        </h1>
        <p className="text-neutral-400 text-sm mt-1">
          Báo cáo khảo sát kỹ thuật theo đặc tả dự án PickMe3D Platform (Phase 4 Section G).
        </p>
      </div>

      {/* Main Status Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#141824] border border-neutral-800/80 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <span className="material-symbols-rounded text-3xl">corporate_fare</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Trạng Thái Kiến Trúc & Dữ Liệu</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                Chờ Tích Hợp Cổng Thanh Toán
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Khảo sát mã nguồn hiện tại: <code className="text-neutral-300 font-mono">backend/src/models/</code>
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#191f30] border border-neutral-700/60 text-xs text-neutral-300 space-y-2">
          <div className="font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-rounded text-base text-indigo-400">info</span>
            Tuân thủ hướng dẫn kỹ thuật (Implementation Rules & Phase 4 Section G):
          </div>
          <p className="text-neutral-400 leading-relaxed">
            Hệ thống hiện tại bao gồm các model: <code className="text-indigo-300">User</code>, <code className="text-indigo-300">Template</code>, <code className="text-indigo-300">Comment</code>, <code className="text-indigo-300">Collection</code>, <code className="text-indigo-300">Notification</code>, <code className="text-indigo-300">Report</code>, <code className="text-indigo-300">AuditLog</code>. 
            Không tồn tại model giao dịch tài chính (<code className="text-neutral-400">PaymentTransaction</code>) hoặc đăng ký tổ chức (<code className="text-neutral-400">OrganizationRequest</code>).
          </p>
          <p className="text-neutral-400 leading-relaxed">
            Theo tài liệu <code className="text-indigo-300">FEATURE_PROPOSALS.md</code> Mục 3.4 (Nhóm 3 — Tính năng chiến lược: Gói trả phí Monetization), tính năng này được xếp vào lộ trình tương lai. Nhằm đảm bảo tính trung thực và bảo mật, hệ thống không tạo dữ liệu giả hoặc luồng thanh toán ảo.
          </p>
        </div>

        {/* Proposed Schema Specifications */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="material-symbols-rounded text-purple-400">schema</span>
            Đặc Tả Mô Hình Đề Xuất Khi Tích Hợp (Roadmap)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#10131f] border border-neutral-800 text-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Mô Hình Tổ Chức (Organization)
              </div>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                Hỗ trợ các thương hiệu thời trang hoặc studio 3D:
              </p>
              <ul className="list-disc list-inside text-neutral-400 text-[11px] space-y-1 font-mono">
                <li>name: String (Tên tổ chức)</li>
                <li>owner: ObjectId (ref: User)</li>
                <li>members: Array&lt;User, Role&gt;</li>
                <li>customDomain: String</li>
                <li>status: active | pending | suspended</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-[#10131f] border border-neutral-800 text-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Gói Thuê Bao (Subscription Tier)
              </div>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                Phân quyền hạn mức tài nguyên:
              </p>
              <ul className="list-disc list-inside text-neutral-400 text-[11px] space-y-1 font-mono">
                <li>plan: Free | Pro | Studio</li>
                <li>billingCycle: monthly | yearly</li>
                <li>paymentGateway: Stripe | VNPay | MoMo</li>
                <li>currentPeriodEnd: Date</li>
                <li>cancelAtPeriodEnd: Boolean</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-neutral-800">
          <span className="text-xs text-neutral-500">
            Mô-đun sẵn sàng mở rộng khi đối tác kết nối cổng thanh toán chính thức.
          </span>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
          >
            ← Về Bảng Tổng Quan
          </Link>
        </div>
      </div>
    </div>
  );
}
