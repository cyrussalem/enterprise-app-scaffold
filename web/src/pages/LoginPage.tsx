import { useState } from "react";
import type { FormEvent } from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
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
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    "/";

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 8 }} data-testid="login-page">
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Sign in
          </Typography>
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
            {error && (
              <Alert severity="error" sx={{ mt: 2 }} data-testid="login-error">
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              disabled={submitting}
              data-testid="login-submit"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <Typography variant="body2" sx={{ mt: 2 }}>
            No account?{" "}
            <Link component={RouterLink} to="/register">
              Register
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
