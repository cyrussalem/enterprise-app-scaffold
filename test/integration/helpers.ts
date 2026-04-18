export const API_BASE = "http://127.0.0.1:3000";
export const SEED_EMAIL = "seed@example.com";
export const SEED_PASSWORD = "SeedPassword123!";

export interface LoginTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

export async function login(): Promise<LoginTokens> {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
  });
  if (res.status !== 200) {
    const text = await res.text();
    throw new Error(`login failed: ${res.status} ${text}`);
  }
  const body = await res.json();
  return {
    idToken: body.idToken,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
  };
}
