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

type CompiledRoute = {
  method: string;
  regex: RegExp;
  paramNames: string[];
  handler: ChildHandler;
};

function compileRoute(key: string, handler: ChildHandler): CompiledRoute {
  const spaceIdx = key.indexOf(" ");
  const method = key.slice(0, spaceIdx).toUpperCase();
  const template = key.slice(spaceIdx + 1);
  const paramNames: string[] = [];
  const regexStr = template.replace(/\{(\w+)\}/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  return { method, regex: new RegExp(`^${regexStr}$`), paramNames, handler };
}

export function createRouter(routes: RouteTable): ChildHandler {
  const compiled = Object.entries(routes).map(([key, handler]) =>
    compileRoute(key, handler)
  );
  const exactMap: Record<string, ChildHandler> = {};
  for (const [key, handler] of Object.entries(routes)) {
    exactMap[key] = handler;
  }

  return async (event) => {
    const method = (event.httpMethod ?? "").toUpperCase();
    const resource = event.resource ?? event.path ?? "";
    const actualPath = event.path ?? resource;

    // Exact match: API Gateway sets resource = template (e.g. "/v1/devices/{id}")
    const exactHandler = exactMap[`${method} ${resource}`];
    if (exactHandler) {
      return exactHandler(event);
    }

    // Pattern match: local dev server sets resource = actual path (e.g. "/v1/devices/abc")
    for (const route of compiled) {
      if (route.method !== method) continue;
      const match = route.regex.exec(actualPath);
      if (match) {
        const pathParameters: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          pathParameters[name] = decodeURIComponent(match[i + 1]);
        });
        return route.handler({ ...event, pathParameters });
      }
    }

    return {
      statusCode: 404,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, message: `route not found: ${method} ${resource}` }),
    };
  };
}
