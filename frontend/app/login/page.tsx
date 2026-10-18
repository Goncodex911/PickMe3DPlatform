"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LoginPage from "@/components/LoginPage";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const handleLoginSuccess = (token: string, user: any) => {
    localStorage.setItem("pickme3d_token", token);
    localStorage.setItem("pickme3d_user", JSON.stringify(user));
    router.push(redirectTo);
  };

  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
}

export default function LoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
