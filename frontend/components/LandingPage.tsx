"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";

export default function LandingPage({ onLoginSuccess }: { onLoginSuccess: (token: string, user: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError("Đăng nhập thất bại: " + data.message);
      }
    } catch (err) {
      console.error(err);
      setError("Đã xảy ra lỗi khi kết nối với máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-teal-400 text-white font-sans">
      {/* Decorative floating elements */}
      <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl shadow-xl transform -rotate-12 animate-pulse"></div>
      <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-white/20 backdrop-blur-lg rounded-full shadow-2xl transform translate-x-10 animate-bounce"></div>
      <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-yellow-400/50 backdrop-blur-sm rounded-lg shadow-lg transform rotate-45"></div>

      <div className="z-10 text-center max-w-2xl px-6">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight drop-shadow-md">
          Chào mừng bạn quay trở lại
        </h1>
        <p className="text-lg md:text-xl font-medium mb-10 opacity-90 drop-shadow-sm">
          Đăng nhập để tiếp tục thiết kế với PickMe3D
        </p>

        <div className="bg-white text-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl w-full max-w-md mx-auto flex flex-col items-center">
          <div className="w-24 h-24 bg-gradient-to-tr from-purple-400 to-blue-500 rounded-full mb-6 shadow-inner flex items-center justify-center text-white text-4xl">
            <span className="material-symbols-rounded" style={{ fontSize: "48px" }}>brush</span>
          </div>
          
          <h2 className="text-2xl font-bold mb-6 text-center">Đăng nhập tài khoản</h2>
          
          {error && (
            <div className="mb-4 text-red-500 text-sm font-medium text-center w-full">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-12 w-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="w-full flex justify-center hover:scale-105 transition-transform">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => setError("Đăng nhập thất bại")}
                theme="outline"
                size="large"
                shape="pill"
                text="continue_with"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
