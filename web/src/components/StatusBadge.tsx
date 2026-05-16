import Box from "@mui/material/Box";

type Status = "online" | "offline" | "warning" | "unknown";

const STATUS_CONFIG: Record<
  Status,
  { label: string; color: string; bg: string; border: string }
> = {
  online: {
    label: "Online",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
  },
  warning: {
    label: "Warning",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
  },
  offline: {
    label: "Offline",
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.12)",
    border: "rgba(244,63,94,0.3)",
  },
  unknown: {
    label: "Unknown",
    color: "#64748b",
    bg: "rgba(100,116,139,0.10)",
    border: "rgba(100,116,139,0.2)",
  },
};

interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md";
  pulse?: boolean;
}

export function StatusBadge({ status, size = "md", pulse }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const shouldPulse = pulse ?? status === "online";
  const dotSize = size === "sm" ? 7 : 8;
  const fontSize = size === "sm" ? "10px" : "11px";
  const px = size === "sm" ? "7px" : "9px";
  const py = size === "sm" ? "3px" : "4px";

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        px,
        py,
        borderRadius: "9999px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      {/* Indicator dot */}
      <Box sx={{ position: "relative", width: dotSize, height: dotSize, flexShrink: 0 }}>
        {shouldPulse && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: cfg.color,
              animation: "pulse-dot 2s ease-in-out infinite",
              opacity: 0.6,
            }}
          />
        )}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: cfg.color,
            boxShadow: `0 0 ${dotSize}px ${cfg.color}`,
          }}
        />
      </Box>

      <Box
        sx={{
          fontFamily: "Manrope, sans-serif",
          fontSize,
          fontWeight: 600,
          color: cfg.color,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {cfg.label}
      </Box>
    </Box>
  );
}
