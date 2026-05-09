export interface LoginResponse {
  ok: boolean;
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface SignupResponse {
  ok: boolean;
  message: string;
  userSub?: string;
  userConfirmed?: boolean;
}

export interface ApiError {
  ok: false;
  message: string;
  code?: string;
}

export async function postLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch("/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = (await res.json()) as ApiError;
    throw new Error(err.message ?? `login failed (${res.status})`);
  }
  return (await res.json()) as LoginResponse;
}

export async function postSignup(
  email: string,
  password: string
): Promise<SignupResponse> {
  const res = await fetch("/v1/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = (await res.json()) as ApiError;
    throw new Error(err.message ?? `signup failed (${res.status})`);
  }
  return (await res.json()) as SignupResponse;
}

export async function postConfirm(
  email: string,
  code: string
): Promise<void> {
  const res = await fetch("/v1/auth/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) {
    const err = (await res.json()) as ApiError;
    throw new Error(err.message ?? `confirm failed (${res.status})`);
  }
}

export async function getHealth(idToken: string): Promise<unknown> {
  const res = await fetch("/v1/health", {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    throw new Error(`health request failed (${res.status})`);
  }
  return await res.json();
}
