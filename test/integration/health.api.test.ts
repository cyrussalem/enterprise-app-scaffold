import { API_BASE, login } from "./helpers";

jest.setTimeout(30000);

describe("GET /v1/health (local API integration)", () => {
  it("returns 200 with devices when an access token is presented", async () => {
    const { accessToken } = await login();

    const res = await fetch(`${API_BASE}/v1/health`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toBe("success");
    expect(Array.isArray(body.devices)).toBe(true);
    expect(body.user?.sub).toBeTruthy();
  });
});
