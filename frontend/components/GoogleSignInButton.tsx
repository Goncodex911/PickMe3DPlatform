"use client";

import { useEffect, useRef } from "react";
import { useGoogleOAuth, type CredentialResponse } from "@react-oauth/google";
import { createGoogleSignInManager, type GoogleIdentity } from "@/lib/googleSignIn";

export default function GoogleSignInButton({ onSuccess, onError }: {
  onSuccess: (response: CredentialResponse) => void;
  onError: () => void;
}) {
  const { clientId, scriptLoadedSuccessfully } = useGoogleOAuth();
  const container = useRef<HTMLDivElement>(null);
  const success = useRef(onSuccess);
  const error = useRef(onError);
  useEffect(() => { success.current = onSuccess; error.current = onError; });

  useEffect(() => {
    if (!scriptLoadedSuccessfully || !container.current) return;
    const host = window as typeof window & {
      google?: { accounts: { id: GoogleIdentity } };
      __pickmeGoogleSignIn?: ReturnType<typeof createGoogleSignInManager>;
    };
    const sdk = host.google?.accounts.id;
    if (!sdk) return;
    // Keep initialization across route changes, Strict Mode and Fast Refresh.
    const manager = host.__pickmeGoogleSignIn ??= createGoogleSignInManager();
    const disconnect = manager.connect(sdk, clientId, (response) => {
      if (response.credential) success.current(response);
      else error.current();
    });
    const element = container.current;
    sdk.renderButton(element, {
      theme: "outline", size: "large", text: "continue_with",
      shape: "rectangular", width: 290, locale: "en",
    });
    return () => { disconnect(); element.replaceChildren(); };
  }, [clientId, scriptLoadedSuccessfully]);

  return <div ref={container} style={{ minHeight: 40 }} />;
}
