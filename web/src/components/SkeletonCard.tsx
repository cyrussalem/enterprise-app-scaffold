import Box from "@mui/material/Box";

interface SkeletonCardProps {
  height?: number | string;
  lines?: number;
}

const shimmerBg = `linear-gradient(
  90deg,
  rgba(148,163,184,0.04) 0px,
  rgba(148,163,184,0.10) 80px,
  rgba(148,163,184,0.04) 160px
)`;

export function SkeletonCard({ height = 120, lines = 0 }: SkeletonCardProps) {
  return (
    <Box
      sx={{
        background: "#111d35",
        border: "1px solid rgba(148,163,184,0.08)",
        borderRadius: "14px",
        padding: "20px",
        height,
        overflow: "hidden",
      }}
    >
      {lines > 0
        ? Array.from({ length: lines }).map((_, i) => (
            <Box
              key={i}
              sx={{
                height: 12,
                borderRadius: "4px",
                mb: 1.5,
                width: i === lines - 1 ? "60%" : "100%",
                backgroundImage: shimmerBg,
                backgroundSize: "600px 100%",
                animation: "skeleton-wave 1.6s ease-in-out infinite",
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))
        : null}

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          borderRadius: "14px",
          backgroundImage: shimmerBg,
          backgroundSize: "600px 100%",
          animation: "skeleton-wave 1.6s ease-in-out infinite",
          opacity: lines > 0 ? 0 : 1,
        }}
      />
    </Box>
  );
}
