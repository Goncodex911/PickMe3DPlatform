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
    setActionBusy(true);
    const nextRole = roleModalUser.role === "admin" ? "user" : "admin";
    const res = await updateUserRoleApi(roleModalUser._id, nextRole);
    if (res.success) {
      setRoleModalUser(null);
      loadUsers(pagination.page);
    } else {
      alert("Lỗi: " + res.message);
    }
    setActionBusy(false);
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Quản Lý Tài Khoản Người Dùng
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
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
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 text-xs sm:text-sm font-semibold transition-all"
          >
            <span className="material-symbols-rounded text-lg">upload_file</span>
            Import CSV
          </button>

          <button
            onClick={() => {
              setCreateModalOpen(true);
              setModalError(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
          >
            <span className="material-symbols-rounded text-lg">person_add</span>
            Tạo Tài Khoản
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-[#141824] border border-neutral-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên, email hoặc username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1b2030] border border-neutral-700/60 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors border border-neutral-700/50"
          >
            Tìm
          </button>
        </form>

        <div className="flex items-center gap-2.5">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Vai trò:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-[#1b2030] border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Trạng thái:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-[#1b2030] border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="banned">Bị khóa</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Gói cước:</span>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="bg-[#1b2030] border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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
      <div className="bg-[#141824] border border-neutral-800/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 text-sm">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
            Đang tải danh sách người dùng...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-sm">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-sm">
            Không tìm thấy người dùng nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#191f30] text-neutral-400 uppercase font-semibold tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="py-3.5 px-4">Người dùng</th>
                  <th className="py-3.5 px-4">Username / Nghề</th>
                  <th className="py-3.5 px-4">Vai trò</th>
                  <th className="py-3.5 px-4">Gói cước</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Thiết kế</th>
                  <th className="py-3.5 px-4">Ngày tạo</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-[#191e2e]/50 transition-colors">
                    {/* User info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {u.picture ? (
                          <img
                            src={u.picture}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover border border-neutral-700"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-neutral-800 text-neutral-300 font-bold flex items-center justify-center text-xs">
                            {u.name?.charAt(0) || "U"}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white text-sm">{u.name}</div>
                          <div className="text-neutral-400 text-[11px]">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Username & Job */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-neutral-300">
                        {u.username ? `@${u.username}` : "—"}
                      </div>
                      <div className="text-neutral-500 text-[11px]">{u.jobRole || "Chưa cập nhật"}</div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
                          u.role === "admin"
                            ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                            : "bg-neutral-800 text-neutral-300 border border-neutral-700/40"
                        }`}
                      >
                        {u.role === "admin" ? "Quản trị viên" : "Người dùng"}
                      </span>
                    </td>

                    {/* Subscription Plan */}
                    <td className="py-3 px-4">
                      {u.plan === "studio" ? (
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                            Studio
                          </span>
                          {u.planExpiresAt && (
                            <div className="text-[10px] text-neutral-400 mt-0.5">
                              Hết hạn: {new Date(u.planExpiresAt).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                      ) : u.plan === "pro" ? (
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                            Pro
                          </span>
                          {u.planExpiresAt && (
                            <div className="text-[10px] text-neutral-400 mt-0.5">
                              Hết hạn: {new Date(u.planExpiresAt).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                          Free
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
                          u.status === "banned"
                            ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === "banned" ? "bg-red-400" : "bg-emerald-400"
                          }`}
                        />
                        {u.status === "banned" ? "Đã khóa" : "Hoạt động"}
                      </span>
                    </td>

                    {/* Designs count */}
                    <td className="py-3 px-4 font-semibold text-neutral-200">
                      {u.templatesCount || 0}
                    </td>

                    {/* Created date */}
                    <td className="py-3 px-4 text-neutral-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* View Detail */}
                        <button
                          onClick={() => setDetailModalUser(u)}
                          className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
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
                          className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 transition-colors"
                          title="Cập nhật gói cước (Free / Pro / Studio)"
                        >
                          <span className="material-symbols-rounded text-base">workspace_premium</span>
                        </button>

                        {/* Change Role */}
                        <button
                          onClick={() => setRoleModalUser(u)}
                          className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-purple-400 hover:text-purple-300 transition-colors"
                          title="Thay đổi vai trò"
                        >
                          <span className="material-symbols-rounded text-base">manage_accounts</span>
                        </button>

                        {/* Ban / Unban */}
                        <button
                          onClick={() => {
                            setStatusModalUser(u);
                            setBanReason(u.bannedReason || "");
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.status === "banned"
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                          }`}
                          title={u.status === "banned" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                        >
                          <span className="material-symbols-rounded text-base">
                            {u.status === "banned" ? "lock_open" : "lock"}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="py-3 px-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 bg-[#161a28]">
            <div>
              Trang <span className="font-semibold text-white">{pagination.page}</span> /{" "}
              {pagination.pages} (Tổng {pagination.total} người dùng)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadUsers(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
              >
                Trước
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadUsers(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: CREATE USER ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#161b29] border border-neutral-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-indigo-400">person_add</span>
                Thêm Người Dùng Mới
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b2030] border border-neutral-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b2030] border border-neutral-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="name@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b2030] border border-neutral-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="nguyenvana"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Vai trò
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b2030] border border-neutral-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="user">User (Người dùng)</option>
                    <option value="admin">Admin (Quản trị viên)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nghề nghiệp / Chức vụ
                </label>
                <input
                  type="text"
                  value={newJobRole}
                  onChange={(e) => setNewJobRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b2030] border border-neutral-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="3D Designer, Fashion Creator..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Tiểu sử</label>
                <textarea
                  rows={2}
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1b2030] border border-neutral-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Mô tả ngắn về người dùng..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161b29] border border-neutral-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-amber-400">workspace_premium</span>
              Cập Nhật Gói Cước
            </h3>
            <p className="text-xs text-neutral-400">
              Điều chỉnh gói dịch vụ của người dùng: <span className="font-semibold text-white">{planModalUser.name}</span> ({planModalUser.email}).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Chọn Gói Thuê Bao
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("free")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedPlan === "free"
                        ? "bg-slate-500/20 border-slate-400 text-white font-bold"
                        : "bg-[#111420] border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">Free</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">Tiêu chuẩn</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("pro")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedPlan === "pro"
                        ? "bg-indigo-500/20 border-indigo-400 text-indigo-300 font-bold shadow-sm"
                        : "bg-[#111420] border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">Pro</div>
                    <div className="text-[10px] text-indigo-400/80 mt-0.5">99k / tháng</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("studio")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedPlan === "studio"
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-sm"
                        : "bg-[#111420] border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">Studio</div>
                    <div className="text-[10px] text-amber-400/80 mt-0.5">199k / tháng</div>
                  </button>
                </div>
              </div>

              {selectedPlan !== "free" && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Thời Hạn Gia Hạn (Tháng)
                  </label>
                  <select
                    value={planMonths}
                    onChange={(e) => setPlanMonths(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b2030] border border-neutral-700 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value={1}>1 tháng (+30 ngày)</option>
                    <option value={3}>3 tháng (+90 ngày)</option>
                    <option value={6}>6 tháng (+180 ngày)</option>
                    <option value={12}>12 tháng (+360 ngày)</option>
                  </select>
                </div>
              )}

              {planModalUser.planExpiresAt && (
                <div className="p-3 rounded-xl bg-[#111420] border border-neutral-800 text-[11px] text-neutral-400">
                  Thời hạn hiện tại: <span className="text-neutral-200">{new Date(planModalUser.planExpiresAt).toLocaleDateString("vi-VN")}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setPlanModalUser(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handlePlanSubmit}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
              >
                {actionBusy ? "Đang lưu..." : "Xác Nhận Cập Nhật"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BAN / UNBAN USER ── */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161b29] border border-neutral-700 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span
                className={`material-symbols-rounded ${
                  statusModalUser.status === "active" ? "text-red-400" : "text-emerald-400"
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
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Lý do khóa tài khoản:
                </label>
                <textarea
                  rows={3}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Ví dụ: Đăng tải nội dung vi phạm bản quyền hoặc spam..."
                  className="w-full px-3 py-2 rounded-xl bg-[#1b2030] border border-neutral-700 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStatusModalUser(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleStatusSubmit}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-md ${
                  statusModalUser.status === "active"
                    ? "bg-red-600 hover:bg-red-500 shadow-red-600/30"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161b29] border border-neutral-700 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-rounded text-purple-400">shield_person</span>
              Thay Đổi Vai Trò: {roleModalUser.name}
            </h3>

            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Bạn đang chuyển đổi vai trò của người dùng từ{" "}
              <span className="font-semibold text-white">{roleModalUser.role}</span> sang{" "}
              <span className="font-semibold text-purple-400">
                {roleModalUser.role === "admin" ? "user (Người dùng thường)" : "admin (Quản trị viên)"}
              </span>
              .
            </p>

            {roleModalUser.role === "admin" && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                ⚠️ Lưu ý: Hệ thống được bảo vệ và sẽ từ chối nếu đây là Quản trị viên cuối cùng.
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleRoleSubmit}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30"
              >
                {actionBusy ? "Đang xử lý..." : "Xác Nhận Thay Đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: USER DETAILS ── */}
      {detailModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#161b29] border border-neutral-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-indigo-400">badge</span>
                Thông Tin Chi Tiết Tài Khoản
              </h3>
              <button
                onClick={() => setDetailModalUser(null)}
                className="text-neutral-400 hover:text-white"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#1b2030] border border-neutral-700/60">
                {detailModalUser.picture ? (
                  <img
                    src={detailModalUser.picture}
                    alt={detailModalUser.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neutral-700 font-bold text-sm flex items-center justify-center text-white">
                    {detailModalUser.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-white">{detailModalUser.name}</div>
                  <div className="text-neutral-400">{detailModalUser.email}</div>
                  {detailModalUser.username && (
                    <div className="text-indigo-400 font-mono text-[11px]">
                      @{detailModalUser.username}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#1b2030] border border-neutral-700/60">
                  <span className="text-neutral-500 block mb-1">Vai trò</span>
                  <span className="font-semibold text-white capitalize">{detailModalUser.role}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#1b2030] border border-neutral-700/60">
                  <span className="text-neutral-500 block mb-1">Trạng thái</span>
                  <span
                    className={`font-semibold ${
                      detailModalUser.status === "banned" ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {detailModalUser.status === "banned" ? "Đã khóa" : "Hoạt động"}
                  </span>
                </div>
              </div>

              {detailModalUser.status === "banned" && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
                  <span className="font-semibold block mb-0.5">Lý do khóa:</span>
                  {detailModalUser.bannedReason || "Không có ghi chú"}
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#1b2030] border border-neutral-700/60">
                <span className="text-neutral-500 block mb-1">Nghề nghiệp</span>
                <span className="text-white">{detailModalUser.jobRole || "Chưa cập nhật"}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#1b2030] border border-neutral-700/60">
                <span className="text-neutral-500 block mb-1">Tiểu sử</span>
                <span className="text-white">{detailModalUser.bio || "Chưa có tiểu sử"}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-neutral-400">
                <div>
                  <span className="text-neutral-500 block">Số mẫu thiết kế:</span>
                  <span className="font-semibold text-white">{detailModalUser.templatesCount || 0}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Ngày tham gia:</span>
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
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BATCH CSV IMPORT ── */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#161b29] border border-neutral-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-indigo-400">upload_file</span>
                Import Danh Sách Người Dùng (CSV)
              </h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
              Dán dữ liệu CSV theo định dạng:{" "}
              <code className="text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono">
                Tên, Email, Nghề nghiệp, Tiểu sử
              </code>
              . <br />
              <span className="text-amber-400">
                Quy tắc bảo mật: Mọi tài khoản import luôn mặc định là vai trò 'user', không thể tự ý cấp quyền Admin.
              </span>
            </p>

            {modalError && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b2030] border border-neutral-700 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 mb-4"
            />

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() =>
                  setImportText(
                    `Nguyễn Văn A, a@example.com, Fashion Designer, Yêu thích 3D\nTrần Thị B, b@example.com, 3D Artist, Chuyên gia trang phục`
                  )
                }
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Điền mẫu ví dụ
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleImportSubmit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
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
