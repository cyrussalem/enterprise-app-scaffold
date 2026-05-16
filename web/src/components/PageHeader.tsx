import type { ReactNode } from "react";
import Box from "@mui/material/Box";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 2,
        mb: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
        }}
      >
        {/* Gradient accent bar */}
        <Box
          sx={{
            width: "3px",
            alignSelf: "stretch",
            minHeight: subtitle ? 44 : 32,
            borderRadius: "2px",
            background: "linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)",
            flexShrink: 0,
            mt: "2px",
          }}
        />
        <Box>
          <Box
            sx={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: "1.5rem",
              color: "#f1f5f9",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {title}
          </Box>
          {subtitle && (
            <Box
              sx={{
                fontFamily: "Manrope, sans-serif",
                fontSize: "13px",
                color: "#64748b",
                mt: "4px",
              }}
            >
              {subtitle}
            </Box>
          )}
        </Box>
      </Box>

      {actions && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
