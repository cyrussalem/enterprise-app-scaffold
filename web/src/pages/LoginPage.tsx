import { useState } from "react";
import type { FormEvent } from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import { toast } from "../lib/toast";
import { useAuth } from "../auth/AuthContext";
import { fadeUpIn, instantVariants } from "../motion/variants";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const v = shouldReduceMotion ? instantVariants : fadeUpIn;

  return (
    <Box
      data-testid="login-page"
      sx={{
        display: "flex",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      {/* ─── Left panel ─── */}
      <Box
        sx={{
          flex: "0 0 60%",
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          p: 6,
          background: "#060b18",
        }}
      >
        {/* Animated mesh gradient */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(ellipse 70% 60% at 20% 30%, rgba(99,102,241,0.18) 0%, transparent 60%),
              radial-gradient(ellipse 50% 50% at 80% 70%, rgba(139,92,246,0.12) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 50% 10%, rgba(99,102,241,0.08) 0%, transparent 70%)
            `,
            "@keyframes mesh-shift": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.7, transform: "scale(1.04)" },
            },
            animation: "mesh-shift 8s ease-in-out infinite",
          }}
        />

        {/* Floating decorative mock cards */}
        <Box
          sx={{
            position: "absolute",
            top: "12%",
            right: "8%",
            width: 200,
            p: "14px",
            background: "rgba(17,29,53,0.7)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
            transform: "rotate(3deg)",
            opacity: 0.6,
          }}
        >
          <Box sx={{ fontSize: "10px", color: "#64748b", fontFamily: "Manrope, sans-serif", mb: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Devices</Box>
          <Box sx={{ fontSize: "28px", fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#818cf8", letterSpacing: "-0.03em" }}>247</Box>
        </Box>

        <Box
          sx={{
            position: "absolute",
            bottom: "18%",
            left: "6%",
            width: 180,
            p: "12px",
            background: "rgba(17,29,53,0.7)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
            transform: "rotate(-2deg)",
            opacity: 0.5,
          }}
        >
          <Box sx={{ fontSize: "10px", color: "#64748b", fontFamily: "Manrope, sans-serif", mb: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Online</Box>
          <Box sx={{ fontSize: "24px", fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#10b981", letterSpacing: "-0.03em" }}>231</Box>
        </Box>

        {/* Headline */}
        <Box sx={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
          <Box
            sx={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              mb: 2.5,
              background: "linear-gradient(135deg, #e0e7ff 0%, #c4b5fd 60%, #818cf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Monitor your fleet.
            <br />
            Act on what matters.
          </Box>
          <Box
            sx={{
              fontFamily: "Manrope, sans-serif",
              fontSize: "15px",
              color: "#64748b",
              lineHeight: 1.7,
            }}
          >
            Real-time telemetry, predictive alerts, and zero-latency response
            for your IoT infrastructure — all in one precision-built platform.
          </Box>
        </Box>
      </Box>

      {/* ─── Right panel (form) ─── */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, sm: 5 },
          background: "#0d1526",
          borderLeft: "1px solid rgba(148,163,184,0.08)",
          minHeight: "100vh",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 380 }}>
          {/* Logo mark */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box component="span" sx={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "15px", color: "#fff" }}>I</Box>
            </Box>
            <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "16px", color: "#f1f5f9" }}>
              IoT Platform
            </Box>
          </Box>

          <motion.div
            variants={v}
            initial="hidden"
            animate="visible"
          >
            <Box
              sx={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: "1.6rem",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
                mb: 0.5,
              }}
            >
              Welcome back
            </Box>
            <Box
              sx={{
                fontFamily: "Manrope, sans-serif",
                fontSize: "13px",
                color: "#64748b",
                mb: 3.5,
              }}
            >
              Sign in to your account
            </Box>

            <form onSubmit={handleSubmit} noValidate>
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                margin="normal"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                slotProps={{ htmlInput: { "data-testid": "login-email" } }}
                sx={{ mb: 0 }}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                required
                margin="normal"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                slotProps={{ htmlInput: { "data-testid": "login-password" } }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 2.5, height: 44 }}
                disabled={submitting}
                data-testid="login-submit"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <Box
              sx={{
                fontFamily: "Manrope, sans-serif",
                fontSize: "13px",
                color: "#64748b",
                mt: 2.5,
                textAlign: "center",
              }}
            >
              No account?{" "}
              <Link
                component={RouterLink}
                to="/register"
                sx={{ color: "#818cf8", textDecoration: "none", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}
              >
                Register
              </Link>
            </Box>

            {/* Hidden error element kept for integration test compatibility */}
            <Box
              data-testid="login-error"
              aria-live="polite"
              sx={{ display: "none" }}
            />
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
}
