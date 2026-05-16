import Box from "@mui/material/Box";
import { StatusBadge } from "./StatusBadge";

type Status = "online" | "offline" | "warning" | "unknown";

interface AlertTimelineItemProps {
  status: Status;
  name: string;
  location?: string | null;
  timeAgo: string;
  onClick?: () => void;
}

const BORDER_COLOR: Record<Status, string> = {
  online: "#10b981",
  warning: "#f59e0b",
  offline: "#f43f5e",
  unknown: "#64748b",
};

export function AlertTimelineItem({
  status,
  name,
  location,
  timeAgo,
  onClick,
}: AlertTimelineItemProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        py: "10px",
        px: "12px",
        borderLeft: `3px solid ${BORDER_COLOR[status]}`,
        borderRadius: "0 8px 8px 0",
        cursor: onClick ? "pointer" : "default",
        transition: "background 120ms",
        "&:hover": onClick ? { bgcolor: "rgba(148,163,184,0.04)" } : {},
        mb: 0.5,
      }}
    >
      <StatusBadge status={status} size="sm" />

      <Box
        sx={{
          fontFamily: "Manrope, sans-serif",
          fontSize: "13px",
          color: "#f1f5f9",
          fontWeight: 500,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </Box>

      {location && (
        <Box
          sx={{
            fontFamily: "Manrope, sans-serif",
            fontSize: "12px",
            color: "#64748b",
            display: { xs: "none", sm: "block" },
            whiteSpace: "nowrap",
          }}
        >
          {location}
        </Box>
      )}

      <Box
        sx={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "11px",
          color: "#475569",
          whiteSpace: "nowrap",
          minWidth: 60,
          textAlign: "right",
        }}
      >
        {timeAgo}
      </Box>
    </Box>
  );
}
