import type { APIGatewayProxyEvent } from "aws-lambda";

export interface RequestUser {
  sub: string;
  email: string;
  username: string;
}

export function getRequestUser(event: APIGatewayProxyEvent): RequestUser {
  const claims = event.requestContext?.authorizer?.claims as
    | Record<string, string>
    | undefined;

  if (claims && claims.sub) {
    return {
      sub: claims.sub,
      email: claims.email ?? "",
      username: claims["cognito:username"] ?? claims.email ?? claims.sub,
    };
  }

  // SAM local does not fully emulate the Cognito authorizer, so in local mode
  // we decode the bearer token ourselves. In real API Gateway the authorizer
  // always populates claims before the handler runs.
  if (process.env.AWS_SAM_LOCAL === "true") {
    const fallback = decodeBearerPayload(event);
    if (fallback) return fallback;
  }

  throw new Error("missing authorizer claims on authenticated route");
}

function decodeBearerPayload(event: APIGatewayProxyEvent): RequestUser | null {
  const header =
    event.headers?.Authorization ?? event.headers?.authorization;
  if (!header) return null;
  const parts = header.split(" ");
  const token = parts.length === 2 ? parts[1] : parts[0];
  const segments = token.split(".");
  if (segments.length < 2) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(segments[1], "base64").toString("utf-8")
    ) as Record<string, string>;
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: payload.email ?? "",
      username:
        payload.username ??
        payload["cognito:username"] ??
        payload.email ??
        payload.sub,
    };
  } catch {
    return null;
  }
}
