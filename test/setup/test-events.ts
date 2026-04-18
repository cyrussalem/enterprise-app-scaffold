import type { APIGatewayProxyEvent } from "aws-lambda";

export interface TestUser {
  sub: string;
  email: string;
  username?: string;
}

export function eventWithUser(
  body: unknown = null,
  user: TestUser = { sub: "user-1", email: "test@example.com" }
): APIGatewayProxyEvent {
  return {
    body: body === null ? null : JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: "/",
    requestContext: {
      accountId: "local",
      apiId: "local",
      authorizer: {
        claims: {
          sub: user.sub,
          email: user.email,
          "cognito:username": user.username ?? user.email,
          token_use: "access",
        },
      },
      protocol: "HTTP/1.1",
      httpMethod: "GET",
      identity: {} as APIGatewayProxyEvent["requestContext"]["identity"],
      path: "/",
      stage: "local",
      requestId: "test-request-id",
      requestTimeEpoch: 0,
      resourceId: "local",
      resourcePath: "/",
    } as APIGatewayProxyEvent["requestContext"],
  };
}

export function anonymousEvent(body: unknown = null): APIGatewayProxyEvent {
  return {
    body: body === null ? null : JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: "/",
    requestContext: {
      accountId: "local",
      apiId: "local",
      protocol: "HTTP/1.1",
      httpMethod: "POST",
      identity: {} as APIGatewayProxyEvent["requestContext"]["identity"],
      path: "/",
      stage: "local",
      requestId: "test-request-id",
      requestTimeEpoch: 0,
      resourceId: "local",
      resourcePath: "/",
    } as APIGatewayProxyEvent["requestContext"],
  };
}
