"use client";

import React, { useEffect, useState } from "react";
import {
  fetchAdminUsersApi,
  createAdminUserApi,
  updateUserStatusApi,
  updateUserRoleApi,
  updateUserPlanApi,
  importUsersApi,
  AdminUser,
  PaginationMeta,
} from "@/lib/adminService";

const SOLE_ADMIN_EMAIL = "phantrongquy23032005@gmail.com";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, pages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");

  // Plan modal state
  const [planModalUser, setPlanModalUser] = useState<AdminUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "studio">("free");
  const [planMonths, setPlanMonths] = useState<number>(1);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [statusModalUser, setStatusModalUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);
  const [detailModalUser, setDetailModalUser] = useState<AdminUser | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [newJobRole, setNewJobRole] = useState("");
  const [newBio, setNewBio] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Import form state
  const [importText, setImportText] = useState("");
  const [importSummary, setImportSummary] = useState<any>(null);

  const loadUsers = async (page = 1) => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminUsersApi({
      page,
      limit: pagination.limit,
      search,
      role,
      status,
      plan,
    });
    if (res.success && res.data) {
      setUsers(res.data);
      if (res.pagination) setPagination(res.pagination);
    } else {
      setError(res.message || "Không thể tải danh sách người dùng");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers(1);
  }, [role, status, plan]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(1);
  };

  // 1. Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setModalError("Vui lòng điền đầy đủ Tên và Email");
      return;
    }

    setActionBusy(true);
    setModalError(null);
    const res = await createAdminUserApi({
      name: newName.trim(),
      email: newEmail.trim(),
      username: newUsername.trim() || undefined,
      role: newRole,
      jobRole: newJobRole.trim(),
      bio: newBio.trim(),
    });

    if (res.success) {
      setCreateModalOpen(false);
      setNewName("");
      setNewEmail("");
      setNewUsername("");
      setNewRole("user");
      setNewJobRole("");
      setNewBio("");
      loadUsers(pagination.page);
    } else {
      setModalError(res.message || "Không thể tạo tài khoản");
    }
    setActionBusy(false);
  };


  // 2b. Update User Plan
  const handlePlanSubmit = async () => {
    if (!planModalUser) return;
    setActionBusy(true);
    const res = await updateUserPlanApi(planModalUser._id, {
      plan: selectedPlan,
      months: selectedPlan === "free" ? 0 : planMonths,
    });
    if (res.success) {
      setPlanModalUser(null);
      loadUsers(pagination.page);
    } else {
      alert("Lỗi: " + (res.message || "Không thể cập nhật gói cước"));
    }
    setActionBusy(false);
  };

  // 2. Ban / Unban User
  const handleStatusSubmit = async () => {
    if (!statusModalUser) return;
    setActionBusy(true);
    const nextStatus = statusModalUser.status === "active" ? "banned" : "active";
    const res = await updateUserStatusApi(statusModalUser._id, nextStatus, banReason);
    if (res.success) {
      setStatusModalUser(null);
      setBanReason("");
      loadUsers(pagination.page);
    } else {
      alert("Lỗi: " + res.message);
    }
    setActionBusy(false);
  };

  // 3. Update Role
  const handleRoleSubmit = async () => {
    if (!roleModalUser) return;
    if (roleModalUser.email === SOLE_ADMIN_EMAIL) {
      alert("Tài khoản Phan Trọng Quý là Quản trị viên cố định duy nhất của hệ thống, không thể thay đổi vai trò.");
      setRoleModalUser(null);
      return;
    }
    alert("Hệ thống chỉ duy nhất có 1 Quản trị viên cố định (Phan Trọng Quý). Không thể phân quyền Quản trị viên cho tài khoản khác.");
    setRoleModalUser(null);
  };

  // 4. Batch Import Users
  const handleImportSubmit = async () => {
    if (!importText.trim()) {
      setModalError("Vui lòng dán nội dung CSV danh sách người dùng");
      return;
    }

    setActionBusy(true);
    setModalError(null);
    setImportSummary(null);

    // Parse CSV lines: name,email,jobRole,bio
    const lines = importText.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsedUsers: Array<{ name: string; email: string; jobRole?: string; bio?: string }> = [];

    lines.forEach((line, idx) => {
      // Check if header row
      if (idx === 0 && line.toLowerCase().includes("email") && line.toLowerCase().includes("name")) {
        return;
      }
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts.length >= 2) {
        parsedUsers.push({
          name: parts[0],
          email: parts[1],
          jobRole: parts[2] || "",
          bio: parts[3] || "",
        });
      }
    });

    if (parsedUsers.length === 0) {
      setModalError("Không tìm thấy dòng dữ liệu người dùng hợp lệ. Định dạng: Tên, Email, Nghề nghiệp, Bio");
      setActionBusy(false);
      return;
    }

    const res = await importUsersApi(parsedUsers);
    if (res.success && res.summary) {
      setImportSummary(res.summary);
      loadUsers(1);
    } else {
      setModalError(res.message || "Quá trình import thất bại");
    }
    setActionBusy(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2 border border-white/10 bg-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
            <span className="text-[10px] tracking-widest text-slate-300 font-mono uppercase">
              PickMe3D Membership & RBAC
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-normal text-white tracking-wide"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            Quản Lý Tài Khoản Người Dùng
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Xem danh sách, tìm kiếm, phân quyền Quản trị viên, khóa/mở khóa tài khoản an toàn.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setImportModalOpen(true);
              setImportSummary(null);
              setModalError(null);
              setImportText("");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <span className="material-symbols-rounded text-base">upload_file</span>
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => {
              setCreateModalOpen(true);
              setModalError(null);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:opacity-95 text-white text-xs sm:text-sm font-bold tracking-wider shadow-[0_0_20px_rgba(229,43,43,0.35)] transition-all cursor-pointer"
          >
            <span className="material-symbols-rounded text-base">person_add</span>
            <span>Tạo Tài Khoản</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-[#0d131f] border border-white/[0.08] shadow-lg flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên, email hoặc username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#060911] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-colors border border-white/10 cursor-pointer"
          >
            Tìm
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Vai trò:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-[#060911] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/60"
            >
              <option value="all">Tất cả</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Trạng thái:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-[#060911] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/60"
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="banned">Bị khóa</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Gói cước:</span>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="bg-[#060911] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/60"
            >
              <option value="all">Tất cả gói</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="studio">Studio</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-[#0d131f] border border-white/[0.08] shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-mono">Đang tải danh sách tài khoản...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-400 text-sm">
            <span className="material-symbols-rounded text-3xl mb-1">error</span>
            <p>{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <span className="material-symbols-rounded text-3xl mb-2 text-slate-600">group_off</span>
            <p>Không tìm thấy người dùng nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.08] text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold">Người Dùng</th>
                  <th className="py-3 px-4 font-semibold">Tài Khoản</th>
                  <th className="py-3 px-4 font-semibold">Vai Trò</th>
                  <th className="py-3 px-4 font-semibold">Gói Dịch Vụ</th>
                  <th className="py-3 px-4 font-semibold">Trạng Thái</th>
                  <th className="py-3 px-4 font-semibold">Mẫu 3D</th>
                  <th className="py-3 px-4 font-semibold">Ngày Tạo</th>
                  <th className="py-3 px-4 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                    {/* User info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {u.picture ? (
                          <img
                            src={u.picture}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold flex items-center justify-center text-xs">
                            {u.name?.charAt(0) || "U"}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white text-sm">{u.name}</div>
                          <div className="text-slate-400 text-[11px]">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Username & Job */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-300">
                        {u.username ? `@${u.username}` : "—"}
                      </div>
                      <div className="text-slate-500 text-[11px]">{u.jobRole || "Chưa cập nhật"}</div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      {u.email?.toLowerCase().trim() === SOLE_ADMIN_EMAIL ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-gradient-to-r from-red-600/20 via-rose-500/20 to-amber-500/20 text-rose-300 border border-rose-500/40 shadow-sm">
                          <span className="material-symbols-rounded text-xs text-amber-400">shield_person</span>
                          Quản Trị Viên (Cố Định)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wider bg-white/5 text-slate-400 border border-white/10">
                          Người Dùng
                        </span>
                      )}
                    </td>

                    {/* Subscription Plan */}
                    <td className="py-3 px-4">
                      {u.plan === "studio" ? (
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-500/20 to-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                            Studio
                          </span>
                          {u.planExpiresAt && (
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              Hết hạn: {new Date(u.planExpiresAt).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                      ) : u.plan === "pro" ? (
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                            Pro
                          </span>
                          {u.planExpiresAt && (
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              Hết hạn: {new Date(u.planExpiresAt).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-400 border border-white/10">
                          Free
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                          u.status === "banned"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === "banned" ? "bg-rose-400" : "bg-emerald-400"
                          }`}
                        />
                        {u.status === "banned" ? "Đã khóa" : "Hoạt động"}
                      </span>
                    </td>

                    {/* Designs count */}
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {u.templatesCount || 0}
                    </td>

                    {/* Created date */}
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                      {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {(() => {
                        const isSoleAdmin = u.email?.toLowerCase().trim() === SOLE_ADMIN_EMAIL;
                        return (
                          <div className="inline-flex items-center gap-1.5">
                            {/* View Detail */}
                            <button
                              onClick={() => setDetailModalUser(u)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <span className="material-symbols-rounded text-base">visibility</span>
                            </button>

                            {/* Change Plan */}
                            <button
                              onClick={() => {
                                setPlanModalUser(u);
                                setSelectedPlan(u.plan || "free");
                                setPlanMonths(1);
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 hover:text-amber-300 border border-white/10 transition-colors cursor-pointer"
                              title="Cập nhật gói cước (Free / Pro / Studio)"
                            >
                              <span className="material-symbols-rounded text-base">workspace_premium</span>
                            </button>

                            {/* Change Role */}
                            {isSoleAdmin ? (
                              <button
                                disabled
                                className="p-1.5 rounded-lg bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed opacity-40"
                                title="Quản trị viên Phan Trọng Quý là tài khoản cố định duy nhất"
                              >
                                <span className="material-symbols-rounded text-base">manage_accounts</span>
                              </button>
                            ) : (
                              <button
                                disabled
                                className="p-1.5 rounded-lg bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed opacity-40"
                                title="Hệ thống chỉ có duy nhất 1 Quản trị viên: Phan Trọng Quý (Tài khoản fix cứng)"
                              >
                                <span className="material-symbols-rounded text-base">manage_accounts</span>
                              </button>
                            )}

                            {/* Ban / Unban */}
                            {isSoleAdmin ? (
                              <button
                                disabled
                                className="p-1.5 rounded-lg bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed opacity-40"
                                title="Quản trị viên Phan Trọng Quý là tài khoản cố định, không thể khóa"
                              >
                                <span className="material-symbols-rounded text-base">lock</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setStatusModalUser(u);
                                  setBanReason(u.bannedReason || "");
                                }}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  u.status === "banned"
                                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                    : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                                }`}
                                title={u.status === "banned" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                              >
                                <span className="material-symbols-rounded text-base">
                                  {u.status === "banned" ? "lock_open" : "lock"}
                                </span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="py-3 px-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 bg-white/[0.01]">
            <div>
              Trang <span className="font-semibold text-white">{pagination.page}</span> /{" "}
              {pagination.pages} (Tổng {pagination.total} người dùng)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadUsers(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors border border-white/10 cursor-pointer"
              >
                Trước
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadUsers(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors border border-white/10 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: CREATE USER ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0d131f] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(229,43,43,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-red-400">person_add</span>
                Thêm Người Dùng Mới
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500/60"
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500/60"
                  placeholder="name@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500/60"
                    placeholder="nguyenvana"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vai trò
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911]/60 border border-white/10 text-xs sm:text-sm text-slate-300 flex items-center justify-between">
                    <span>Người dùng (User)</span>
                    <span className="text-[10px] text-amber-400 font-medium">Mặc định</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Quản trị viên cố định duy nhất: Phan Trọng Quý
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nghề nghiệp / Chức vụ
                </label>
                <input
                  type="text"
                  value={newJobRole}
                  onChange={(e) => setNewJobRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500/60"
                  placeholder="3D Designer, Fashion Creator..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tiểu sử</label>
                <textarea
                  rows={2}
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#060911] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500/60"
                  placeholder="Mô tả ngắn về người dùng..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold shadow-[0_0_20px_rgba(229,43,43,0.35)] cursor-pointer"
                >
                  {actionBusy ? "Đang tạo..." : "Tạo Tài Khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {/* ── MODAL: UPDATE USER PLAN ── */}
      {planModalUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d131f] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/80 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-amber-400">workspace_premium</span>
              Cập Nhật Gói Cước
            </h3>
            <p className="text-xs text-neutral-400">
              Điều chỉnh gói dịch vụ của người dùng: <span className="font-semibold text-white">{planModalUser.name}</span> ({planModalUser.email}).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Chọn Gói Thuê Bao
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("free")}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      selectedPlan === "free"
                        ? "bg-white/10 border-white/30 text-white font-bold"
                        : "bg-[#060911] border-white/5 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">Free</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">Tiêu chuẩn</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("pro")}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      selectedPlan === "pro"
                        ? "bg-rose-500/15 border-rose-500/50 text-rose-300 font-bold shadow-sm"
                        : "bg-[#060911] border-white/5 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">Pro</div>
                    <div className="text-[10px] text-rose-400/80 mt-0.5">99k / tháng</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("studio")}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      selectedPlan === "studio"
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold shadow-sm"
                        : "bg-[#060911] border-white/5 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">Studio</div>
                    <div className="text-[10px] text-amber-400/80 mt-0.5">199k / tháng</div>
                  </button>
                </div>
              </div>

              {selectedPlan !== "free" && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Thời Hạn Gia Hạn (Tháng)
                  </label>
                  <select
                    value={planMonths}
                    onChange={(e) => setPlanMonths(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911] border border-white/10 text-xs text-white outline-none focus:border-red-500/60"
                  >
                    <option value={1}>1 tháng (+30 ngày)</option>
                    <option value={3}>3 tháng (+90 ngày)</option>
                    <option value={6}>6 tháng (+180 ngày)</option>
                    <option value={12}>12 tháng (+360 ngày)</option>
                  </select>
                </div>
              )}

              {planModalUser.planExpiresAt && (
                <div className="p-3 rounded-xl bg-[#060911] border border-white/5 text-[11px] text-neutral-400">
                  Thời hạn hiện tại: <span className="text-neutral-200">{new Date(planModalUser.planExpiresAt).toLocaleDateString("vi-VN")}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setPlanModalUser(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handlePlanSubmit}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:from-red-500 hover:via-rose-400 hover:to-amber-400 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-red-950/40 transition-all"
              >
                {actionBusy ? "Đang lưu..." : "Xác Nhận Cập Nhật"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BAN / UNBAN USER ── */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d131f] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/80">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span
                className={`material-symbols-rounded ${
                  statusModalUser.status === "active" ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {statusModalUser.status === "active" ? "block" : "lock_open"}
              </span>
              {statusModalUser.status === "active"
                ? `Khóa Tài Khoản: ${statusModalUser.name}`
                : `Mở Khóa Tài Khoản: ${statusModalUser.name}`}
            </h3>

            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              {statusModalUser.status === "active"
                ? "Người dùng này sẽ không thể đăng nhập hoặc thực hiện bất kỳ thao tác nào. Tất cả mẫu thiết kế và bình luận của họ vẫn được giữ nguyên vẹn trên hệ thống."
                : "Người dùng này sẽ được khôi phục quyền đăng nhập và tiếp tục sử dụng nền tảng PickMe3D."}
            </p>

            {statusModalUser.status === "active" && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Lý do khóa tài khoản:
                </label>
                <textarea
                  rows={3}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Ví dụ: Đăng tải nội dung vi phạm bản quyền hoặc spam..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500/60 placeholder:text-neutral-600"
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStatusModalUser(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleStatusSubmit}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
                  statusModalUser.status === "active"
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-950/40"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40"
                }`}
              >
                {actionBusy
                  ? "Đang lưu..."
                  : statusModalUser.status === "active"
                  ? "Xác Nhận Khóa"
                  : "Xác Nhận Mở Khóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CHANGE ROLE ── */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d131f] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/80">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-rounded text-rose-400">shield_person</span>
              Vai Trò: {roleModalUser.name}
            </h3>

            <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed space-y-2">
              {roleModalUser.email === SOLE_ADMIN_EMAIL ? (
                <>
                  <div className="font-semibold text-amber-200 flex items-center gap-1.5 text-sm">
                    <span className="material-symbols-rounded text-base">verified_user</span>
                    Quản Trị Viên Cố Định Duy Nhất
                  </div>
                  <p className="text-slate-300">
                    Tài khoản <strong>{roleModalUser.email}</strong> (Phan Trọng Quý) là Quản trị viên cố định duy nhất của nền tảng PickMe3D. Vai trò này được bảo vệ cố định và không thể thay đổi hay hạ cấp.
                  </p>
                </>
              ) : (
                <>
                  <div className="font-semibold text-amber-200 flex items-center gap-1.5 text-sm">
                    <span className="material-symbols-rounded text-base">lock</span>
                    Chính Sách Quản Trị Viên Cố Định
                  </div>
                  <p className="text-slate-300">
                    Hệ thống chỉ duy nhất có 1 Quản trị viên cố định là <strong>Phan Trọng Quý</strong> ({SOLE_ADMIN_EMAIL}). Toàn bộ tài khoản khác được chỉ định cố định vai trò Người dùng (User) và không thể nâng cấp.
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold transition-colors"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: USER DETAILS ── */}
      {detailModalUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0d131f] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-rose-400">badge</span>
                Thông Tin Chi Tiết Tài Khoản
              </h3>
              <button
                onClick={() => setDetailModalUser(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#060911] border border-white/10">
                {detailModalUser.picture ? (
                  <img
                    src={detailModalUser.picture}
                    alt={detailModalUser.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-white/10 font-bold text-sm flex items-center justify-center text-rose-300">
                    {detailModalUser.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-white">{detailModalUser.name}</div>
                  <div className="text-neutral-400">{detailModalUser.email}</div>
                  {detailModalUser.username && (
                    <div className="text-rose-400 font-mono text-[11px]">
                      @{detailModalUser.username}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#060911] border border-white/10">
                  <span className="text-neutral-500 block mb-1">Vai trò</span>
                  <span className={`font-semibold ${detailModalUser.email === SOLE_ADMIN_EMAIL ? "text-rose-400" : "text-white"}`}>
                    {detailModalUser.email === SOLE_ADMIN_EMAIL ? "Quản Trị Viên (Cố Định)" : "Người Dùng"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#060911] border border-white/10">
                  <span className="text-neutral-500 block mb-1">Trạng thái</span>
                  <span
                    className={`font-semibold ${
                      detailModalUser.status === "banned" ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {detailModalUser.status === "banned" ? "Đã khóa" : "Hoạt động"}
                  </span>
                </div>
              </div>

              {detailModalUser.status === "banned" && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                  <span className="font-semibold block mb-0.5">Lý do khóa:</span>
                  {detailModalUser.bannedReason || "Không có ghi chú"}
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#060911] border border-white/10">
                <span className="text-neutral-500 block mb-1">Nghề nghiệp</span>
                <span className="text-white">{detailModalUser.jobRole || "Chưa cập nhật"}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#060911] border border-white/10">
                <span className="text-neutral-500 block mb-1">Tiểu sử</span>
                <span className="text-white">{detailModalUser.bio || "Chưa có tiểu sử"}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-neutral-400">
                <div className="p-3 rounded-xl bg-[#060911] border border-white/10">
                  <span className="text-neutral-500 block mb-0.5">Số mẫu thiết kế</span>
                  <span className="font-semibold text-white">{detailModalUser.templatesCount || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#060911] border border-white/10">
                  <span className="text-neutral-500 block mb-0.5">Ngày tham gia</span>
                  <span className="font-semibold text-white">
                    {new Date(detailModalUser.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setDetailModalUser(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BATCH CSV IMPORT ── */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0d131f] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-rose-400">upload_file</span>
                Import Danh Sách Người Dùng (CSV)
              </h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
              Dán dữ liệu CSV theo định dạng:{" "}
              <code className="text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded font-mono border border-rose-500/20">
                Tên, Email, Nghề nghiệp, Tiểu sử
              </code>
              . <br />
              <span className="text-amber-400">
                Quy tắc bảo mật: Mọi tài khoản import luôn mặc định là vai trò 'user', không thể tự ý cấp quyền Admin.
              </span>
            </p>

            {modalError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            {importSummary && (
              <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-base">check_circle</span>
                  Kết quả: Đã import thành công {importSummary.imported}/{importSummary.total} tài khoản!
                </div>
                {importSummary.errors?.length > 0 && (
                  <div className="text-amber-400 space-y-1 mt-2">
                    <span className="font-semibold">Hàng bị bỏ qua ({importSummary.errors.length}):</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-neutral-300">
                      {importSummary.errors.slice(0, 5).map((err: any, idx: number) => (
                        <li key={idx}>
                          Dòng {err.row}: {err.email ? `[${err.email}] ` : ""}{err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`Nguyễn Văn A, a@example.com, Fashion Designer, Yêu thích 3D\nTrần Thị B, b@example.com, 3D Artist, Chuyên gia trang phục`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#060911] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500/60 placeholder:text-neutral-600 mb-4"
            />

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() =>
                  setImportText(
                    `Nguyễn Văn A, a@example.com, Fashion Designer, Yêu thích 3D\nTrần Thị B, b@example.com, 3D Artist, Chuyên gia trang phục`
                  )
                }
                className="text-xs text-rose-400 hover:text-rose-300 font-medium"
              >
                Điền mẫu ví dụ
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-semibold transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleImportSubmit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:from-red-500 hover:via-rose-400 hover:to-amber-400 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-red-950/40 transition-all"
                >
                  {actionBusy ? "Đang xử lý..." : "Tiến Hành Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
