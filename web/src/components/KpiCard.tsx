import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Box from "@mui/material/Box";
import { GlassCard } from "./GlassCard";
import { fadeUpIn, instantVariants } from "../motion/variants";

type ColorKey = "primary" | "online" | "warning" | "offline";

const COLOR_MAP: Record<ColorKey, { value: string; glow: string }> = {
  primary: { value: "#818cf8", glow: "rgba(129,140,248,0.25)" },
  online: { value: "#10b981", glow: "rgba(16,185,129,0.25)" },
  warning: { value: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
  offline: { value: "#f43f5e", glow: "rgba(244,63,94,0.25)" },
};

function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | null>(null);
  const prevTarget = useRef(0);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;
    startRef.current = null;

    function tick(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

export interface KpiCardProps {
  label: string;
  value: number;
  color?: ColorKey;
  trend?: number;
  icon?: ReactNode;
}

export function KpiCard({ label, value, color = "primary", icon }: KpiCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const displayValue = useCountUp(shouldReduceMotion ? value : value);
  const cfg = COLOR_MAP[color];

  return (
    <motion.div
      variants={shouldReduceMotion ? instantVariants : fadeUpIn}
      initial="hidden"
      animate="visible"
      style={{ height: "100%" }}
    >
      <GlassCard
        interactive
        sx={{
          textAlign: "center",
          py: 3,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
        }}
      >
        {icon && (
          <Box sx={{ color: cfg.value, mb: 1, opacity: 0.8 }}>{icon}</Box>
        )}

        {/* KPI number with gradient text */}
        <Box
          sx={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 800,
            fontSize: "2.75rem",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            background: `linear-gradient(135deg, ${cfg.value} 0%, #f1f5f9 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "none",
            filter: `drop-shadow(0 0 12px ${cfg.glow})`,
          }}
        >
          {displayValue}
        </Box>

        <Box
          sx={{
            fontFamily: "Manrope, sans-serif",
            fontSize: "11px",
            fontWeight: 500,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </Box>
      </GlassCard>
    </motion.div>
  );
}
