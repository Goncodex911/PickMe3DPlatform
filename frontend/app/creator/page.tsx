"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CreatorProfileClient from "./[username]/CreatorProfileClient";

// Query routing keeps newly registered creators reachable on static hosting.
export default function CreatorPage() {
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    setUsername(new URLSearchParams(window.location.search).get("username") || "");
  }, []);
  if (username === null) return <p role="status" className="p-8">Đang tải hồ sơ…</p>;
  if (!username) return <main className="p-8"><h1>Chọn Creator từ một thiết kế</h1><Link href="/templates/">Khám phá mẫu thiết kế</Link></main>;
  return <CreatorProfileClient username={username} />;
}
