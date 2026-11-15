import { createContext, useContext, useEffect, useState } from "react";
import { staffRepo, type StaffMember } from "../repos";
import { currentActor } from "../repos/sqlite/actor";

interface AuthState {
  ready: boolean;
  current: StaffMember | null;
  profiles: StaffMember[];
  needsSetup: boolean;
  gateNeeded: boolean;
  refresh(): Promise<void>;
  signIn(name: string, pin: string): Promise<string | null>;
  signOut(): void;
  createOwner(name: string, pin: string): Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState<StaffMember[]>([]);
  const [current, setCurrent] = useState<StaffMember | null>(null);

  async function refresh() {
    const list = await staffRepo.list();
    setProfiles(list);
    if (list.length === 1 && list[0].role === "Owner") {
      // single-owner shop: no PIN ask on every launch
      setCurrent(list[0]);
      currentActor.set(list[0]);
    }
    setReady(true);
  }

  useEffect(() => {
    refresh().catch(() => setReady(true));
  }, []);

  async function createOwner(name: string, pin: string) {
    await staffRepo.create({ name, role: "Owner", pin });
    await refresh();
  }

  async function signIn(name: string, pin: string) {
    const s = await staffRepo.signIn(name, pin);
    if (s) {
      setCurrent(s);
      currentActor.set(s);
      return null;
    }
    return "Wrong PIN, try again.";
  }

  const value: AuthState = {
    ready,
    current,
    profiles,
    needsSetup: ready && profiles.length === 0,
    gateNeeded: ready && profiles.length > 1 && !current,
    refresh,
    signIn,
    signOut: () => { setCurrent(null); currentActor.set(null); },
    createOwner,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
