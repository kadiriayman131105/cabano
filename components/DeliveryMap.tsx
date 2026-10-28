"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = { lat: number; lng: number };

type DeliveryMapProps = {
  center: Point;
  value: Point | null;
  onChange?: (point: Point) => void;
  interactive?: boolean;
};

type LeafletLib = typeof import("leaflet");

const pinCss = `
.cabano-map.leaflet-container { background: #d6e6f2; font-family: inherit; }
.cabano-map img { max-width: none; max-height: none; }
.leaflet-div-icon.cabano-pin { background: transparent; border: 0; }
.cabano-pin-dot {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 50% 50% 50% 0;
  background: #b22c4c;
  border: 3px solid #fff;
  transform: rotate(-45deg);
  box-shadow: 0 2px 6px rgba(10, 20, 40, 0.35);
}
`;

function pinIcon(L: LeafletLib) {
  return L.divIcon({
    className: "cabano-pin",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    html: '<span class="cabano-pin-dot"></span>',
  });
}

function placeMarker(
  L: LeafletLib,
  map: LeafletMap,
  markerRef: { current: Marker | null },
  point: Point,
  interactive: boolean,
  onDrag: (point: Point) => void,
) {
  const existing = markerRef.current;
  if (existing) {
    existing.setLatLng([point.lat, point.lng]);
    return;
  }
  const marker = L.marker([point.lat, point.lng], {
    icon: pinIcon(L),
    draggable: interactive,
    autoPan: interactive,
  }).addTo(map);
  marker.on("dragend", () => {
    const next = marker.getLatLng();
    onDrag({ lat: next.lat, lng: next.lng });
  });
  markerRef.current = marker;
}

async function loadLeaflet(): Promise<LeafletLib> {
  const mod = await import("leaflet");
  return mod.default ?? mod;
}

export function DeliveryMap({ center, value, onChange, interactive = true }: DeliveryMapProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const centerRef = useRef(center);
  const fromMapRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
    centerRef.current = center;
  }, [center, onChange, value]);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    let disposed = false;
    let map: LeafletMap | undefined;

    void loadLeaflet().then((L) => {
      if (disposed) return;
      const current = valueRef.current;
      const start = current ?? centerRef.current;
      map = L.map(node, { scrollWheelZoom: false }).setView(
        [start.lat, start.lng],
        current ? 16 : 14,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const onDrag = (point: Point) => {
        fromMapRef.current = true;
        onChangeRef.current?.(point);
      };

      if (interactive) {
        map.on("click", (event) => {
          fromMapRef.current = true;
          onChangeRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
        });
      }

      mapRef.current = map;
      if (current) placeMarker(L, map, markerRef, current, interactive, onDrag);
      requestAnimationFrame(() => {
        if (!disposed) map?.invalidateSize();
      });
    });

    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    const fly = !fromMapRef.current;
    fromMapRef.current = false;
    void loadLeaflet().then((L) => {
      if (mapRef.current !== map) return;
      placeMarker(L, map, markerRef, value, interactive, (point) => {
        fromMapRef.current = true;
        onChangeRef.current?.(point);
      });
      if (fly) map.flyTo([value.lat, value.lng], 16, { duration: 0.45 });
    });
  }, [interactive, value]);

  return (
    <div className="h-64 overflow-hidden rounded-2xl border border-ink/15">
      <style>{pinCss}</style>
      <div
        ref={nodeRef}
        className="cabano-map relative z-0 h-full w-full isolate"
        role="application"
        aria-label="Carte de livraison. Touchez pour placer le point."
      />
    </div>
  );
}
