import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from "@mui/material";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { AppShell } from "../components/AppShell";
import { DeviceMap } from "../components/DeviceMap";
import { useAuth } from "../auth/AuthContext";
import { getDashboardSummary, getDevices } from "../api/devices";
import type { FleetSummary, Device } from "../api/devices";

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card sx={{ textAlign: "center" }}>
      <CardContent>
        <Typography variant="h3" sx={{ color, fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

function StatusDonut({ online, offline, warning }: { online: number; offline: number; warning: number }) {
  const options: ApexOptions = {
    chart: { type: "donut" },
    labels: ["Online", "Offline", "Warning"],
    colors: ["#4caf50", "#f44336", "#ff9800"],
    legend: { position: "bottom" },
    dataLabels: { enabled: true },
  };
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Device Status
        </Typography>
        <ReactApexChart
          options={options}
          series={[online, offline, warning]}
          type="donut"
          height={280}
        />
      </CardContent>
    </Card>
  );
}

function TypeBarChart({ byType }: { byType: Partial<Record<string, number>> }) {
  const entries = Object.entries(byType).filter(([, v]) => v !== undefined) as [
    string,
    number
  ][];
  const categories = entries.map(([k]) => k);
  const data = entries.map(([, v]) => v);

  const options: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    xaxis: { categories },
    colors: ["#1976d2"],
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 4 } },
  };
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Device Types
        </Typography>
        <ReactApexChart
          options={options}
          series={[{ name: "Count", data }]}
          type="bar"
          height={280}
        />
      </CardContent>
    </Card>
  );
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#4caf50" : score >= 50 ? "#ff9800" : "#f44336";
  const options: ApexOptions = {
    chart: { type: "radialBar" },
    plotOptions: {
      radialBar: {
        hollow: { size: "60%" },
        dataLabels: {
          name: { show: true, offsetY: 20 },
          value: {
            show: true,
            fontSize: "28px",
            fontWeight: 700,
            offsetY: -20,
            formatter: (val: number) => `${val}%`,
          },
        },
      },
    },
    colors: [color],
    labels: ["Health Score"],
  };
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Fleet Health
        </Typography>
        <ReactApexChart
          options={options}
          series={[score]}
          type="radialBar"
          height={280}
        />
      </CardContent>
    </Card>
  );
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function AlertsFeed({ devices, onNavigate }: { devices: Device[]; onNavigate: (id: string) => void }) {
  const alerts = devices
    .filter((d) => d.status === "offline" || d.status === "warning")
    .sort((a, b) => {
      const ta = a.last_seen_at ?? a.updatedAt;
      const tb = b.last_seen_at ?? b.updatedAt;
      return new Date(tb).getTime() - new Date(ta).getTime();
    })
    .slice(0, 20);

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Alerts
        </Typography>
        {alerts.length === 0 ? (
          <Alert severity="success">No active alerts — all devices are online.</Alert>
        ) : (
          alerts.map((d, i) => (
            <Box key={d.id}>
              {i > 0 && <Divider />}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  py: 1.5,
                  px: 1,
                  borderRadius: 1,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => onNavigate(d.id)}
              >
                <Chip
                  label={d.status}
                  color={d.status === "offline" ? "error" : "warning"}
                  size="small"
                  sx={{ textTransform: "capitalize", minWidth: 72 }}
                />
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {d.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {d.location_label ?? "Unknown location"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72, textAlign: "right" }}>
                  {formatRelative(d.last_seen_at)}
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function FleetOverviewPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getDashboardSummary(session.idToken),
      getDevices(session.idToken),
    ])
      .then(([summaryData, deviceData]) => {
        if (!cancelled) {
          setSummary(summaryData);
          setDevices(deviceData);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load fleet data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <AppShell userEmail={session?.user.email} onLogout={handleLogout}>
      <Typography variant="h4" gutterBottom>
        Fleet Overview
      </Typography>

      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 4 }}>
          <CircularProgress />
          <Typography>Loading fleet data…</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && summary && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <KpiCard label="Total" value={summary.total} color="text.primary" />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <KpiCard label="Online" value={summary.online} color="#4caf50" />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <KpiCard label="Offline" value={summary.offline} color="#f44336" />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <KpiCard label="Warning" value={summary.warning} color="#ff9800" />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatusDonut
                online={summary.online}
                offline={summary.offline}
                warning={summary.warning}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TypeBarChart byType={summary.byType} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <HealthGauge score={summary.healthScore} />
            </Grid>
          </Grid>

          <Card>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="h6" gutterBottom>
                Device Locations
              </Typography>
              <DeviceMap devices={devices} />
            </CardContent>
          </Card>

          <AlertsFeed
            devices={devices}
            onNavigate={(id) => navigate(`/devices/${id}`)}
          />
        </>
      )}
    </AppShell>
  );
}
