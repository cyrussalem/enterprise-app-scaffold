import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, Typography, CircularProgress, Alert, Box } from "@mui/material";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../auth/AuthContext";
import { getHealth } from "../api/auth";

export function HomePage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState<unknown>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    getHealth(session.accessToken)
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setHealthError(err instanceof Error ? err.message : "health failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  function handleLogout(): void {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <AppShell userEmail={session?.user.email} onLogout={handleLogout}>
      <Typography variant="h4" gutterBottom data-testid="home-welcome">
        Welcome{session?.user.email ? `, ${session.user.email}` : ""}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        You are signed in. This page made an authenticated call to{" "}
        <code>GET /v1/health</code> to prove the token works end-to-end.
      </Typography>

      <Card data-testid="health-card">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Health
          </Typography>
          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CircularProgress size={20} />
              <Typography>Loading...</Typography>
            </Box>
          )}
          {healthError && (
            <Alert severity="error" data-testid="health-error">
              {healthError}
            </Alert>
          )}
          {!loading && !healthError && (
            <Box
              component="pre"
              sx={{
                bgcolor: "grey.100",
                p: 2,
                borderRadius: 1,
                overflow: "auto",
                fontSize: 13,
              }}
              data-testid="health-json"
            >
              {JSON.stringify(health, null, 2)}
            </Box>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
