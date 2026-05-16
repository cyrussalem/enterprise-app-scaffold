import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { GlassCard } from "./GlassCard";

interface ErrorCardProps {
  message?: string;
  detail?: string;
  onRetry?: () => void;
}

export function ErrorCard({
  message = "Could not load data",
  detail,
  onRetry,
}: ErrorCardProps) {
  return (
    <GlassCard glow="offline" sx={{ textAlign: "center", py: 5, px: 4 }}>
      <WarningAmberRoundedIcon
        sx={{ fontSize: 36, color: "#f43f5e", mb: 1.5, opacity: 0.8 }}
      />
      <Box
        sx={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 600,
          fontSize: "15px",
          color: "#f1f5f9",
          mb: 0.75,
        }}
      >
        {message}
      </Box>
      {detail && (
        <Box
          sx={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "11px",
            color: "#64748b",
            mb: 2,
          }}
        >
          {detail}
        </Box>
      )}
      {onRetry && (
        <Button
          variant="outlined"
          size="small"
          onClick={onRetry}
          sx={{
            borderColor: "rgba(244,63,94,0.3)",
            color: "#f43f5e",
            "&:hover": {
              borderColor: "rgba(244,63,94,0.5)",
              bgcolor: "rgba(244,63,94,0.08)",
            },
          }}
        >
          Try again
        </Button>
      )}
    </GlassCard>
  );
}
