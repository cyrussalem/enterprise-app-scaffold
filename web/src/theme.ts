import { createTheme } from "@mui/material/styles";
import { noiseDataUri } from "./lib/noiseTexture";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6366f1", light: "#818cf8", dark: "#4f46e5" },
    secondary: { main: "#f59e0b", light: "#fbbf24", dark: "#d97706" },
    success: { main: "#10b981", light: "#34d399", dark: "#059669" },
    warning: { main: "#f59e0b", light: "#fbbf24", dark: "#d97706" },
    error: { main: "#f43f5e", light: "#fb7185", dark: "#e11d48" },
    info: { main: "#38bdf8", light: "#7dd3fc", dark: "#0284c7" },
    background: { default: "#060b18", paper: "#111d35" },
    text: { primary: "#f1f5f9", secondary: "#94a3b8", disabled: "#475569" },
    divider: "rgba(148,163,184,0.10)",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "Manrope, system-ui, Arial, sans-serif",
    h1: {
      fontFamily: "Syne, sans-serif",
      fontSize: "2rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontFamily: "Syne, sans-serif",
      fontSize: "1.5rem",
      fontWeight: 600,
      letterSpacing: "-0.015em",
    },
    h3: {
      fontFamily: "Syne, sans-serif",
      fontSize: "1.125rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h4: {
      fontFamily: "Syne, sans-serif",
      fontSize: "1.5rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h5: {
      fontFamily: "Syne, sans-serif",
      fontSize: "1.25rem",
      fontWeight: 600,
    },
    h6: {
      fontFamily: "Syne, sans-serif",
      fontSize: "1rem",
      fontWeight: 600,
    },
    body1: { fontSize: "0.875rem", lineHeight: 1.6 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.6 },
    caption: {
      fontSize: "0.6875rem",
      fontWeight: 500,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
          "&.MuiButton-containedPrimary": {
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            boxShadow: "0 0 0 0 rgba(99,102,241,0)",
            transition: "box-shadow 200ms, transform 120ms",
            "&:hover": {
              boxShadow: "0 0 20px rgba(99,102,241,0.4)",
              transform: "translateY(-1px)",
            },
            "&:active": { transform: "translateY(0)" },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#111d35",
          border: "1px solid rgba(148,163,184,0.10)",
          borderRadius: 14,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          "& fieldset": { borderColor: "rgba(148,163,184,0.20)" },
          "&:hover fieldset": { borderColor: "rgba(148,163,184,0.35)" },
          "&.Mui-focused fieldset": {
            borderColor: "#6366f1",
            boxShadow: "0 0 0 3px rgba(99,102,241,0.2)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600, fontSize: "0.6875rem" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: "#94a3b8",
          fontSize: "0.6875rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        },
        body: { borderColor: "rgba(148,163,184,0.08)" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#162040",
          border: "1px solid rgba(148,163,184,0.14)",
          fontSize: "0.75rem",
          borderRadius: 8,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.75rem",
          borderColor: "rgba(148,163,184,0.15)",
          color: "#94a3b8",
          "&.Mui-selected": {
            backgroundColor: "rgba(99,102,241,0.2)",
            color: "#818cf8",
            borderColor: "rgba(99,102,241,0.4)",
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          "&:hover": { backgroundColor: "rgba(148,163,184,0.06)" },
          "&.Mui-selected": { backgroundColor: "rgba(99,102,241,0.15)" },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0d1526",
          borderRight: "1px solid rgba(148,163,184,0.08)",
        },
      },
    },
  },
});

const globalStylesObj = {
  "*, *::before, *::after": { boxSizing: "border-box" },

  "html, body": {
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(148,163,184,0.15) transparent",
  },

  "::-webkit-scrollbar": { width: "6px", height: "6px" },
  "::-webkit-scrollbar-track": { background: "transparent" },
  "::-webkit-scrollbar-thumb": {
    background: "rgba(148,163,184,0.15)",
    borderRadius: "9999px",
  },
  "::-webkit-scrollbar-thumb:hover": {
    background: "rgba(148,163,184,0.28)",
  },

  body: {
    background: "#060b18",
    backgroundImage: `${noiseDataUri}, radial-gradient(ellipse 80% 60% at 75% -10%, rgba(99,102,241,0.07) 0%, transparent 70%)`,
    backgroundAttachment: "fixed",
    minHeight: "100vh",
    opacity: 1,
  },

  "@keyframes pulse-dot": {
    "0%, 100%": { transform: "scale(1)", opacity: 1 },
    "50%": { transform: "scale(1.8)", opacity: 0 },
  },
  "@keyframes shimmer-slide": {
    "0%": { backgroundPosition: "-200% 0" },
    "100%": { backgroundPosition: "200% 0" },
  },
  "@keyframes radar-expand": {
    "0%": { transform: "translate(-50%, -50%) scale(0)", opacity: 0.7 },
    "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
  },
  "@keyframes skeleton-wave": {
    "0%": { backgroundPosition: "-200px 0" },
    "100%": { backgroundPosition: "calc(200px + 100%) 0" },
  },

  ".leaflet-container": {
    background: "#060b18 !important",
    fontFamily: "Manrope, sans-serif",
  },
  ".leaflet-tile-pane": { filter: "brightness(0.9) saturate(0.8)" },
};

export { globalStylesObj };
