"use client";

import { useRouter } from "next/navigation";
import LoginPage from "@/components/LoginPage";

export default function LoginRoute() {
  const router = useRouter();

  const handleLoginSuccess = (token: string, user: any) => {
    localStorage.setItem("pickme3d_token", token);
    localStorage.setItem("pickme3d_user", JSON.stringify(user));
    router.push("/editor/");
  };

  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
}
