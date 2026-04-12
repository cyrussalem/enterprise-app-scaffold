describe("GET /v1/health (local API integration)", () => {
  it("returns HTTP 200 with devices from the database", async () => {
    const response = await fetch("http://127.0.0.1:3000/v1/health");

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.message).toBe("success");
    expect(Array.isArray(body.devices)).toBe(true);
  });
});
