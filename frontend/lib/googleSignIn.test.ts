import { describe, expect, it, vi } from "vitest";
import { createGoogleSignInManager, type GoogleIdentity } from "./googleSignIn";

describe("Google sign-in lifecycle", () => {
  it("initializes once across remounts and delivers credentials only to the current page", () => {
    const sdk: GoogleIdentity = { initialize: vi.fn(), renderButton: vi.fn() };
    const manager = createGoogleSignInManager();
    const first = vi.fn();
    const second = vi.fn();
    const cleanup = manager.connect(sdk, "client", first);
    cleanup();
    const disconnect = manager.connect(sdk, "client", second);
    cleanup();
    expect(sdk.initialize).toHaveBeenCalledTimes(1);
    const callback = vi.mocked(sdk.initialize).mock.calls[0][0].callback;
    callback({ credential: "test-credential" });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ credential: "test-credential" });
    disconnect();
    callback({ credential: "late-credential" });
    expect(second).toHaveBeenCalledTimes(1);
  });
});
