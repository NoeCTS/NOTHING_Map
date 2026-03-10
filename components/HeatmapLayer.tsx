"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "react-leaflet";
import { HeatmapPoint } from "@/components/types";

interface HeatmapLayerProps {
  points: HeatmapPoint[];
}

export const HeatmapLayer = memo(function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);
  const latLngs = useMemo(
    () => points.map((point) => [point.lat, point.lng, point.intensity] as [number, number, number]),
    [points],
  );

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = L.heatLayer([], {
        radius: 16,
        blur: 14,
        minOpacity: 0.25,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.0: "rgba(5,5,5,0)",
          0.15: "#1a0608",
          0.35: "#8B1114",
          0.55: "#E02128",
          0.75: "#ff4444",
          0.9: "#ff8888",
          1: "#ffffff",
        },
      }).addTo(map);
    }

    if (!latLngs.length || !layerRef.current) {
      layerRef.current?.setLatLngs([]);
      return;
    }

    layerRef.current.setLatLngs(latLngs).redraw();
  }, [latLngs, map]);

  useEffect(() => {
    return () => {
      layerRef.current?.remove();
      layerRef.current = null;
    };
  }, []);

  return null;
});
