import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import { useLocation } from "react-router-dom";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/fleet": "Fleet Overview",
};

function getPageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith("/devices/")) return "Device Detail";
  return "";
}

interface TopBarProps {
  sidebarWidth: number;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export function TopBar({ sidebarWidth, onMenuClick, isMobile }: TopBarProps) {
  const { pathname } = useLocation();
  const title = getPageTitle(pathname);

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        top: 0,
        left: isMobile ? 0 : sidebarWidth,
        right: 0,
        height: 52,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        px: 3,
        gap: 2,
        background: "#0d1526",
        borderBottom: "1px solid rgba(148,163,184,0.07)",
        transition: "left 0.3s",
      }}
    >
      {isMobile && (
        <IconButton
          size="small"
          onClick={onMenuClick}
          sx={{
            color: "#94a3b8",
            "&:hover": { color: "#f1f5f9", bgcolor: "rgba(148,163,184,0.06)" },
            borderRadius: "6px",
          }}
          aria-label="Open navigation"
        >
          <MenuIcon sx={{ fontSize: 20 }} />
        </IconButton>
      )}

      <Box
        sx={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 600,
          fontSize: "15px",
          color: "#f1f5f9",
          letterSpacing: "-0.01em",
          flex: 1,
        }}
      >
        {title}
      </Box>
    </Box>
  );
}
