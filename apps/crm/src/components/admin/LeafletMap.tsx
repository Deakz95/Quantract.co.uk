"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPin } from "./JobsMap";

const STATUS_COLORS: Record<string, string> = {
  quoted: "#9333ea",
  scheduled: "#2563eb",
  in_progress: "#ea580c",
  completed: "#16a34a",
  new: "#eab308",
};

function pinColor(pin: MapPin): string {
  if (pin.type === "enquiry") return STATUS_COLORS.new;
  if (pin.type === "quote") return "#a855f7";
  return STATUS_COLORS[pin.status] || "#6b7280";
}

function createIcon(color: string) {
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
    html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="9" r="2.5" fill="#fff"/>
    </svg>`,
  });
}

export default function LeafletMap({ pins, onPinClick }: { pins: MapPin[]; onPinClick?: (pin: MapPin) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
    }).setView([54.5, -2], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Leaflet needs invalidateSize when mounted inside cards/tabs that may
    // not have their final dimensions at initial render time.
    requestAnimationFrame(() => map.invalidateSize());
    setTimeout(() => map.invalidateSize(), 250);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Update markers when pins change
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const markers: L.Marker[] = [];
    for (const pin of pins) {
      const marker = L.marker([pin.lat, pin.lng], { icon: createIcon(pinColor(pin)) });

      if (onPinClick) {
        marker.on("click", () => onPinClick(pin));
      } else {
        marker.bindPopup(
          `<div style="font-family:system-ui;font-size:13px;">
            <strong>${pin.label}</strong><br/>
            <span style="text-transform:capitalize;color:#666;">${pin.status.replace(/_/g, " ")}</span><br/>
            <a href="${pin.href}" style="color:#2563eb;text-decoration:underline;font-size:12px;">Open</a>
          </div>`
        );
      }

      layer.addLayer(marker);
      markers.push(marker);
    }

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [pins, onPinClick]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden h-[320px] md:h-[420px]"
    />
  );
}
