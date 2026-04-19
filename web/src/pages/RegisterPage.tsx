import { useState } from "react";
import type { FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
} from "@mui/material";
import { postSignup, postConfirm } from "../api/auth";

type Step = "signup" | "confirm" | "done";

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postSignup(email, password);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postConfirm(email, code);
      setStep("done");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "confirm failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 8 }} data-testid="register-page">
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {step === "signup" && "Create account"}
            {step === "confirm" && "Confirm email"}
            {step === "done" && "Confirmed"}
          </Typography>

          {step === "signup" && (
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
                helperText="At least 12 characters, upper + lower + number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                slotProps={{ htmlInput: { "data-testid": "register-password" } }}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2 }} data-testid="register-error">
                  {error}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 3 }}
                disabled={submitting}
                data-testid="register-submit"
              >
                {submitting ? "Creating..." : "Create account"}
              </Button>
            </form>
          )}

          {step === "confirm" && (
            <form onSubmit={handleConfirm} noValidate>
              <Alert severity="info" sx={{ mb: 2 }}>
                We sent a 6-digit code to {email}. Enter it below to confirm.
              </Alert>
              <TextField
                label="Confirmation code"
                fullWidth
                required
                margin="normal"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                slotProps={{ htmlInput: { "data-testid": "confirm-code" } }}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2 }} data-testid="confirm-error">
                  {error}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 3 }}
                disabled={submitting}
                data-testid="confirm-submit"
              >
                {submitting ? "Confirming..." : "Confirm"}
              </Button>
            </form>
          )}

          {step === "done" && (
            <Alert severity="success">
              Your account is confirmed. Redirecting to sign in...
            </Alert>
          )}

          <Typography variant="body2" sx={{ mt: 2 }}>
            Already have an account?{" "}
            <Link component={RouterLink} to="/login">
              Sign in
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
