"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

  // Admin login credentials state
  const [adminUsername, setAdminUsername] = useState("admin123");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword) {
      setLoginError("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Tên đăng nhập hoặc mật khẩu quản trị không chính xác");
      }
      localStorage.setItem("pickme3d_token", data.token);
      localStorage.setItem("pickme3d_user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsAuthorized(true);
    } catch (err: any) {
      setLoginError(err.message || "Đăng nhập thất bại");
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
      <div className="min-h-screen bg-[#0d0f17] text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
        <p className="text-neutral-400 text-sm font-medium">Đang xác thực quyền Quản trị viên...</p>
      </div>
    );
  }

  // 2. Unauthorized State -> Displays Admin Login Form
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0b0d14] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#151926] border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-5">
            <span className="material-symbols-rounded text-3xl">admin_panel_settings</span>
          </div>

          <h2 className="text-2xl font-bold mb-1 text-center">Đăng Nhập Quản Trị Viên</h2>
          <p className="text-neutral-400 text-xs leading-relaxed mb-6 text-center">
            Khu vực dành riêng cho Quản trị viên hệ thống PickMe3D Platform.
          </p>

          {currentUser && currentUser.role !== "admin" && (
            <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
              <span>Đang đăng nhập: <b>{currentUser.email}</b> (Không có quyền admin)</span>
              <button
                onClick={handleLogout}
                className="underline text-amber-200 hover:text-white font-semibold cursor-pointer"
              >
                Đổi tài khoản
              </button>
            </div>
          )}

          {loginError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-rounded text-sm">error</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 text-left">
                Tên Đăng Nhập
              </label>
              <div className="relative">
                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                  person
                </span>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin123"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0e111a] border border-neutral-700/80 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 text-left">
                Mật Khẩu
              </label>
              <div className="relative">
                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                  key
                </span>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Nhập mật khẩu (VD: admin123)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0e111a] border border-neutral-700/80 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold text-xs text-white transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-base">login</span>
              <span>{loginLoading ? "Đang xác thực..." : "Đăng Nhập Admin Console"}</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
            <Link
              href="/"
              className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-1"
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
  return (
    <div className="min-h-screen bg-[#0b0d14] text-neutral-200 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-[#121624]/90 backdrop-blur-md border-b border-neutral-800/80 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-neutral-800/80 text-neutral-400 hover:text-white transition-colors"
            title="Toggle Sidebar"
          >
            <span className="material-symbols-rounded text-xl">
              {sidebarOpen ? "menu_open" : "menu"}
            </span>
          </button>

          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              3D
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">PickMe3D</span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/editor"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-xs font-medium text-neutral-300 transition-colors border border-neutral-700/50"
          >
            <span className="material-symbols-rounded text-base text-indigo-400">palette</span>
            Mở 3D Editor
          </Link>

          <Link
            href="/templates"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-xs font-medium text-neutral-300 transition-colors border border-neutral-700/50"
          >
            <span className="material-symbols-rounded text-base text-purple-400">category</span>
            Xem Thư viện
          </Link>

          <div className="h-5 w-[1px] bg-neutral-800 hidden sm:block mx-1" />

          {/* Admin User Badge */}
          <div className="flex items-center gap-2 pl-1">
            {currentUser?.picture ? (
              <img
                src={currentUser.picture}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full border border-indigo-500/40 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {currentUser?.name?.charAt(0) || "A"}
              </div>
            )}
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-medium text-white leading-tight">
                {currentUser?.name || "Administrator"}
              </span>
              <span className="text-[10px] text-indigo-400 font-semibold leading-tight">
                Super Admin
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
            title="Đăng xuất"
          >
            <span className="material-symbols-rounded text-xl">logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-20"
          } shrink-0 bg-[#0f121d] border-r border-neutral-800/80 transition-all duration-200 flex flex-col justify-between hidden md:flex`}
        >
          <div className="p-3 space-y-1">
            <div className={`px-3 py-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider ${!sidebarOpen && "text-center"}`}>
              {sidebarOpen ? "Hệ thống quản trị" : "Menu"}
            </div>

            {NAV_ITEMS.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm"
                      : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 border border-transparent"
                  } ${!sidebarOpen && "justify-center"}`}
                  title={item.label}
                >
                  <span className={`material-symbols-rounded text-xl ${active ? "text-indigo-400" : "text-neutral-500"}`}>
                    {item.icon}
                  </span>
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          {sidebarOpen && (
            <div className="p-4 m-3 rounded-2xl bg-[#151926] border border-neutral-800 text-xs text-neutral-400">
              <div className="flex items-center gap-2 mb-1.5 text-neutral-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                PickMe3D Core API
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Máy chủ hoạt động bình thường trên MongoDB Atlas & Node.js.
              </p>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0b0d14] p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
