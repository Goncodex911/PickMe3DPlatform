"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { trackEvent } from "@/lib/gtag";

interface AdminUserSession {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  picture?: string;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Tổng quan", icon: "dashboard", exact: true },
  { href: "/admin/users", label: "Quản lý người dùng", icon: "group" },
  { href: "/admin/templates", label: "Mẫu 3D & Slides", icon: "view_in_ar" },
  { href: "/admin/billing", label: "Doanh thu & Gói cước", icon: "payments" },
  { href: "/admin/reports", label: "Sự cố & Vi phạm", icon: "report_problem" },
  { href: "/admin/audit-logs", label: "Nhật ký kiểm toán", icon: "history_edu" },
  { href: "/admin/analytics", label: "Báo cáo & Phân tích", icon: "analytics" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUserSession | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Admin login credentials state (Email-based, no username/password)
  const [adminEmail, setAdminEmail] = useState("phantrongquy23032005@gmail.com");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleAdminEmailLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminEmail.trim()) {
      setLoginError("Vui lòng nhập email quản trị viên");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Email không hợp lệ hoặc không có quyền quản trị viên");
      }
      localStorage.setItem("pickme3d_token", data.token);
      localStorage.setItem("pickme3d_user", JSON.stringify(data.user));
      trackEvent.login("admin", data.user?.email || adminEmail);
      setCurrentUser(data.user);
      setIsAuthorized(true);
    } catch (err: any) {
      setLoginError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.message || "Xác thực Google thất bại");
      }
      if (data.user.role !== "admin") {
        throw new Error(
          `Tài khoản ${data.user.email} không có quyền Quản trị viên. Email quản trị viên hợp lệ là: phantrongquy23032005@gmail.com`
        );
      }
      localStorage.setItem("pickme3d_token", data.token);
      localStorage.setItem("pickme3d_user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsAuthorized(true);
    } catch (err: any) {
      setLoginError(err.message || "Đăng nhập Google thất bại");
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    try {
      const token = localStorage.getItem("pickme3d_token");
      const userStr = localStorage.getItem("pickme3d_user");

      if (!token || !userStr) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      const user = JSON.parse(userStr) as AdminUserSession;
      setCurrentUser(user);

      if (user.role === "admin") {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch {
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("pickme3d_token");
    localStorage.removeItem("pickme3d_user");
    setCurrentUser(null);
    setIsAuthorized(false);
    router.push("/");
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-4" />
        <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">Đang xác thực quyền Quản trị viên...</p>
      </div>
    );
  }

  // 2. Unauthorized State -> Displays Admin Email / Google Login Form
  if (!isAuthorized) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-zinc-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 25%, rgba(255, 255, 255, 0.03), transparent 60%)",
          }}
        />

        <div className="max-w-md w-full bg-zinc-900/60 border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 border border-white/10 bg-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span className="text-[10px] tracking-widest text-zinc-400 font-mono uppercase">
              Pick Me 3D Admin Portal
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-2">
            Cổng Quản Trị Viên
          </h2>
          <p className="text-zinc-400 text-xs leading-relaxed mb-6">
            Đăng nhập để điều hành hệ thống: <b className="text-zinc-200 font-medium">phantrongquy23032005@gmail.com</b>
          </p>

          {currentUser && currentUser.role !== "admin" && (
            <div className="mb-5 p-3 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 text-xs flex items-center justify-between gap-2">
              <span>Đang đăng nhập: <b>{currentUser.email}</b> (Không có quyền admin)</span>
              <button
                onClick={handleLogout}
                className="underline text-white hover:text-zinc-300 font-medium cursor-pointer"
              >
                Đổi tài khoản
              </button>
            </div>
          )}

          {loginError && (
            <div className="mb-5 p-3 rounded-xl bg-zinc-900 border border-white/15 text-zinc-300 text-xs flex items-center gap-2 text-left">
              <span className="material-symbols-rounded text-sm text-zinc-400">error</span>
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Google OAuth Login */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-950 border border-white/10">
              <span className="text-[11px] text-zinc-400 mb-3 font-medium">
                Đăng nhập tài khoản Google Quản trị
              </span>
              <div className="p-1 rounded-full border border-white/15 hover:border-white/30 transition-all">
                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={() => setLoginError("Đăng nhập Google không thành công. Vui lòng thử lại.")}
                />
              </div>
            </div>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-zinc-900/90 px-3 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                hoặc xác thực nhanh
              </span>
              <div className="border-t border-white/10 w-full" />
            </div>

            {/* Direct Email Login */}
            <form onSubmit={handleAdminEmailLogin} className="space-y-3">
              <div className="text-left">
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Email Quản Trị Viên
                </label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                    mail
                  </span>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="phantrongquy23032005@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-white/30 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 font-medium text-xs text-black tracking-wide transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-rounded text-base text-black">login</span>
                <span>{loginLoading ? "Đang xác thực..." : "Xác Nhận Đăng Nhập Admin"}</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-rounded text-sm">arrow_back</span>
              <span>Về trang chủ PickMe3D</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized Admin Layout
  const activeItem = NAV_ITEMS.find((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  );

  return (
    <div className="min-h-[calc(100vh-68px)] bg-zinc-950 text-zinc-200 flex flex-col font-sans antialiased selection:bg-white selection:text-black">
      {/* Admin Contextual Sub-Control Bar (under SiteNav) */}
      <header className="h-14 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors"
            title="Thu gọn / Mở rộng Menu"
            aria-label="Toggle Sidebar"
          >
            <span className="material-symbols-rounded text-lg">
              {sidebarOpen ? "menu_open" : "menu"}
            </span>
          </button>

          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span className="font-semibold text-xs sm:text-sm text-white tracking-wide">
              Admin Console
            </span>
            <span className="hidden sm:inline-block text-zinc-700">•</span>
            <span className="hidden sm:inline-block text-xs text-zinc-400 font-medium">
              {activeItem?.label || "Bảng điều khiển"}
            </span>
            <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-white/10 rounded-full font-medium ml-1">
              Super Admin
            </span>
          </div>
        </div>

        {/* Right Action Shortcuts */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/60 border border-white/10 text-[11px] text-zinc-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>Core v1.0 • Atlas Connected</span>
          </div>

          <Link
            href="/editor"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all border border-white/10"
            title="Mở trình chỉnh sửa Canvas 3D"
          >
            <span className="material-symbols-rounded text-sm text-zinc-400">palette</span>
            <span className="hidden sm:inline">3D Canvas</span>
          </Link>

          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all border border-white/10"
            title="Xem thư viện mẫu giao diện"
          >
            <span className="material-symbols-rounded text-sm text-zinc-400">category</span>
            <span className="hidden sm:inline">Thư viện</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-20"
          } shrink-0 bg-zinc-950 border-r border-white/10 transition-all duration-200 flex flex-col justify-between hidden md:flex select-none`}
        >
          <div className="p-3 space-y-1">
            <div className={`px-3 py-2 text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-widest ${!sidebarOpen && "text-center"}`}>
              {sidebarOpen ? "Mục Quản Trị" : "•••"}
            </div>

            {NAV_ITEMS.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group relative ${
                    active
                      ? "bg-zinc-900 text-white border border-white/10"
                      : "text-zinc-400 hover:bg-zinc-900/50 hover:text-white border border-transparent"
                  } ${!sidebarOpen && "justify-center"}`}
                  title={item.label}
                >
                  <span
                    className={`material-symbols-rounded text-lg transition-colors ${
                      active ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          {sidebarOpen && (
            <div className="p-4 m-3 rounded-xl bg-zinc-900/40 border border-white/10 text-xs text-zinc-400">
              <div className="flex items-center gap-2 mb-1.5 text-zinc-300 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                PickMe3D Core Platform
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                Cơ sở dữ liệu Atlas MongoDB & PayOS Gateway hoạt động ổn định.
              </p>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-zinc-950">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
