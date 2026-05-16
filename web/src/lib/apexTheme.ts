import type { ApexOptions } from "apexcharts";

export const darkChartBase: ApexOptions = {
  chart: {
    background: "transparent",
    foreColor: "#94a3b8",
    toolbar: { show: false },
    animations: { enabled: true, speed: 400 },
    fontFamily: "Manrope, sans-serif",
  },
  grid: {
    borderColor: "rgba(148,163,184,0.08)",
    strokeDashArray: 4,
  },
  tooltip: {
    theme: "dark",
    style: { fontSize: "12px", fontFamily: "Manrope, sans-serif" },
  },
  legend: {
    fontFamily: "Manrope, sans-serif",
    fontSize: "12px",
    labels: { colors: "#94a3b8" },
  },
  xaxis: {
    labels: { style: { colors: "#64748b", fontFamily: "Manrope, sans-serif" } },
    axisBorder: { color: "rgba(148,163,184,0.12)" },
    axisTicks: { color: "rgba(148,163,184,0.12)" },
  },
  yaxis: {
    labels: { style: { colors: "#64748b", fontFamily: "Manrope, sans-serif" } },
  },
};
