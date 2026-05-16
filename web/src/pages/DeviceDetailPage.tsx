import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Skeleton from "@mui/material/Skeleton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { SelectChangeEvent } from "@mui/material";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/GlassCard";
import { StatusBadge } from "../components/StatusBadge";
import { MetricGauge } from "../components/MetricGauge";
import { ErrorCard } from "../components/ErrorCard";
import { useAuth } from "../auth/AuthContext";
import { getDevice, queryTelemetry } from "../api/devices";
import type { FullDevice, TelemetryReading } from "../api/devices";
import { darkChartBase } from "../lib/apexTheme";
import { staggerContainer, fadeUpIn, instantVariants } from "../motion/variants";

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function rangeMs(range: "1h" | "24h" | "7d"): number {
  return range === "1h" ? 3_600_000 : range === "24h" ? 86_400_000 : 7 * 86_400_000;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const isCode = label.toLowerCase().includes("serial") ||
    label.toLowerCase().includes("ip") ||
    label.toLowerCase().includes("firmware") ||
    label.toLowerCase().includes("hardware");

  return (
    <Box sx={{ display: "flex", gap: 1, py: "6px", borderBottom: "1px solid rgba(148,163,184,0.05)" }}>
      <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "12px", color: "#64748b", minWidth: 160, flexShrink: 0 }}>
        {label}
      </Box>
      <Box
        sx={{
          fontFamily: isCode ? "JetBrains Mono, monospace" : "Manrope, sans-serif",
          fontSize: isCode ? "12px" : "13px",
          color: value != null ? "#f1f5f9" : "#334155",
        }}
      >
        {value ?? "—"}
      </Box>
    </Box>
  );
}

function DeviceHero({ device }: { device: FullDevice }) {
  const navigate = useNavigate();
  const glowVariant = device.status === "online" ? "online" : device.status === "offline" ? "offline" : "warning";

  return (
    <GlassCard glow={glowVariant} sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
        <IconButton
          size="small"
          onClick={() => navigate("/fleet")}
          sx={{ color: "#64748b", "&:hover": { color: "#94a3b8" }, alignSelf: "center" }}
          aria-label="Back to fleet"
        >
          <ArrowBackIcon sx={{ fontSize: 18 }} />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 1 }}>
            <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "#f1f5f9", letterSpacing: "-0.02em" }}>
              {device.name}
            </Box>
            <StatusBadge status={device.status} />
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "12px 24px" }}>
            {device.serial_number && (
              <Box sx={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#64748b" }}>
                SN: {device.serial_number}
              </Box>
            )}
            {device.model && (
              <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "12px", color: "#64748b" }}>
                {device.manufacturer} {device.model}
              </Box>
            )}
            {device.location_label && (
              <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "12px", color: "#64748b" }}>
                {device.location_label}
              </Box>
            )}
            <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "12px", color: "#475569" }}>
              Last seen: {formatRelative(device.last_seen_at)}
            </Box>
          </Box>
        </Box>
      </Box>
    </GlassCard>
  );
}

function HealthGauges({ device }: { device: FullDevice }) {
  const battery = device.battery_level ?? 0;
  const temp = device.device_temperature != null ? Number(device.device_temperature) : 0;
  const uptimeHours = device.uptime_seconds != null ? Math.round(device.uptime_seconds / 3600) : 0;

  const goodTempPct = temp < 60 ? 90 : temp < 80 ? 55 : 20;
  const uptimePct = Math.min(100, Math.round((uptimeHours / 8760) * 100));

  return (
    <GlassCard sx={{ mb: 3 }}>
      <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9", mb: 2 }}>
        Device Health
      </Box>
      <Grid container>
        <Grid size={{ xs: 12, sm: 4 }} sx={{ borderRight: { sm: "1px solid rgba(148,163,184,0.08)" }, pb: { xs: 2, sm: 0 } }}>
          <MetricGauge label="Battery" value={battery} max={100} unit="%" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }} sx={{ borderRight: { sm: "1px solid rgba(148,163,184,0.08)" }, py: { xs: 2, sm: 0 } }}>
          <MetricGauge
            label="Temperature"
            value={goodTempPct}
            max={100}
            unit="°C"
            displayValue={`${temp}°C`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }} sx={{ pt: { xs: 2, sm: 0 } }}>
          <MetricGauge label="Uptime" value={uptimePct} max={100} unit="h" displayValue={`${uptimeHours}h`} />
        </Grid>
      </Grid>
    </GlassCard>
  );
}

