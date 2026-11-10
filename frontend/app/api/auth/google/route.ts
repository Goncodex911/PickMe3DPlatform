import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Proxy request to backend server-side (bypasses browser CORS & port blocking)
    const defaultBackend = process.env.NEXT_PUBLIC_API_URL 
      ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/auth/google`
      : "http://localhost:5001/api/auth/google";
    const backendUrl = process.env.BACKEND_INTERNAL_URL || defaultBackend;
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("Next.js Auth Proxy Error:", err);
    return NextResponse.json(
      { success: false, message: "Không thể kết nối đến máy chủ xác thực: " + err.message },
      { status: 502 }
    );
  }
}
