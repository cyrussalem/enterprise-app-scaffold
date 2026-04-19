import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export type ChildHandler = (
  event: APIGatewayProxyEvent
) => Promise<APIGatewayProxyResult>;

export type RouteTable = Record<string, ChildHandler>;

export function routeKey(event: APIGatewayProxyEvent): string {
  const method = (event.httpMethod ?? "").toUpperCase();
  const path = event.resource ?? event.path ?? "";
  return `${method} ${path}`;
}

export function createRouter(routes: RouteTable): ChildHandler {
  return async (event) => {
    const key = routeKey(event);
    const child = routes[key];
    if (!child) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, message: `route not found: ${key}` }),
      };
    }
    return child(event);
  };
}
