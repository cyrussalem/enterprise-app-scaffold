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
