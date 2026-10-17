import type { CredentialResponse } from "@react-oauth/google";

type Handler = (response: CredentialResponse) => void;
export interface GoogleIdentity {
  initialize: (options: { client_id: string; callback: Handler }) => void;
  renderButton: (container: HTMLElement, options: {
    theme: "outline"; size: "large"; text: "continue_with";
    shape: "rectangular"; width: number; locale: string;
  }) => void;
}

export function createGoogleSignInManager() {
  let identity: GoogleIdentity | undefined;
  let client: string | undefined;
  let active: Handler | undefined;

  return {
    connect(sdk: GoogleIdentity, clientId: string, handler: Handler) {
      if (identity !== sdk || client !== clientId) {
        sdk.initialize({ client_id: clientId, callback: (response) => active?.(response) });
        identity = sdk;
        client = clientId;
      }
      active = handler;
      return () => { if (active === handler) active = undefined; };
    },
  };
}
