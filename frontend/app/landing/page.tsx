"use client";

import { useRouter } from "next/navigation";
import LandingPage from "@/components/LandingPage";

export default function LandingPageRoute() {
  const router = useRouter();

  const handleLoginSuccess = (token: string, user: any) => {
    localStorage.setItem("pickme3d_token", token);
    localStorage.setItem("pickme3d_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    localStorage.removeItem("pickme3d_token");
    localStorage.removeItem("pickme3d_user");
    router.push("/");
  };

  return (
    <LandingPage
      onLoginSuccess={handleLoginSuccess}
      onStartNow={() => router.push("/editor/")}
      onLogout={handleLogout}
    />
  );
}
