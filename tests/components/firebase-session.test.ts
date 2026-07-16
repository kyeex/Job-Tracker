import { beforeEach, describe, expect, it, vi } from "vitest";

const firebase = vi.hoisted(() => {
  const user = {
    uid: "guest-user",
    displayName: null,
    email: null,
    isAnonymous: true,
  };
  const auth = { currentUser: null as typeof user | null };
  let finishAnonymousSignIn = () => undefined;

  return {
    auth,
    user,
    setPersistence: vi.fn(() => Promise.resolve()),
    signInAnonymously: vi.fn(
      () =>
        new Promise<{ user: typeof user }>((resolve) => {
          finishAnonymousSignIn = () => {
            auth.currentUser = user;
            resolve({ user });
          };
        }),
    ),
    finishSignIn: () => finishAnonymousSignIn(),
  };
});

vi.mock("@firebase/app", () => ({
  getApps: () => [{}],
  initializeApp: vi.fn(),
}));

vi.mock("@firebase/auth", () => ({
  browserLocalPersistence: {},
  connectAuthEmulator: vi.fn(),
  getAuth: () => firebase.auth,
  GoogleAuthProvider: class {
    static credentialFromError() {
      return null;
    }

    setCustomParameters() {}
  },
  linkWithPopup: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => undefined),
  setPersistence: firebase.setPersistence,
  signInAnonymously: firebase.signInAnonymously,
  signInWithCredential: vi.fn(),
  signOut: vi.fn(),
}));

describe("Firebase session initialization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    firebase.auth.currentUser = null;
  });

  it("shares one anonymous sign-in across concurrent user requests", async () => {
    const { getFirebaseUser } = await import("@/app/lib/firebase-client");

    const first = getFirebaseUser();
    const second = getFirebaseUser();
    await Promise.resolve();
    await Promise.resolve();

    expect(firebase.setPersistence).toHaveBeenCalledOnce();
    expect(firebase.signInAnonymously).toHaveBeenCalledOnce();

    firebase.finishSignIn();
    await expect(Promise.all([first, second])).resolves.toEqual([firebase.user, firebase.user]);
  });
});
