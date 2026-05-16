import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import Box from "@mui/material/Box";

const CX = 100;
const CY = 115;
const R = 72;
const STROKE = 14;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function arcPoint(angleDeg: number) {
  return {
    x: CX + R * Math.cos(toRad(angleDeg)),
    y: CY + R * Math.sin(toRad(angleDeg)),
  };
}

function buildArc(pct: number): string {
  if (pct <= 0) return "";
  const safePct = Math.min(pct, 99.9);
  const fillAngle = 180 + (safePct / 100) * 180;
  const start = arcPoint(180);
  const end = arcPoint(fillAngle);
  const large = safePct > 50 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    function tick(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return val;
}

function gaugeColor(pct: number) {
  if (pct >= 80) return "#10b981";
  if (pct >= 50) return "#f59e0b";
  return "#f43f5e";
}


interface MetricGaugeProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  displayValue?: string;
}

export function MetricGauge({ label, value, max, unit = "", displayValue }: MetricGaugeProps) {
  const shouldReduceMotion = useReducedMotion();
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  const animatedPct = useCountUp(shouldReduceMotion ? pct : pct, 700);
  const animatedValue = useCountUp(shouldReduceMotion ? value : value, 700);

  const color = gaugeColor(pct);
  const trackStart = arcPoint(180);
  const trackEnd = arcPoint(0);
  const trackPath = `M ${trackStart.x.toFixed(2)} ${trackStart.y.toFixed(2)} A ${R} ${R} 0 0 1 ${trackEnd.x.toFixed(2)} ${trackEnd.y.toFixed(2)}`;

  const shown = displayValue ?? `${animatedValue}${unit}`;

  return (
    <Box sx={{ textAlign: "center" }}>
      <svg
        viewBox="0 0 200 150"
        style={{ width: "100%", maxWidth: 180, display: "block", margin: "0 auto" }}
        aria-hidden="true"
      >
        <defs>
          <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgba(148,163,184,0.10)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {animatedPct > 0 && (
          <path
            d={buildArc(animatedPct)}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            filter={`url(#glow-${label})`}
          />
        )}

        {/* Center value */}
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 26,
            fill: color,
            letterSpacing: "-0.03em",
          }}
        >
          {shown}
        </text>

        {/* Label */}
        <text
          x={CX}
          y={CY + 20}
          textAnchor="middle"
          style={{
            fontFamily: "Manrope, sans-serif",
            fontWeight: 500,
            fontSize: 11,
            fill: "#64748b",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {label.toUpperCase()}
        </text>
      </svg>

      {/* Glow badge */}
      <Box
        sx={{
          display: "inline-block",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "10px",
          color: "#64748b",
          mt: 0.5,
        }}
      >
        {animatedPct}%
      </Box>
    </Box>
  );
}
