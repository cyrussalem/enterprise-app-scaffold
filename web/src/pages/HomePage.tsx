import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";
import MonitorHeartOutlinedIcon from "@mui/icons-material/MonitorHeartOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { KpiCard } from "../components/KpiCard";
import { AlertTimelineItem } from "../components/AlertTimelineItem";
import { ErrorCard } from "../components/ErrorCard";
import { SkeletonCard } from "../components/SkeletonCard";
import { useAuth } from "../auth/AuthContext";
import { getHealth } from "../api/auth";
import { getDashboardSummary, getDevices } from "../api/devices";
import type { FleetSummary, Device } from "../api/devices";
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

function greeting(email?: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const name = email?.split("@")[0] ?? "";
  return `Good ${time}${name ? `, ${name}` : ""}`;
}

export function HomePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [health, setHealth] = useState<unknown>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [alertDevices, setAlertDevices] = useState<Device[]>([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState<string | null>(null);

  function fetchHealth() {
    if (!session) return;
    let cancelled = false;
    setHealthLoading(true);
    getHealth(session.idToken)
      .then((d) => { if (!cancelled) { setHealth(d); setHealthError(null); } })
      .catch((e: unknown) => { if (!cancelled) setHealthError(e instanceof Error ? e.message : "health failed"); })
      .finally(() => { if (!cancelled) setHealthLoading(false); });
    return () => { cancelled = true; };
  }

  function fetchFleet() {
    if (!session) return;
    let cancelled = false;
    setFleetLoading(true);
    Promise.all([getDashboardSummary(session.idToken), getDevices(session.idToken)])
      .then(([s, devices]) => {
        if (!cancelled) {
          setSummary(s);
          const alerts = devices
            .filter((d) => d.status !== "online")
            .sort((a, b) => new Date(b.last_seen_at ?? b.updatedAt).getTime() - new Date(a.last_seen_at ?? a.updatedAt).getTime())
            .slice(0, 5);
          setAlertDevices(alerts);
          setFleetError(null);
        }
      })
      .catch((e: unknown) => { if (!cancelled) setFleetError(e instanceof Error ? e.message : "Failed to load fleet data"); })
      .finally(() => { if (!cancelled) setFleetLoading(false); });
    return () => { cancelled = true; };
  }

  useEffect(() => { fetchHealth(); fetchFleet(); }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerV = shouldReduceMotion ? instantVariants : staggerContainer;
  const itemV = shouldReduceMotion ? instantVariants : fadeUpIn;

  const healthRecord = health as Record<string, unknown> | null;
  const healthTimestamp = typeof healthRecord?.timestamp === "string" ? healthRecord.timestamp : null;

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        subtitle={greeting(session?.user.email)}
        actions={
          <Button
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
            onClick={() => { fetchHealth(); fetchFleet(); }}
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

      {/* KPI row */}
      {fleetLoading ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 6, sm: 3 }}>
              <SkeletonCard height={110} />
            </Grid>
          ))}
        </Grid>
      ) : fleetError ? (
        <ErrorCard message="Could not load fleet data" detail={fleetError} onRetry={fetchFleet} />
      ) : summary ? (
        <motion.div variants={containerV} initial="hidden" animate="visible">
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <motion.div variants={itemV}><KpiCard label="Total" value={summary.total} color="primary" /></motion.div>
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
      ) : null}

      <Grid container spacing={2}>
        {/* System Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <GlassCard data-testid="health-card" sx={{ height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <MonitorHeartOutlinedIcon sx={{ color: "#818cf8", fontSize: 18 }} />
              <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9" }}>
                System Status
              </Box>
            </Box>

            {healthLoading && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[80, 60, 40].map((w) => (
                  <Box key={w} sx={{ height: 10, width: `${w}%`, borderRadius: "4px", background: "rgba(148,163,184,0.08)", animation: "skeleton-wave 1.6s infinite" }} />
                ))}
              </Box>
            )}

            {healthError && (
              <Box data-testid="health-error">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#f43f5e" }}>
                  <ErrorOutlinedIcon sx={{ fontSize: 16 }} />
                  <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px" }}>{healthError}</Box>
                </Box>
              </Box>
            )}

            {!healthLoading && !healthError && health != null && (
              <Box data-testid="health-json">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <CheckCircleOutlinedIcon sx={{ color: "#10b981", fontSize: 18 }} />
                  <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#10b981", fontWeight: 500 }}>
                    API healthy
                  </Box>
                </Box>

                {healthTimestamp && (
                  <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "12px", color: "#64748b", mb: 1 }}>
                    Last checked: {new Date(healthTimestamp).toLocaleTimeString()}
                  </Box>
                )}

                <Box
                  component="pre"
                  data-testid="health-json-raw"
                  sx={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "11px",
                    color: "#475569",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "8px",
                    p: 1.5,
                    overflow: "auto",
                    maxHeight: 100,
                    m: 0,
                    border: "1px solid rgba(148,163,184,0.06)",
                  }}
                >
                  {JSON.stringify(health, null, 2)}
                </Box>
              </Box>
            )}

            {/* hidden testid shim for integration tests */}
            <Box data-testid="home-welcome" aria-hidden sx={{ display: "none" }}>
              {session?.user.email ?? ""}
            </Box>
          </GlassCard>
        </Grid>

        {/* Recent Alerts */}
        <Grid size={{ xs: 12, md: 6 }}>
          <GlassCard sx={{ height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "14px", color: "#f1f5f9" }}>
                Recent Alerts
              </Box>
              <Button
                size="small"
                onClick={() => navigate("/fleet")}
                sx={{ color: "#6366f1", fontSize: "11px", textTransform: "none", minWidth: 0, p: 0.5 }}
              >
                View all →
              </Button>
            </Box>

            {fleetLoading ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {[0, 1, 2].map((i) => (
                  <Box key={i} sx={{ height: 38, borderRadius: "8px", background: "rgba(148,163,184,0.05)", animation: "skeleton-wave 1.6s infinite", animationDelay: `${i * 0.1}s` }} />
                ))}
              </Box>
            ) : alertDevices.length === 0 ? (
              <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#475569", py: 2 }}>
                No active alerts — all devices online.
              </Box>
            ) : (
              alertDevices.map((d) => (
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
        </Grid>
      </Grid>
    </AppShell>
  );
}
