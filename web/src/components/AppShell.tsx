import type { ReactNode } from "react";
import { AppBar, Toolbar, Typography, Button, Box, Container } from "@mui/material";

interface AppShellProps {
  userEmail?: string;
  onLogout: () => void;
  children: ReactNode;
}

export function AppShell({ userEmail, onLogout, children }: AppShellProps) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Enterprise App
          </Typography>
          {userEmail && (
            <Typography variant="body2" sx={{ mr: 2 }}>
              {userEmail}
            </Typography>
          )}
          <Button color="inherit" onClick={onLogout} data-testid="logout-button">
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
