import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { Device } from "../api/devices";

const STATUS_COLOR: Record<string, string> = {
  online: "#4caf50",
  offline: "#f44336",
  warning: "#ff9800",
};

type PinnedDevice = Device & { latitude: number; longitude: number };

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions as LatLngBoundsExpression, { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
}

export function DeviceMap({ devices }: { devices: Device[] }) {
  const navigate = useNavigate();

  const pinned = devices.filter(
    (d): d is PinnedDevice => d.latitude != null && d.longitude != null
  );

  const positions: [number, number][] = pinned.map((d) => [d.latitude, d.longitude]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "420px", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.length > 0 && <FitBounds positions={positions} />}
      {pinned.map((device) => (
        <CircleMarker
          key={device.id}
          center={[device.latitude, device.longitude]}
          radius={9}
          pathOptions={{
            fillColor: STATUS_COLOR[device.status] ?? "#9e9e9e",
            fillOpacity: 0.85,
            color: "#fff",
            weight: 1.5,
          }}
          eventHandlers={{
            click: () => navigate(`/devices/${device.id}`),
          }}
        >
          <Popup>
            <strong>{device.name}</strong>
            <br />
            {device.location_label ?? "Unknown location"}
            <br />
            Status: {device.status}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
