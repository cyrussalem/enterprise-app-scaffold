import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { postLogin } from "../api/auth";

export interface SessionUser {
  sub: string;
  email: string;
}

export interface Session {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  user: SessionUser;
}

export interface AuthValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

const STORAGE_KEY = "enterprise-app.session";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function userFromIdToken(idToken: string): SessionUser {
  const claims = decodeJwtPayload(idToken) ?? {};
  return {
    sub: typeof claims.sub === "string" ? claims.sub : "",
    email: typeof claims.email === "string" ? claims.email : "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  async function login(email: string, password: string): Promise<void> {
    const tokens = await postLogin(email, password);
    setSession({
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
      refreshToken: tokens.refreshToken,
      user: userFromIdToken(tokens.idToken),
    });
  }

  function logout(): void {
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
