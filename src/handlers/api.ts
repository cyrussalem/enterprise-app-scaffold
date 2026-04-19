import { createRouter, type RouteTable } from "./router";
import { handler as getHealth } from "./get-health";
import { handler as getUsersMe } from "./get-users-me";
import { handler as postAuthSignup } from "./post-auth-signup";
import { handler as postAuthConfirm } from "./post-auth-confirm";
import { handler as postAuthLogin } from "./post-auth-login";
import { handler as postAuthRefresh } from "./post-auth-refresh";

const routes: RouteTable = {
  "GET /v1/health": getHealth,
  "GET /v1/users/me": getUsersMe,
  "POST /v1/auth/signup": postAuthSignup,
  "POST /v1/auth/confirm": postAuthConfirm,
  "POST /v1/auth/login": postAuthLogin,
  "POST /v1/auth/refresh": postAuthRefresh,
};

export const handler = createRouter(routes);
