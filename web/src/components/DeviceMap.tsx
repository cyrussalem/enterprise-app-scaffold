import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import Box from "@mui/material/Box";
import type { Device } from "../api/devices";

const STATUS_COLOR: Record<string, string> = {
  online: "#10b981",
  offline: "#f43f5e",
  warning: "#f59e0b",
};

const STATUS_GLOW: Record<string, string> = {
  online: "rgba(16,185,129,0.5)",
  offline: "rgba(244,63,94,0.5)",
  warning: "rgba(245,158,11,0.5)",
};

type PinnedDevice = Device & { latitude: number; longitude: number };

function markerHtml(status: string): string {
  const color = STATUS_COLOR[status] ?? "#64748b";
  const glow = STATUS_GLOW[status] ?? "rgba(100,116,139,0.3)";
  const pulse = status === "online";
  return `
    <div style="
      position:relative;
      width:14px;
      height:14px;
    ">
      ${pulse ? `<div style="
        position:absolute;
        inset:-5px;
        border-radius:50%;
        border:2px solid ${color};
        opacity:0.4;
        animation:marker-pulse 2s ease-in-out infinite;
      "></div>` : ""}
      <div style="
        position:absolute;
        inset:0;
        border-radius:50%;
        background:${color};
        border:2px solid rgba(255,255,255,0.7);
        box-shadow:0 0 8px ${glow}, 0 0 16px ${glow};
      "></div>
    </div>
  `;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (positions.length > 0 && !fitted.current) {
      fitted.current = true;
      map.fitBounds(positions as LatLngBoundsExpression, { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
}

function Markers({ devices, onNavigate }: { devices: PinnedDevice[]; onNavigate: (id: string) => void }) {
  const map = useMap();

  useEffect(() => {
    const markers: L.Marker[] = [];

    devices.forEach((device) => {
      const icon = L.divIcon({
        className: "",
        html: markerHtml(device.status),
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
      });

      const marker = L.marker([device.latitude, device.longitude], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:Manrope,sans-serif;font-size:12px;color:#f1f5f9;background:#111d35;border-radius:8px;padding:2px">
            <strong>${device.name}</strong><br/>
            ${device.location_label ?? "Unknown"}<br/>
            <span style="color:${STATUS_COLOR[device.status] ?? '#64748b'}">${device.status}</span>
          </div>`,
          { className: "dark-popup" }
        );

      marker.on("click", () => onNavigate(device.id));
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [devices, map, onNavigate]);

  return null;
}

interface DeviceMapProps {
  devices: Device[];
  height?: number;
  radarColor?: string;
}

export function DeviceMap({ devices, height = 420, radarColor }: DeviceMapProps) {
  const navigate = useNavigate();

  const pinned = devices.filter(
    (d): d is PinnedDevice => d.latitude != null && d.longitude != null
  );
  const positions: [number, number][] = pinned.map((d) => [d.latitude, d.longitude]);

  const dominantStatus = devices.some((d) => d.status === "offline")
    ? "offline"
    : devices.some((d) => d.status === "warning")
    ? "warning"
    : "online";

  const effectColor = radarColor ?? STATUS_GLOW[dominantStatus] ?? "rgba(99,102,241,0.4)";

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: "14px",
        overflow: "hidden",
        height,
        "& .leaflet-container": {
          height: "100%",
          width: "100%",
          borderRadius: "14px",
          background: "#060b18",
        },
        "& .dark-popup .leaflet-popup-content-wrapper": {
          background: "#111d35",
          border: "1px solid rgba(148,163,184,0.14)",
          borderRadius: "8px",
          color: "#f1f5f9",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        },
        "& .dark-popup .leaflet-popup-tip": {
          background: "#111d35",
        },
        "@keyframes marker-pulse": {
          "0%, 100%": { opacity: 0.4, transform: "scale(1)" },
          "50%": { opacity: 0, transform: "scale(2)" },
        },
      }}
    >
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />
        {positions.length > 0 && <FitBounds positions={positions} />}
        <Markers devices={pinned} onNavigate={(id) => navigate(`/devices/${id}`)} />
      </MapContainer>

      {/* Radar sweep overlay */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "min(50%, 300px)",
          aspectRatio: "1",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 500,
          background: `radial-gradient(circle, ${effectColor} 0%, transparent 70%)`,
          animation: "radar-expand 4s ease-out infinite",
          animationDelay: "1s",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "min(30%, 180px)",
          aspectRatio: "1",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 500,
          background: `radial-gradient(circle, ${effectColor} 0%, transparent 70%)`,
          animation: "radar-expand 4s ease-out infinite",
          animationDelay: "3s",
        }}
      />
    </Box>
  );
}
