"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = localStorage.getItem("pickme3d_user");
    if (!u) {
      router.push("/");
    } else {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      setNewName(parsedUser.name);
      setLoading(false);
    }
  }, [router]);

  const handleSaveName = async () => {
    if (!newName.trim() || newName === user.name) {
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const token = localStorage.getItem("pickme3d_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem("pickme3d_user", JSON.stringify(data.data));
        setIsEditingName(false);
      } else {
        alert(data.message || "Lỗi khi cập nhật tên");
      }
    } catch (error) {
      alert("Lỗi kết nối");
    } finally {
      setSavingName(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (e.g., max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Kích thước ảnh quá lớn, vui lòng chọn ảnh dưới 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string;
      if (!base64Image) return;

      try {
        const token = localStorage.getItem("pickme3d_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ picture: base64Image }),
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
          localStorage.setItem("pickme3d_user", JSON.stringify(data.data));
        } else {
          alert(data.message || "Lỗi khi cập nhật ảnh");
        }
      } catch (error) {
        alert("Lỗi kết nối");
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleChangePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePicture = async () => {
    if (!confirm("Bạn có chắc muốn xoá ảnh đại diện?")) return;
    try {
      const token = localStorage.getItem("pickme3d_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ picture: "" }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem("pickme3d_user", JSON.stringify(data.data));
      } else {
        alert(data.message || "Lỗi khi xoá ảnh");
      }
    } catch (error) {
      alert("Lỗi kết nối");
    }
  };

  const handleJobRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    try {
      const token = localStorage.getItem("pickme3d_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobRole: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem("pickme3d_user", JSON.stringify(data.data));
      } else {
        alert(data.message || "Lỗi khi cập nhật vai trò");
      }
    } catch (error) {
      alert("Lỗi kết nối");
    }
  };

  if (loading) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "Roboto, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 260,
          backgroundColor: "white",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          padding: "16px 12px",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div
          onClick={() => router.push("/")}
          style={{
            cursor: "pointer",
            marginBottom: 24,
            padding: "0 12px",
            fontSize: 24,
            fontWeight: 800,
            color: "#6b21a8", // purple-ish color for PickMe3D
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          PickMe3D
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <div
            onClick={() => router.push("/")}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#4b5563",
              fontSize: 15,
              fontWeight: 500,
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 22 }}>home</span>
            Trang chủ
          </div>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#4b5563",
              fontSize: 15,
              fontWeight: 500,
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 22 }}>folder</span>
            Dự án của bạn
          </div>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              backgroundColor: "#f3e8ff", // Light purple active state
              color: "#6b21a8",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 22 }}>person</span>
            Hồ sơ của bạn
          </div>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#4b5563",
              fontSize: 15,
              fontWeight: 500,
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 22 }}>workspace_premium</span>
            Gói và mức giá
          </div>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#4b5563",
              fontSize: 15,
              fontWeight: 500,
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 22 }}>credit_card</span>
            Thanh toán
          </div>
        </nav>

        {/* Sidebar Avatar Bottom */}
        <div style={{ position: "relative" }}>
          <div 
            onClick={() => {
              const menu = document.getElementById("settings-profile-menu");
              if (menu) {
                menu.style.display = menu.style.display === "none" ? "block" : "none";
              }
            }}
            style={{ marginTop: "auto", padding: "12px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderRadius: 8, transition: "background 0.2s" }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {user.picture ? (
              <img src={user.picture} alt="Avatar" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-rounded" style={{ color: "#9ca3af" }}>person</span>
              </div>
            )}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {user.name}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                Cá nhân
              </div>
            </div>
          </div>

          {/* Popup Menu */}
          <div
            id="settings-profile-menu"
            style={{
              display: "none",
              position: "absolute",
              bottom: "100%",
              left: 12,
              marginBottom: 8,
              width: 236,
              backgroundColor: "white",
              borderRadius: 16,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
              padding: 6,
              zIndex: 100,
            }}
          >
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{user.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("pickme3d_token");
                localStorage.removeItem("pickme3d_user");
                window.location.href = "/";
              }}
              style={{
                width: "100%",
                height: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: "none",
                background: "transparent",
                color: "#ef4444", // Red color for logout
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>logout</span>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Gradient Header */}
        <div
          style={{
            height: 180,
            background: "linear-gradient(to bottom right, #3b82f6, #a855f7, #2dd4bf)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "white", margin: 0, textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>Hồ sơ của bạn</h1>
        </div>

        {/* Settings Container */}
        <div style={{ maxWidth: 800, margin: "-40px auto 40px", position: "relative", zIndex: 10, padding: "0 20px" }}>
          
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1f2937", marginBottom: 16 }}>Tài khoản của bạn</h2>
          
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
              overflow: "hidden",
            }}
          >
            {/* Avatar Section */}
            <div style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {user.picture ? (
                  <img src={user.picture} alt="Avatar" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 40, color: "#9ca3af" }}>person</span>
                  </div>
                )}
                <span style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>Ảnh hồ sơ</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <button
                  onClick={handleRemovePicture}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#4b5563",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "8px 12px",
                  }}
                >
                  Xóa ảnh
                </button>
                <button
                  onClick={handleChangePictureClick}
                  style={{
                    background: "white",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    color: "#111827",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "8px 16px",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "white")}
                >
                  Thay đổi ảnh
                </button>
              </div>
            </div>

            {/* Name Section */}
            <div style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Tên</div>
                {isEditingName ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      width: "100%",
                      maxWidth: 300,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #8b5cf6",
                      outline: "none",
                      fontSize: 14,
                      color: "#374151",
                    }}
                    autoFocus
                  />
                ) : (
                  <div style={{ fontSize: 14, color: "#4b5563" }}>{user.name}</div>
                )}
              </div>
              <div>
                {isEditingName ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { setIsEditingName(false); setNewName(user.name); }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#4b5563",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: "8px 12px",
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      style={{
                        background: "#8b5cf6",
                        border: "none",
                        borderRadius: 6,
                        color: "white",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: savingName ? "wait" : "pointer",
                        padding: "8px 16px",
                      }}
                    >
                      {savingName ? "Đang lưu..." : "Lưu"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingName(true)}
                    style={{
                      background: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      color: "#111827",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "8px 16px",
                    }}
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>
            </div>

            {/* Email Section */}
            <div style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Địa chỉ email</div>
                <div style={{ fontSize: 14, color: "#4b5563" }}>{user.email}</div>
              </div>
              <button
                disabled
                style={{
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  color: "#9ca3af",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "not-allowed",
                  padding: "8px 16px",
                }}
                title="Đăng nhập qua Google không thể đổi email"
              >
                Chỉnh sửa
              </button>
            </div>

            {/* Job Usage Section */}
            <div style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Bạn sẽ sử dụng PickMe3D cho công việc gì?</div>
              </div>
              <select
                style={{
                  background: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  color: "#4b5563",
                  fontSize: 14,
                  padding: "8px 32px 8px 16px",
                  cursor: "pointer",
                  appearance: "none",
                  minWidth: 200,
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23111827%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px top 50%",
                  backgroundSize: "10px auto",
                }}
                value={user.jobRole || ""}
                onChange={handleJobRoleChange}
              >
                <option value="" disabled>Chọn một vai trò</option>
                <option value="Học sinh / Sinh viên">Học sinh / Sinh viên</option>
                <option value="Giáo viên">Giáo viên</option>
                <option value="Doanh nghiệp nhỏ">Doanh nghiệp nhỏ</option>
                <option value="Cá nhân">Cá nhân</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
