"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginPage from "@/components/LoginPage";
import LandingPage from "@/components/LandingPage";

export default function Page() {
  const router = useRouter();
  // Auth state: null while checking localStorage, boolean afterwards
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("pickme3d_token");
    const storedUser = localStorage.getItem("pickme3d_user");

    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch {}
      }
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

  const handleLoginSuccess = (token: string, user: any) => {
    localStorage.setItem("pickme3d_token", token);
    localStorage.setItem("pickme3d_user", JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("pickme3d_token");
    localStorage.removeItem("pickme3d_user");
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Prevent flash while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="w-full h-screen bg-[#090d16] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-red-500 border-r-white" />
      </div>
    );
  }

  // First time visitor -> show LoginPage first
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Once logged in -> show LandingPage with START NOW buttons
  return (
    <LandingPage
      user={currentUser}
      onStartNow={() => router.push("/editor/")}
      onLogout={handleLogout}
    />
  );
}
