import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createRouter, routeKey, type RouteTable } from "../../src/handlers/router";

function makeEvent(
  httpMethod: string,
  resource: string,
  path: string = resource
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod,
    isBase64Encoded: false,
    path,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
  };
}

const ok = (label: string): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ label }),
});

describe("routeKey", () => {
  it("combines method and resource template", () => {
    expect(routeKey(makeEvent("GET", "/v1/health"))).toBe("GET /v1/health");
  });

  it("uses resource template (not concrete path) when path params are present", () => {
    const event = makeEvent("GET", "/v1/devices/{id}", "/v1/devices/abc");
    expect(routeKey(event)).toBe("GET /v1/devices/{id}");
  });

  it("uppercases the method", () => {
    const event = makeEvent("post", "/v1/auth/login");
    expect(routeKey(event)).toBe("POST /v1/auth/login");
  });
});

describe("createRouter", () => {
  it("dispatches to the handler matching method + resource", async () => {
    const health = jest.fn().mockResolvedValue(ok("health"));
    const login = jest.fn().mockResolvedValue(ok("login"));
    const routes: RouteTable = {
      "GET /v1/health": health,
      "POST /v1/auth/login": login,
    };
    const router = createRouter(routes);

    const event = makeEvent("GET", "/v1/health");
    const result = await router(event);

    expect(health).toHaveBeenCalledWith(event);
    expect(login).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).label).toBe("health");
  });

  it("returns 404 JSON for an unknown route", async () => {
    const router = createRouter({});
    const result = await router(makeEvent("GET", "/v1/nope"));

    expect(result.statusCode).toBe(404);
    expect(result.headers?.["content-type"]).toBe("application/json");
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(false);
    expect(body.message).toContain("GET /v1/nope");
  });

  it("passes the event through unchanged", async () => {
    const spy = jest.fn().mockResolvedValue(ok("users-me"));
    const router = createRouter({ "GET /v1/users/me": spy });

    const event = makeEvent("GET", "/v1/users/me");
    await router(event);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe(event);
  });
});