function TelemetryChart({ deviceId, token }: { deviceId: string; token: string }) {
  const [metrics, setMetrics] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("24h");
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(true);

  useEffect(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86_400_000);
    queryTelemetry(token, deviceId, { from, to, limit: 200 })
      .then((data) => {
        const unique = [...new Set(data.map((r) => r.metric))].sort();
        setMetrics(unique);
        if (unique.length > 0) setSelectedMetric(unique[0]);
      })
      .catch(() => {})
      .finally(() => setDiscovering(false));
  }, [deviceId, token]);

  useEffect(() => {
    if (!selectedMetric) return;
    let cancelled = false;
    setLoading(true);
    const to = new Date();
    const from = new Date(to.getTime() - rangeMs(timeRange));
    queryTelemetry(token, deviceId, { from, to, metric: selectedMetric, limit: 500 })
      .then((data) => { if (!cancelled) setReadings([...data].reverse()); })
      .catch(() => { if (!cancelled) setReadings([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deviceId, token, selectedMetric, timeRange]);

  const unit = readings[0]?.unit ?? "";
  const chartOptions: ApexOptions = {
    ...darkChartBase,
    chart: { ...darkChartBase.chart, type: "area", animations: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shade: "dark", type: "vertical", gradientToColors: ["transparent"], opacityFrom: 0.35, opacityTo: 0, stops: [0, 100] },
    },
    xaxis: { ...darkChartBase.xaxis, type: "datetime" },
    yaxis: {
      title: { text: unit, style: { color: "#64748b", fontFamily: "Manrope, sans-serif", fontSize: "11px" } },
      labels: { style: { colors: "#64748b", fontFamily: "Manrope, sans-serif" }, formatter: (v: number) => v.toFixed(1) },
    },
    tooltip: { ...darkChartBase.tooltip, x: { format: "dd MMM HH:mm" } },
    colors: ["#6366f1"],
    markers: { size: 0 },
  };

  return (
    <GlassCard sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 2 }}>
        <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9", flex: 1 }}>
          Telemetry
        </Box>
        {!discovering && metrics.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: "12px" }}>Metric</InputLabel>
            <Select
              value={selectedMetric}
              label="Metric"
              onChange={(e: SelectChangeEvent) => setSelectedMetric(e.target.value)}
              sx={{ fontSize: "13px" }}
            >
              {metrics.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          size="small"
          onChange={(_, v) => { if (v) setTimeRange(v); }}
        >
          {(["1h", "24h", "7d"] as const).map((r) => (
            <ToggleButton key={r} value={r} sx={{ px: 1.5, fontSize: "11px" }}>{r}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {discovering || loading ? (
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: "8px", bgcolor: "rgba(148,163,184,0.06)" }} />
      ) : readings.length === 0 ? (
        <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#475569", py: 3, textAlign: "center" }}>
          No readings for this metric and time range.
        </Box>
      ) : (
        <ReactApexChart
          options={chartOptions}
          series={[{ name: selectedMetric, data: readings.map((r) => ({ x: new Date(r.recorded_at).getTime(), y: r.value })) }]}
          type="area"
          height={280}
        />
      )}
    </GlassCard>
  );
}

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
    queryTelemetry(token, deviceId, { from, to, limit: TABLE_PAGE_SIZE + 1, offset: page * TABLE_PAGE_SIZE })
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
    <GlassCard sx={{ mb: 3 }}>
      <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9", mb: 2 }}>
        Raw Readings
      </Box>
      {loading ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: "8px", bgcolor: "rgba(148,163,184,0.06)" }} />
      ) : readings.length === 0 ? (
        <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#475569", py: 2 }}>No readings found.</Box>
      ) : (
        <>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Timestamp", "Metric", "Value", "Unit"].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {readings.map((r) => (
                  <TableRow
                    key={r.id}
                    sx={{ "&:hover": { bgcolor: "rgba(148,163,184,0.03)" }, transition: "background 120ms" }}
                  >
                    <TableCell sx={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#94a3b8" }}>
                      {new Date(r.recorded_at).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontFamily: "Manrope, sans-serif", fontSize: "12px" }}>{r.metric}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "#818cf8" }}>
                      {r.value}
                    </TableCell>
                    <TableCell sx={{ fontFamily: "Manrope, sans-serif", fontSize: "12px", color: "#64748b" }}>
                      {r.unit ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, mt: 1.5 }}>
            <Button size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)} sx={{ fontSize: "12px" }}>
              Prev
            </Button>
            <Box sx={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#475569" }}>
              pg {page + 1}
            </Box>
            <Button size="small" disabled={!hasNext} onClick={() => setPage((p) => p + 1)} sx={{ fontSize: "12px" }}>
              Next
            </Button>
          </Box>
        </>
      )}
    </GlassCard>
  );
}

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [device, setDevice] = useState<FullDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDevice = useCallback(() => {
    if (!session || !id) return;
    getDevice(session.idToken, id)
      .then((d) => { setDevice(d); setNotFound(false); setError(null); })
      .catch((err: unknown) => {
        if (err instanceof Error && (err as Error & { status?: number }).status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load device");
        }
      })
      .finally(() => setLoading(false));
  }, [session, id]);

  useEffect(() => {
    fetchDevice();
    intervalRef.current = setInterval(fetchDevice, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchDevice]);

  const containerV = shouldReduceMotion ? instantVariants : staggerContainer;
  const itemV = shouldReduceMotion ? instantVariants : fadeUpIn;

  return (
    <AppShell>
      {loading && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ height: 88, borderRadius: "14px", background: "rgba(148,163,184,0.05)", animation: "skeleton-wave 1.6s infinite" }} />
          <Box sx={{ height: 200, borderRadius: "14px", background: "rgba(148,163,184,0.05)", animation: "skeleton-wave 1.6s infinite", animationDelay: "0.1s" }} />
        </Box>
      )}

      {notFound && (
        <ErrorCard message="Device not found" detail={`Device ID: ${id}`} onRetry={() => navigate("/fleet")} />
      )}

      {error && (
        <ErrorCard message="Could not load device" detail={error} onRetry={fetchDevice} />
      )}

      {!loading && !notFound && !error && device && session && (
        <motion.div variants={containerV} initial="hidden" animate="visible">
          <motion.div variants={itemV}>
            <DeviceHero device={device} />
          </motion.div>

          <motion.div variants={itemV}>
            <HealthGauges device={device} />
          </motion.div>

          <motion.div variants={itemV}>
            <TelemetryChart deviceId={device.id} token={session.idToken} />
          </motion.div>

          {/* Device info */}
          <motion.div variants={itemV}>
            <GlassCard sx={{ mb: 3 }}>
              <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9", mb: 2 }}>
                Device Info
              </Box>
              <Grid container spacing={0}>
                <Grid size={{ xs: 12, md: 6 }} sx={{ pr: { md: 3 } }}>
                  <InfoRow label="Serial number" value={device.serial_number} />
                  <InfoRow label="Manufacturer" value={device.manufacturer} />
                  <InfoRow label="Model" value={device.model} />
                  <InfoRow label="Device type" value={device.device_type} />
                  <InfoRow label="Firmware version" value={device.firmware_version} />
                  <InfoRow label="Hardware revision" value={device.hardware_revision} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <InfoRow label="Location" value={device.location_label} />
                  <InfoRow
                    label="Coordinates"
                    value={device.latitude != null && device.longitude != null ? `${Number(device.latitude).toFixed(4)}, ${Number(device.longitude).toFixed(4)}` : null}
                  />
                  <InfoRow label="IP address" value={device.ip_address} />
                  <InfoRow label="Signal strength" value={device.signal_strength != null ? `${device.signal_strength} dBm` : null} />
                  <InfoRow label="Error count" value={device.error_count} />
                  <InfoRow label="Tags" value={device.tags?.join(", ") ?? null} />
                </Grid>
              </Grid>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemV}>
            <ReadingsTable deviceId={device.id} token={session.idToken} />
          </motion.div>

          <motion.div variants={itemV}>
            <GlassCard sx={{ mb: 3 }}>
              <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9", mb: 1 }}>
                Alert History
              </Box>
              <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#475569" }}>
                Alert history will be available once threshold evaluation is enabled.
              </Box>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AppShell>
  );
}
