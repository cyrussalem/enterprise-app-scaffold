import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import RouterOutlinedIcon from "@mui/icons-material/RouterOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useAuth } from "../auth/AuthContext";

const STORAGE_KEY = "sidebar-collapsed";
const EXPANDED_W = 240;
const COLLAPSED_W = 64;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <DashboardOutlinedIcon fontSize="small" /> },
  { label: "Fleet", path: "/fleet", icon: <RouterOutlinedIcon fontSize="small" /> },
];

export function Sidebar() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function isActive(path: string) {
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  }

  const springTransition = shouldReduceMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 300, damping: 30 } as const);

  const w = collapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <motion.aside
      animate={{ width: w }}
      transition={springTransition}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        background: "#0d1526",
        borderRight: "1px solid rgba(148,163,184,0.08)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Logo row */}
      <Box
        sx={{
          height: 52,
          display: "flex",
          alignItems: "center",
          px: collapsed ? "20px" : "20px",
          borderBottom: "1px solid rgba(148,163,184,0.06)",
          flexShrink: 0,
          gap: 1.5,
          overflow: "hidden",
        }}
      >
        {/* Hex logo mark */}
        <Box
          sx={{
            width: 28,
            height: 28,
            flexShrink: 0,
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            component="span"
            sx={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: "13px",
              color: "#fff",
              lineHeight: 1,
            }}
          >
            I
          </Box>
        </Box>

        <AnimatePresence>
          {!collapsed && (
            <motion.span
              key="wordmark"
              initial={shouldReduceMotion ? {} : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: "15px",
                color: "#f1f5f9",
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}
            >
              IoT Platform
            </motion.span>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        <Box sx={{ ml: "auto", flexShrink: 0 }}>
          <IconButton
            size="small"
            onClick={() => setCollapsed((c) => !c)}
            sx={{
              color: "#64748b",
              "&:hover": { color: "#94a3b8", bgcolor: "rgba(148,163,184,0.06)" },
              borderRadius: "6px",
              width: 28,
              height: 28,
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRightIcon sx={{ fontSize: 16 }} />
            ) : (
              <ChevronLeftIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Box>
      </Box>

      {/* Nav items */}
      <Box sx={{ flex: 1, py: 1, overflowY: "auto", overflowX: "hidden" }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const content = (
            <Box
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mx: 1,
                px: "10px",
                py: "8px",
                borderRadius: "8px",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "background 120ms, color 120ms",
                color: active ? "#f1f5f9" : "#94a3b8",
                fontWeight: active ? 600 : 400,
                bgcolor: active ? "rgba(99,102,241,0.12)" : "transparent",
                "&:hover": {
                  bgcolor: active
                    ? "rgba(99,102,241,0.16)"
                    : "rgba(148,163,184,0.06)",
                  color: "#f1f5f9",
                },
                ...(active && {
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: "20%",
                    bottom: "20%",
                    width: "3px",
                    borderRadius: "0 3px 3px 0",
                    background: "linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)",
                  },
                }),
              }}
            >
              <Box
                sx={{
                  color: active ? "#818cf8" : "inherit",
                  flexShrink: 0,
                  display: "flex",
                }}
              >
                {item.icon}
              </Box>

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    key={item.label}
                    initial={shouldReduceMotion ? {} : { opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, x: -4 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      fontFamily: "Manrope, sans-serif",
                      fontSize: "13.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Box>
          );

          return collapsed ? (
            <Tooltip key={item.path} title={item.label} placement="right">
              {content}
            </Tooltip>
          ) : (
            content
          );
        })}
      </Box>

      {/* Bottom: user + logout */}
      <Box
        sx={{
          borderTop: "1px solid rgba(148,163,184,0.06)",
          p: 1,
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: "10px",
            py: "8px",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <Avatar
            sx={{
              width: 28,
              height: 28,
              flexShrink: 0,
              fontSize: "11px",
              fontWeight: 600,
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            }}
          >
            {session?.user.email?.[0]?.toUpperCase() ?? "?"}
          </Avatar>

          <AnimatePresence>
            {!collapsed && (
              <motion.span
                key="email"
                initial={shouldReduceMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? {} : { opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{
                  fontFamily: "Manrope, sans-serif",
                  fontSize: "12px",
                  color: "#64748b",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {session?.user.email ?? ""}
              </motion.span>
            )}
          </AnimatePresence>

          <Tooltip title="Log out" placement={collapsed ? "right" : "top"}>
            <IconButton
              size="small"
              onClick={handleLogout}
              data-testid="logout-button"
              sx={{
                color: "#64748b",
                flexShrink: 0,
                "&:hover": { color: "#fb7185", bgcolor: "rgba(244,63,94,0.08)" },
                borderRadius: "6px",
                width: 28,
                height: 28,
              }}
              aria-label="Log out"
            >
              <LogoutIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </motion.aside>
  );
}

/* ---- Mobile drawer variant ---- */
import Drawer from "@mui/material/Drawer";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileDrawerProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleNavigate(path: string) {
    navigate(path);
    onClose();
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function isActive(path: string) {
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: 280,
          background: "#0d1526",
          borderRight: "1px solid rgba(148,163,184,0.08)",
        },
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(4px)",
          backgroundColor: "rgba(6,11,24,0.7)",
        },
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          height: 52,
          display: "flex",
          alignItems: "center",
          px: "20px",
          borderBottom: "1px solid rgba(148,163,184,0.06)",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            component="span"
            sx={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: "13px",
              color: "#fff",
            }}
          >
            I
          </Box>
        </Box>
        <Box
          sx={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: "15px",
            color: "#f1f5f9",
            letterSpacing: "-0.01em",
          }}
        >
          IoT Platform
        </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, py: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Box
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mx: 1,
                px: "10px",
                py: "10px",
                borderRadius: "8px",
                cursor: "pointer",
                position: "relative",
                color: active ? "#f1f5f9" : "#94a3b8",
                fontWeight: active ? 600 : 400,
                bgcolor: active ? "rgba(99,102,241,0.12)" : "transparent",
                "&:hover": { bgcolor: "rgba(148,163,184,0.06)", color: "#f1f5f9" },
                ...(active && {
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: "20%",
                    bottom: "20%",
                    width: "3px",
                    borderRadius: "0 3px 3px 0",
                    background: "linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)",
                  },
                }),
              }}
            >
              <Box sx={{ color: active ? "#818cf8" : "inherit", display: "flex" }}>
                {item.icon}
              </Box>
              <Box
                sx={{
                  fontFamily: "Manrope, sans-serif",
                  fontSize: "14px",
                }}
              >
                {item.label}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* User */}
      <Box
        sx={{
          borderTop: "1px solid rgba(148,163,184,0.06)",
          p: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: "10px",
            py: "8px",
          }}
        >
          <Avatar
            sx={{
              width: 28,
              height: 28,
              fontSize: "11px",
              fontWeight: 600,
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            }}
          >
            {session?.user.email?.[0]?.toUpperCase() ?? "?"}
          </Avatar>
          <Box
            sx={{
              fontFamily: "Manrope, sans-serif",
              fontSize: "12px",
              color: "#64748b",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {session?.user.email ?? ""}
          </Box>
          <IconButton
            size="small"
            onClick={handleLogout}
            data-testid="logout-button-mobile"
            sx={{
              color: "#64748b",
              "&:hover": { color: "#fb7185", bgcolor: "rgba(244,63,94,0.08)" },
              borderRadius: "6px",
            }}
            aria-label="Log out"
          >
            <LogoutIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
}
