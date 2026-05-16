import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const EXPANDED_W = 240;
const COLLAPSED_W = 64;
const MOBILE_BP = 768;

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BP);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < MOBILE_BP);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleStorageChange() {
      try {
        setSidebarCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
      } catch {}
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {isMobile ? (
        <MobileSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      ) : (
        <Sidebar />
      )}

      <Box
        component="main"
        sx={{
          flex: 1,
          ml: isMobile ? 0 : `${sidebarWidth}px`,
          mt: "52px",
          minHeight: "calc(100vh - 52px)",
          transition: "margin-left 0.3s",
          maxWidth: "1440px",
          width: "100%",
        }}
      >
        <TopBar
          sidebarWidth={sidebarWidth}
          isMobile={isMobile}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
}
