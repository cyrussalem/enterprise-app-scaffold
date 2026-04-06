describe("GET /v1/health (local API integration)", () => {
  it("returns HTTP 200 and the expected JSON payload", async () => {
    const response = await fetch("http://127.0.0.1:3000/v1/health");

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      ok: true,
      message: "success"
    });
  });
});
