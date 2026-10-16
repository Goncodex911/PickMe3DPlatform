"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

export default function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "532936713942-qmhidnnhkrvhv62rindb0nsq946cavia.apps.googleusercontent.com";
  
  return (
    <GoogleOAuthProvider clientId={clientId} locale="en">
      {children}
    </GoogleOAuthProvider>
  );
}
