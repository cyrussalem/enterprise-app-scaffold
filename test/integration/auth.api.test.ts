import { API_BASE, SEED_EMAIL, SEED_PASSWORD } from "./helpers";

jest.setTimeout(30000);

describe("auth API (local)", () => {
  it("POST /v1/auth/login with valid seed credentials returns tokens", async () => {
    const res = await fetch(`${API_BASE}/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.accessToken).toBe("string");
    expect(typeof body.idToken).toBe("string");
    expect(typeof body.refreshToken).toBe("string");
  });

  it("POST /v1/auth/login with bad credentials returns 401", async () => {
    const res = await fetch(`${API_BASE}/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: SEED_EMAIL, password: "WrongPassword!" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /v1/auth/refresh exchanges a refresh token for a new access token", async () => {
    const loginRes = await fetch(`${API_BASE}/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
    });
    const { refreshToken } = await loginRes.json();

    const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.accessToken).toBe("string");
  });
});
