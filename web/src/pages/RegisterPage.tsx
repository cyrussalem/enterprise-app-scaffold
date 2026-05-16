import { useState } from "react";
import type { FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import { toast } from "../lib/toast";
import { postSignup, postConfirm } from "../api/auth";
import { fadeUpIn, instantVariants } from "../motion/variants";

type Step = "signup" | "confirm" | "done";

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ["signup", "confirm", "done"];
  const idx = steps.indexOf(current);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0, mb: 4 }}>
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <Box key={s} sx={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : 0 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                flexShrink: 0,
                transition: "background 300ms, border-color 300ms",
                background: done || active
                  ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                  : "transparent",
                border: done || active
                  ? "none"
                  : "1px solid rgba(148,163,184,0.2)",
                color: done || active ? "#fff" : "#475569",
              }}
            >
              {i + 1}
            </Box>
            {i < 2 && (
              <Box
                sx={{
                  flex: 1,
                  height: "1px",
                  mx: 0.5,
                  background: done
                    ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
                    : "rgba(148,163,184,0.12)",
                  transition: "background 300ms",
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
  ];
  const strength = checks.filter(Boolean).length;
  const colors = ["#f43f5e", "#f59e0b", "#f59e0b", "#10b981", "#10b981"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
        {[1, 2, 3, 4].map((n) => (
          <Box
            key={n}
            sx={{
              flex: 1,
              height: "3px",
              borderRadius: "2px",
              background: n <= strength ? colors[strength] : "rgba(148,163,184,0.12)",
              transition: "background 300ms",
            }}
          />
        ))}
      </Box>
      <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "11px", color: colors[strength] }}>
        {labels[strength]}
      </Box>
    </Box>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [step, setStep] = useState<Step>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const v = shouldReduceMotion ? instantVariants : fadeUpIn;

  async function handleSignup(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    try {
      await postSignup(email, password);
      setStep("confirm");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    try {
      await postConfirm(email, code);
      setStep("done");
      toast.success("Account confirmed! Redirecting…");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      data-testid="register-page"
      sx={{
        display: "flex",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Left decorative panel */}
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
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(ellipse 60% 50% at 30% 60%, rgba(139,92,246,0.15) 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 70% 20%, rgba(99,102,241,0.10) 0%, transparent 60%)
            `,
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1, maxWidth: 440, textAlign: "center" }}>
          <Box
            sx={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              mb: 2,
              background: "linear-gradient(135deg, #e0e7ff 0%, #c4b5fd 60%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Join the platform.
            <br />
            Start monitoring today.
          </Box>
          <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "14px", color: "#64748b", lineHeight: 1.7 }}>
            Set up your account in under two minutes and connect your first device.
          </Box>
        </Box>
      </Box>

      {/* Right form panel */}
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
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 5 }}>
            <Box sx={{ width: 32, height: 32, background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Box component="span" sx={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "15px", color: "#fff" }}>I</Box>
            </Box>
            <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "16px", color: "#f1f5f9" }}>IoT Platform</Box>
          </Box>

          <StepIndicator current={step} />

          <AnimatePresence mode="wait">
            {step === "signup" && (
              <motion.div
                key="signup"
                variants={v}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "#f1f5f9", letterSpacing: "-0.02em", mb: 0.5 }}>
                  Create account
                </Box>
                <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#64748b", mb: 3 }}>
                  Step 1 of 3
                </Box>

                <form onSubmit={handleSignup} noValidate>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    required
                    margin="normal"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    slotProps={{ htmlInput: { "data-testid": "register-email" } }}
                  />
                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    required
                    margin="normal"
                    autoComplete="new-password"
                    helperText="At least 8 characters, upper + lower + number"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    slotProps={{ htmlInput: { "data-testid": "register-password" } }}
                  />
                  <PasswordStrength password={password} />

                  {/* Hidden error element for test compatibility */}
                  <Box data-testid="register-error" aria-live="polite" sx={{ display: "none" }} />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ mt: 3, height: 44 }}
                    disabled={submitting}
                    data-testid="register-submit"
                  >
                    {submitting ? "Creating…" : "Create account"}
                  </Button>
                </form>
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div
                key="confirm"
                variants={v}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "#f1f5f9", letterSpacing: "-0.02em", mb: 0.5 }}>
                  Confirm email
                </Box>
                <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#64748b", mb: 3 }}>
                  We sent a 6-digit code to {email}
                </Box>

                <form onSubmit={handleConfirm} noValidate>
                  <TextField
                    label="Confirmation code"
                    fullWidth
                    required
                    margin="normal"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    slotProps={{ htmlInput: { "data-testid": "confirm-code", inputMode: "numeric", maxLength: 6 } }}
                    sx={{
                      "& input": {
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: "1.2rem",
                        letterSpacing: "0.4em",
                      },
                    }}
                  />

                  {/* Hidden error element for test compatibility */}
                  <Box data-testid="confirm-error" aria-live="polite" sx={{ display: "none" }} />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ mt: 3, height: 44 }}
                    disabled={submitting}
                    data-testid="confirm-submit"
                  >
                    {submitting ? "Confirming…" : "Confirm"}
                  </Button>
                </form>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div
                key="done"
                variants={v}
                initial="hidden"
                animate="visible"
              >
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CheckCircleOutlinedIcon sx={{ fontSize: 52, color: "#10b981", mb: 2 }} />
                  <Box sx={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "#f1f5f9", letterSpacing: "-0.02em", mb: 1 }}>
                    All done
                  </Box>
                  <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#64748b" }}>
                    Your account is confirmed. Redirecting to sign in…
                  </Box>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          <Box sx={{ fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#64748b", mt: 3, textAlign: "center" }}>
            Already have an account?{" "}
            <Link component={RouterLink} to="/login" sx={{ color: "#818cf8", textDecoration: "none", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}>
              Sign in
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
