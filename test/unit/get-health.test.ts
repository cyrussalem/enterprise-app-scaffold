import { handler } from "../../src/handlers/get-health";

describe("get-health handler", () => {
  it("returns HTTP 200 success response", async () => {
    const result = await handler();

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toBe("application/json");
    expect(JSON.parse(result.body)).toEqual({
      ok: true,
      message: "success"
    });
  });
});
