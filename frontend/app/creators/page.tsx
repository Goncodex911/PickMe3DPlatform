"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CreatorProfileClient from "../creator/[username]/CreatorProfileClient";

/** Query based entry point for hosts that cannot serve ungenerated dynamic paths. */
export default function CreatorsPage() {
  const [profileRef, setProfileRef] = useState<{ id?: string; username?: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProfileRef({
      id: params.get("id") || undefined,
      username: params.get("username") || undefined,
    });
  }, []);

  if (!profileRef) return <p role="status" className="p-8 text-slate-300">Đang tải hồ sơ…</p>;
  if (!profileRef.id && !profileRef.username) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-white">
        <h1 className="text-2xl font-semibold">Hồ sơ Creator</h1>
        <p className="mt-2 text-slate-400">Mở hồ sơ từ tên hoặc ảnh đại diện của creator trên một mẫu thiết kế.</p>
        <Link href="/templates/" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Khám phá mẫu thiết kế
        </Link>
      </main>
    );
  }

  return profileRef.id
    ? <CreatorProfileClient userId={profileRef.id} />
    : <CreatorProfileClient username={profileRef.username} />;
}
