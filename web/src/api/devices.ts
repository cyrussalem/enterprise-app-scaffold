export interface FleetSummary {
  total: number;
  online: number;
  offline: number;
  warning: number;
  byType: Partial<Record<string, number>>;
  healthScore: number;
}

export interface Device {
  id: string;
  name: string;
  status: "online" | "offline" | "warning";
  device_type: string | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  last_seen_at: string | null;
  updatedAt: string;
}

export interface FullDevice {
  id: string;
  name: string;
  status: "online" | "offline" | "warning";
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  device_type: string | null;
  tags: string[] | null;
  last_seen_at: string | null;
  ip_address: string | null;
  signal_strength: number | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  timezone: string | null;
  firmware_version: string | null;
  hardware_revision: string | null;
  last_ota_update_at: string | null;
  battery_level: number | null;
  uptime_seconds: number | null;
  error_count: number | null;
  device_temperature: number | null;
  polling_interval_seconds: number | null;
  alert_threshold_config: Record<string, number> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryReading {
  id: string;
  device_id: string;
  recorded_at: string;
  metric: string;
  value: number;
  unit: string | null;
}

export interface QueryTelemetryOptions {
  metric?: string;
  from: Date;
  to: Date;
  limit?: number;
  offset?: number;
}

export async function getDashboardSummary(
  accessToken: string
): Promise<FleetSummary> {
  const res = await fetch("/v1/dashboard/summary", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`dashboard/summary failed (${res.status})`);
  }
  const body = (await res.json()) as { ok: boolean; summary: FleetSummary };
  return body.summary;
}

export async function getDevices(accessToken: string): Promise<Device[]> {
  const res = await fetch("/v1/devices", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`devices request failed (${res.status})`);
  }
  const body = (await res.json()) as { ok: boolean; devices: Device[] };
  return body.devices;
}

export async function getDevice(
  accessToken: string,
  deviceId: string
): Promise<FullDevice> {
  const res = await fetch(`/v1/devices/${deviceId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) throw Object.assign(new Error("device not found"), { status: 404 });
  if (!res.ok) throw new Error(`getDevice failed (${res.status})`);
  const body = (await res.json()) as { ok: boolean; device: FullDevice };
  return body.device;
}

export async function queryTelemetry(
  accessToken: string,
  deviceId: string,
  opts: QueryTelemetryOptions
): Promise<TelemetryReading[]> {
  const params = new URLSearchParams({
    from: opts.from.toISOString(),
    to: opts.to.toISOString(),
  });
  if (opts.metric) params.set("metric", opts.metric);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));

  const res = await fetch(`/v1/devices/${deviceId}/telemetry?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`queryTelemetry failed (${res.status})`);
  const body = (await res.json()) as { ok: boolean; readings: TelemetryReading[] };
  return body.readings;
}
