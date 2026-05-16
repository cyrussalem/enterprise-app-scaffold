import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { KpiCard } from "../components/KpiCard";
import { AlertTimelineItem } from "../components/AlertTimelineItem";
import { SkeletonCard } from "../components/SkeletonCard";
import { ErrorCard } from "../components/ErrorCard";
import { DeviceMap } from "../components/DeviceMap";
import { useAuth } from "../auth/AuthContext";
import { getDashboardSummary, getDevices } from "../api/devices";
import type { FleetSummary, Device } from "../api/devices";
import { darkChartBase } from "../lib/apexTheme";
import { staggerContainer, fadeUpIn, instantVariants } from "../motion/variants";

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

function StatusDonut({ online, offline, warning }: { online: number; offline: number; warning: number }) {
  const options: ApexOptions = {
    ...darkChartBase,
    chart: { ...darkChartBase.chart, type: "donut" },
    labels: ["Online", "Offline", "Warning"],
    colors: ["#10b981", "#f43f5e", "#f59e0b"],
    legend: { ...darkChartBase.legend, position: "bottom" },
    dataLabels: { enabled: true, style: { fontFamily: "Manrope, sans-serif", fontSize: "11px" } },
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "TOTAL",
              fontSize: "10px",
              fontFamily: "Manrope, sans-serif",
              color: "#64748b",
              formatter: (w) => String(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)),
            },
          },
        },
      },
    },
    stroke: { width: 2, colors: ["#0d1526"] },
  };

  return (
    <GlassCard sx={{ height: "100%" }}>
      <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9", mb: 1 }}>
        Device Status
      </Box>
      <ReactApexChart options={options} series={[online, offline, warning]} type="donut" height={240} />
    </GlassCard>
  );
}

function TypeBarChart({ byType }: { byType: Partial<Record<string, number>> }) {
  const entries = Object.entries(byType).filter(([, v]) => v !== undefined) as [string, number][];

  const options: ApexOptions = {
    ...darkChartBase,
    chart: { ...darkChartBase.chart, type: "bar" },
    xaxis: { ...darkChartBase.xaxis, categories: entries.map(([k]) => k) },
    colors: ["#6366f1"],
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "50%",
        distributed: false,
      },
    },
    fill: {
      type: "gradient",
      gradient: { shade: "dark", type: "vertical", gradientToColors: ["#8b5cf6"], stops: [0, 100] },
    },
  };

  return (
    <GlassCard sx={{ height: "100%" }}>
      <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9", mb: 1 }}>
        Device Types
      </Box>
      <ReactApexChart
        options={options}
        series={[{ name: "Count", data: entries.map(([, v]) => v) }]}
        type="bar"
        height={240}
      />
    </GlassCard>
  );
}

function HealthGaugeChart({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  const options: ApexOptions = {
    ...darkChartBase,
    chart: { ...darkChartBase.chart, type: "radialBar" },
    plotOptions: {
      radialBar: {
        hollow: { size: "60%", background: "transparent" },
        track: { background: "rgba(148,163,184,0.08)", strokeWidth: "100%" },
        dataLabels: {
          name: {
            show: true,
            offsetY: 24,
            color: "#64748b",
            fontSize: "10px",
            fontFamily: "Manrope, sans-serif",
            fontWeight: 500,
          },
          value: {
            show: true,
            fontSize: "28px",
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            color: color,
            offsetY: -14,
            formatter: (v: number) => `${v}%`,
          },
        },
      },
    },
    colors: [color],
    labels: ["Health Score"],
    fill: { type: "gradient", gradient: { shade: "dark", type: "horizontal", gradientToColors: [color], stops: [0, 100] } },
  };

  return (
    <GlassCard sx={{ height: "100%" }}>
      <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9", mb: 1 }}>
        Fleet Health
      </Box>
      <ReactApexChart options={options} series={[score]} type="radialBar" height={240} />
    </GlassCard>
  );
}

export function FleetOverviewPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getDashboardSummary(session.idToken), getDevices(session.idToken)])
      .then(([summaryData, deviceData]) => {
        if (!cancelled) { setSummary(summaryData); setDevices(deviceData); setError(null); }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load fleet data");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const alerts = devices
    .filter((d) => d.status !== "online")
    .sort((a, b) => new Date(b.last_seen_at ?? b.updatedAt).getTime() - new Date(a.last_seen_at ?? a.updatedAt).getTime())
    .slice(0, 20);

  const containerV = shouldReduceMotion ? instantVariants : staggerContainer;
  const itemV = shouldReduceMotion ? instantVariants : fadeUpIn;

  return (
    <AppShell>
      <PageHeader
        title="Fleet Overview"
        subtitle={summary ? `Real-time monitoring across ${summary.total} devices` : "Real-time monitoring"}
        actions={
          <Button
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
            onClick={fetchData}
            disabled={loading}
            sx={{
              color: "#64748b",
              fontSize: "12px",
              borderColor: "rgba(148,163,184,0.15)",
              "&:hover": { borderColor: "rgba(148,163,184,0.3)", color: "#94a3b8" },
            }}
            variant="outlined"
          >
            Refresh
          </Button>
        }
      />

      {/* KPI cards */}
      {loading ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 6, sm: 3 }}>
              <SkeletonCard height={110} />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <ErrorCard message="Could not load fleet data" detail={error} onRetry={fetchData} />
      ) : summary ? (
        <>
          <motion.div variants={containerV} initial="hidden" animate="visible">
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <motion.div variants={itemV}><KpiCard label="Total Devices" value={summary.total} color="primary" /></motion.div>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <motion.div variants={itemV}><KpiCard label="Online" value={summary.online} color="online" /></motion.div>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <motion.div variants={itemV}><KpiCard label="Offline" value={summary.offline} color="offline" /></motion.div>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <motion.div variants={itemV}><KpiCard label="Warning" value={summary.warning} color="warning" /></motion.div>
              </Grid>
            </Grid>
          </motion.div>

          {/* Charts row */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatusDonut online={summary.online} offline={summary.offline} warning={summary.warning} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TypeBarChart byType={summary.byType} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <HealthGaugeChart score={summary.healthScore} />
            </Grid>
          </Grid>

          {/* Map */}
          <GlassCard sx={{ mb: 3, p: "16px" }}>
            <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9", mb: 2 }}>
              Device Locations
            </Box>
            <DeviceMap devices={devices} />
          </GlassCard>

          {/* Alerts feed */}
          <GlassCard>
            <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9", mb: 2 }}>
              Recent Alerts
            </Box>
            {alerts.length === 0 ? (
              <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#475569", py: 2 }}>
                No active alerts — all devices online.
              </Box>
            ) : (
              alerts.map((d) => (
                <AlertTimelineItem
                  key={d.id}
                  status={d.status}
                  name={d.name}
                  location={d.location_label}
                  timeAgo={formatRelative(d.last_seen_at)}
                  onClick={() => navigate(`/devices/${d.id}`)}
                />
              ))
            )}
          </GlassCard>
        </>
      ) : null}
    </AppShell>
  );
}
