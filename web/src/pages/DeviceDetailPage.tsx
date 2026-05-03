import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Skeleton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../auth/AuthContext";
import {
  getDevice,
  queryTelemetry,
} from "../api/devices";
import type { FullDevice, TelemetryReading } from "../api/devices";

// ---- helpers ----

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function rangeMs(range: "1h" | "24h" | "7d"): number {
  return range === "1h" ? 3_600_000 : range === "24h" ? 86_400_000 : 7 * 86_400_000;
}

function statusColor(status: string): "success" | "error" | "warning" | "default" {
  if (status === "online") return "success";
  if (status === "offline") return "error";
  if (status === "warning") return "warning";
  return "default";
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 180 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value ?? "—"}</Typography>
    </Box>
  );
}

// ---- Info card ----

function InfoCard({ device }: { device: FullDevice }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Typography variant="h5">{device.name}</Typography>
          <Chip
            label={device.status}
            color={statusColor(device.status)}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />
          <Typography variant="body2" color="text.secondary">
            Last seen: {formatRelative(device.last_seen_at)}
          </Typography>
        </Box>
        <Grid container spacing={0}>
          <Grid size={{ xs: 12, md: 6 }}>
            <InfoRow label="Serial number" value={device.serial_number} />
            <InfoRow label="Manufacturer" value={device.manufacturer} />
            <InfoRow label="Model" value={device.model} />
            <InfoRow label="Device type" value={device.device_type} />
            <InfoRow label="Firmware version" value={device.firmware_version} />
            <InfoRow label="Hardware revision" value={device.hardware_revision} />
            <InfoRow
              label="Last OTA update"
              value={device.last_ota_update_at ? new Date(device.last_ota_update_at).toLocaleString() : null}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <InfoRow label="Location" value={device.location_label} />
            <InfoRow
              label="Coordinates"
              value={
                device.latitude != null && device.longitude != null
                  ? `${Number(device.latitude).toFixed(4)}, ${Number(device.longitude).toFixed(4)}`
                  : null
              }
            />
            <InfoRow label="IP address" value={device.ip_address} />
            <InfoRow
              label="Signal strength"
              value={device.signal_strength != null ? `${device.signal_strength} dBm` : null}
            />
            <InfoRow label="Error count" value={device.error_count} />
            <InfoRow
              label="Tags"
              value={device.tags && device.tags.length > 0 ? device.tags.join(", ") : null}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

// ---- Health gauges ----

function HealthGauges({ device }: { device: FullDevice }) {
  const gauges = [
    {
      label: "Battery",
      value: device.battery_level ?? 0,
      max: 100,
      unit: "%",
      color: (v: number) => (v > 50 ? "#4caf50" : v > 20 ? "#ff9800" : "#f44336"),
    },
    {
      label: "Temperature",
      value: device.device_temperature != null ? Number(device.device_temperature) : 0,
      max: 100,
      unit: "°C",
      color: (v: number) => (v < 60 ? "#4caf50" : v < 80 ? "#ff9800" : "#f44336"),
    },
    {
      label: "Uptime",
      value: device.uptime_seconds != null ? Math.round(device.uptime_seconds / 3600) : 0,
      max: 8760,
      unit: "h",
      color: () => "#1976d2",
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {gauges.map((g) => {
        const pct = Math.min(100, Math.round((g.value / g.max) * 100));
        const color = g.color(g.value);
        const options: ApexOptions = {
          chart: { type: "radialBar" },
          plotOptions: {
            radialBar: {
              hollow: { size: "55%" },
              dataLabels: {
                name: { show: true, offsetY: 20 },
                value: {
                  show: true,
                  fontSize: "22px",
                  fontWeight: 700,
                  offsetY: -18,
                  formatter: () => `${g.value}${g.unit}`,
                },
              },
            },
          },
          colors: [color],
          labels: [g.label],
        };
        return (
          <Grid key={g.label} size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <ReactApexChart
                  options={options}
                  series={[pct]}
                  type="radialBar"
                  height={220}
                />
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

// ---- Telemetry chart ----

function TelemetryChart({ deviceId, token }: { deviceId: string; token: string }) {
  const [metrics, setMetrics] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("24h");
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(true);

  // Discover available metrics on mount
  useEffect(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86_400_000);
    queryTelemetry(token, deviceId, { from, to, limit: 200 })
      .then((data) => {
        const unique = [...new Set(data.map((r) => r.metric))].sort();
        setMetrics(unique);
        if (unique.length > 0) setSelectedMetric(unique[0]);
      })
      .catch(() => {/* ignore, will show empty state */})
      .finally(() => setDiscovering(false));
  }, [deviceId, token]);

  // Fetch chart data when metric or range changes
  useEffect(() => {
    if (!selectedMetric) return;
    let cancelled = false;
    setLoading(true);
    const to = new Date();
    const from = new Date(to.getTime() - rangeMs(timeRange));
    queryTelemetry(token, deviceId, { from, to, metric: selectedMetric, limit: 500 })
      .then((data) => {
        if (!cancelled) {
          // API returns newest-first; reverse for chronological chart
          setReadings([...data].reverse());
        }
      })
      .catch(() => { if (!cancelled) setReadings([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deviceId, token, selectedMetric, timeRange]);

  const unit = readings[0]?.unit ?? "";
  const series = [
    {
      name: selectedMetric,
      data: readings.map((r) => ({
        x: new Date(r.recorded_at).getTime(),
        y: r.value,
      })),
    },
  ];
  const chartOptions: ApexOptions = {
    chart: { type: "line", toolbar: { show: false }, animations: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    xaxis: { type: "datetime" },
    yaxis: { title: { text: unit }, labels: { formatter: (v: number) => v.toFixed(1) } },
    tooltip: { x: { format: "dd MMM HH:mm" } },
    colors: ["#1976d2"],
    markers: { size: 0 },
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Telemetry
          </Typography>
          {!discovering && metrics.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedMetric}
                label="Metric"
                onChange={(e: SelectChangeEvent) => setSelectedMetric(e.target.value)}
              >
                {metrics.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            size="small"
            onChange={(_, v) => { if (v) setTimeRange(v); }}
          >
            <ToggleButton value="1h">1h</ToggleButton>
            <ToggleButton value="24h">24h</ToggleButton>
            <ToggleButton value="7d">7d</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {discovering || loading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : readings.length === 0 ? (
          <Alert severity="info">No readings for this metric and time range.</Alert>
        ) : (
          <ReactApexChart
            options={chartOptions}
            series={series}
            type="line"
            height={280}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ---- Readings table ----

const TABLE_PAGE_SIZE = 25;

function ReadingsTable({ deviceId, token }: { deviceId: string; token: string }) {
  const [page, setPage] = useState(0);
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 86_400_000);
    queryTelemetry(token, deviceId, {
      from,
      to,
      limit: TABLE_PAGE_SIZE + 1,
      offset: page * TABLE_PAGE_SIZE,
    })
      .then((data) => {
        if (cancelled) return;
        setHasNext(data.length > TABLE_PAGE_SIZE);
        setReadings(data.slice(0, TABLE_PAGE_SIZE));
      })
      .catch(() => { if (!cancelled) setReadings([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deviceId, token, page]);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Raw Readings
        </Typography>
        {loading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : readings.length === 0 ? (
          <Alert severity="info">No readings found.</Alert>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {readings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.recorded_at).toLocaleString()}</TableCell>
                    <TableCell>{r.metric}</TableCell>
                    <TableCell align="right">{r.value}</TableCell>
                    <TableCell>{r.unit ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, mt: 1 }}>
              <Button size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <Typography variant="body2">Page {page + 1}</Typography>
              <Button size="small" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Alert timeline ----

function AlertTimeline() {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Alert History
        </Typography>
        <Alert severity="info">
          Alert history will be available once threshold evaluation is enabled.
        </Alert>
      </CardContent>
    </Card>
  );
}

// ---- Page ----

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [device, setDevice] = useState<FullDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function fetchDevice() {
    if (!session || !id) return;
    getDevice(session.accessToken, id)
      .then((d) => { setDevice(d); setNotFound(false); setError(null); })
      .catch((err: unknown) => {
        if (err instanceof Error && (err as Error & { status?: number }).status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load device");
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchDevice();
    intervalRef.current = setInterval(fetchDevice, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const pageTitle = device ? device.name : device === null && !loading ? "Device" : "Loading…";

  return (
    <AppShell userEmail={session?.user.email} onLogout={handleLogout}>
      <Typography variant="h4" gutterBottom>
        {pageTitle}
      </Typography>

      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 4 }}>
          <CircularProgress />
          <Typography>Loading device…</Typography>
        </Box>
      )}

      {notFound && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Device not found.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !notFound && !error && device && session && (
        <>
          <InfoCard device={device} />
          <HealthGauges device={device} />
          <TelemetryChart deviceId={device.id} token={session.accessToken} />
          <ReadingsTable deviceId={device.id} token={session.accessToken} />
          <AlertTimeline />
        </>
      )}
    </AppShell>
  );
}
