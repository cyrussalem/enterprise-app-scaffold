import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

type GlowVariant = "none" | "brand" | "online" | "warning" | "offline";

const GLOW_STYLES: Record<GlowVariant, object> = {
  none: {},
  brand: {
    boxShadow: "0 0 0 1px rgba(99,102,241,0.3), 0 4px 24px rgba(99,102,241,0.15)",
    borderColor: "rgba(99,102,241,0.4) !important",
  },
  online: {
    boxShadow: "0 0 0 1px rgba(16,185,129,0.3), 0 4px 24px rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.4) !important",
  },
  warning: {
    boxShadow: "0 0 0 1px rgba(245,158,11,0.3), 0 4px 24px rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.4) !important",
  },
  offline: {
    boxShadow: "0 0 0 1px rgba(244,63,94,0.3), 0 4px 24px rgba(244,63,94,0.12)",
    borderColor: "rgba(244,63,94,0.4) !important",
  },
};

interface GlassCardProps {
  children: ReactNode;
  glow?: GlowVariant;
  interactive?: boolean;
  padding?: number | string;
  sx?: SxProps<Theme>;
}

export function GlassCard({
  children,
  glow = "none",
  interactive = false,
  padding = "20px",
  sx,
}: GlassCardProps) {
  return (
    <Box
      sx={{
        background: "#111d35",
        border: "1px solid rgba(148,163,184,0.10)",
        borderRadius: "14px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transition: "box-shadow 200ms ease, border-color 200ms ease, transform 120ms ease",
        padding,
        position: "relative",
        overflow: "hidden",
        ...GLOW_STYLES[glow],
        ...(interactive && {
          cursor: "pointer",
          "&:hover": {
            boxShadow: "0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(148,163,184,0.18)",
            borderColor: "rgba(148,163,184,0.22) !important",
            transform: "translateY(-1px)",
          },
        }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
