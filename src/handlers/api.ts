import { createRouter, type RouteTable } from "./router";
import { handler as getHealth } from "./get-health";
import { handler as getUsersMe } from "./get-users-me";
import { handler as postAuthSignup } from "./post-auth-signup";
import { handler as postAuthConfirm } from "./post-auth-confirm";
import { handler as postAuthLogin } from "./post-auth-login";
import { handler as postAuthRefresh } from "./post-auth-refresh";
import { handler as getDevices } from "./get-devices";
import { handler as postDevices } from "./post-devices";
import { handler as getDevice } from "./get-device";
import { handler as patchDevice } from "./patch-device";
import { handler as deleteDevice } from "./delete-device";
import { handler as postDeviceTelemetry } from "./post-device-telemetry";
import { handler as getDeviceTelemetry } from "./get-device-telemetry";
import { handler as getDashboardSummary } from "./get-dashboard-summary";

const routes: RouteTable = {
  "GET /v1/health": getHealth,
  "GET /v1/users/me": getUsersMe,
  "POST /v1/auth/signup": postAuthSignup,
  "POST /v1/auth/confirm": postAuthConfirm,
  "POST /v1/auth/login": postAuthLogin,
  "POST /v1/auth/refresh": postAuthRefresh,
  "GET /v1/devices": getDevices,
  "POST /v1/devices": postDevices,
  "GET /v1/devices/{id}": getDevice,
  "PATCH /v1/devices/{id}": patchDevice,
  "DELETE /v1/devices/{id}": deleteDevice,
  "POST /v1/devices/{id}/telemetry": postDeviceTelemetry,
  "GET /v1/devices/{id}/telemetry": getDeviceTelemetry,
  "GET /v1/dashboard/summary": getDashboardSummary,
};

export const handler = createRouter(routes);
