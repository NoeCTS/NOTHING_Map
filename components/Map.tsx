"use client";

import { useMemo, useState } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Rectangle,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMapEvents,
} from "react-leaflet";
import { HeatmapLayer } from "@/components/HeatmapLayer";
import {
  HeatmapPoint,
  LocationCategory,
  LocationsData,
  ModeId,
  Neighbourhood,
} from "@/components/types";
import {
  MODES,
  computeDynamicBounds,
  heatOpacity,
  isOohCategory,
  scoreForMode,
} from "@/lib/groundSignal";

interface GroundSignalMapProps {
  activeMode: ModeId;
  gapAnalysisEnabled: boolean;
  heatmapEnabled: boolean;
  heatmapPoints: HeatmapPoint[];
  locations: LocationsData;
  markersVisible: boolean;
  neighbourhoods: Neighbourhood[];
  radiusOverlay: boolean;
  selectedZoneName: string;
  visibleLayers: Record<LocationCategory, boolean>;
  onSelectZone: (zoneName: string) => void;
}

const MARKER_CLASSNAME: Record<LocationCategory, string> = {
  retail: "marker-retail",
  galleries: "marker-gallery",
  agencies: "marker-creative",
  coworking: "marker-secondary",
  venues: "marker-secondary",
  schools: "marker-secondary",
  ubahn_poster: "marker-ooh-poster",
  ubahn_special: "marker-ooh-special",
  bridge_banner: "marker-ooh-bridge",
  street_furniture: "marker-ooh-street",
};

const CATEGORY_LABELS: Record<LocationCategory, string> = {
  retail: "Retail",
  galleries: "Gallery",
  agencies: "Creative Agency",
  coworking: "Coworking",
  venues: "Venue",
  schools: "School",
  ubahn_poster: "U-Bahn Poster",
  ubahn_special: "U-Bahn Premium",
  bridge_banner: "Bridge Banner",
  street_furniture: "Street Furniture",
};

// OOH markers only render at this zoom level or higher to avoid CPU meltdown
const OOH_ZOOM_THRESHOLD = 14;

export function GroundSignalMap({
  activeMode,
  gapAnalysisEnabled,
  heatmapEnabled,
  heatmapPoints,
  locations,
  markersVisible,
  neighbourhoods,
  radiusOverlay,
  selectedZoneName,
  visibleLayers,
  onSelectZone,
}: GroundSignalMapProps) {
  const icons = useMemo(() => {
    return Object.entries(MARKER_CLASSNAME).reduce((accumulator, [category, className]) => {
      accumulator[category as LocationCategory] = L.divIcon({
        className: "signal-marker-shell",
        html: `<span class="map-marker ${className}"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      return accumulator;
    }, {} as Record<LocationCategory, L.DivIcon>);
  }, []);

  const modeMeta = MODES.find((mode) => mode.id === activeMode);
  const sortedZones = neighbourhoods
    .slice()
    .sort((left, right) => scoreForMode(left, activeMode) - scoreForMode(right, activeMode));

  return (
    <div className="map-panel">
      <div className="map-bg-grid" />

      <div className="map-overlay glass-panel">
        <div className="map-overlay-top">
          <span className="map-mode-chip">ACTIVE</span>
          <span className="map-tile-label">{activeMode.toUpperCase()} / CARTO DARK MATTER</span>
        </div>
        <h2 className="map-title">{modeMeta?.label ?? "Berlin Signal Map"}</h2>
        <p className="map-caption">
          {modeMeta?.blurb ?? "Dynamic zone scoring and layer visibility are driving the map state."}
        </p>
      </div>

      <div className="map-coords">
        LAT: 52.5200&deg; N &nbsp;|&nbsp; LNG: 13.4050&deg; E
      </div>

      <div className="map-crosshair">
        <div className="map-crosshair-h" />
        <div className="map-crosshair-v" />
      </div>

      <div className="map-wrap" id="ground-signal-map-capture">
        <MapContainer
          center={[52.52, 13.405]}
          className="signal-map"
          zoom={12}
          zoomControl={false}
        >
          <ZoomControl position="bottomleft" />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
            crossOrigin="anonymous"
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {heatmapEnabled ? <HeatmapLayer points={heatmapPoints} /> : null}

          {sortedZones.map((zone) => {
            const score = scoreForMode(zone, activeMode);
            const selected = zone.name === selectedZoneName;
            const dynamicBounds = computeDynamicBounds(zone, locations, visibleLayers);

            return (
              <Rectangle
                key={zone.name}
                bounds={dynamicBounds}
                eventHandlers={{
                  click: () => onSelectZone(zone.name),
                }}
                pathOptions={{
                  color: borderColor(zone, selected, gapAnalysisEnabled),
                  weight: selected ? 1.6 : 1.1,
                  dashArray: zone.gapAnalysis?.status === "balanced" ? "8 7" : undefined,
                  fillColor: "#E02128",
                  fillOpacity: selected ? heatOpacity(score) + 0.06 : heatOpacity(score),
                }}
              >
                <Tooltip direction="top" opacity={1} sticky>
                  <div className="map-tooltip">
                    <strong>{zone.name}</strong>
                    <span>{score} / 100</span>
                  </div>
                </Tooltip>
              </Rectangle>
            );
          })}

          {radiusOverlay
            ? locations.retail.flatMap((point) => [
                <Circle
                  key={`radius-500-${point.name}`}
                  center={[point.lat, point.lng]}
                  pathOptions={{
                    color: "#E02128",
                    fillColor: "#E02128",
                    fillOpacity: 0.02,
                    opacity: 0.7,
                    weight: 1.4,
                  }}
                  radius={500}
                />,
                <Circle
                  key={`radius-1000-${point.name}`}
                  center={[point.lat, point.lng]}
                  pathOptions={{
                    color: "#E02128",
                    fillColor: "#E02128",
                    fillOpacity: 0.01,
                    opacity: 0.22,
                    weight: 1,
                  }}
                  radius={1000}
                />,
              ])
            : null}

          <ZoomAwareMarkers
            heatmapEnabled={heatmapEnabled}
            icons={icons}
            locations={locations}
            markersVisible={markersVisible}
            neighbourhoods={neighbourhoods}
            visibleLayers={visibleLayers}
            onSelectZone={onSelectZone}
          />
        </MapContainer>
      </div>
    </div>
  );
}

function ZoomAwareMarkers({
  heatmapEnabled,
  icons,
  locations,
  markersVisible,
  neighbourhoods,
  visibleLayers,
  onSelectZone,
}: {
  heatmapEnabled: boolean;
  icons: Record<LocationCategory, L.DivIcon>;
  locations: LocationsData;
  markersVisible: boolean;
  neighbourhoods: Neighbourhood[];
  visibleLayers: Record<LocationCategory, boolean>;
  onSelectZone: (zoneName: string) => void;
}) {
  const [zoom, setZoom] = useState(12);

  useMapEvents({
    zoomend: (event) => {
      setZoom(event.target.getZoom());
    },
  });

  if (!markersVisible) {
    return null;
  }

  const showOoh = zoom >= OOH_ZOOM_THRESHOLD;

  return (
    <>
      {(Object.entries(locations) as [LocationCategory, LocationsData[LocationCategory]][]).map(
        ([category, points]) => {
          if (!visibleLayers[category]) return null;

          // Skip OOH categories when zoomed out
          if (isOohCategory(category) && !showOoh) return null;

          return points.map((point, idx) => (
            <Marker
              key={`${category}-${idx}-${point.name}`}
              eventHandlers={{
                click: () => {
                  if (point.area && neighbourhoods.some((zone) => zone.name === point.area)) {
                    onSelectZone(point.area);
                  }
                },
              }}
              icon={icons[category]}
              opacity={heatmapEnabled ? 0.28 : 1}
              position={[point.lat, point.lng]}
            >
              <Tooltip direction="top" opacity={1}>
                <div className="map-tooltip">
                  <strong>{point.name}</strong>
                  <span>{CATEGORY_LABELS[category]}</span>
                </div>
              </Tooltip>
            </Marker>
          ));
        },
      )}
    </>
  );
}

function borderColor(
  zone: Neighbourhood,
  selected: boolean,
  gapAnalysisEnabled: boolean,
) {
  if (!gapAnalysisEnabled || !zone.gapAnalysis) {
    return selected ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.3)";
  }

  if (zone.gapAnalysis.status === "opportunity") {
    return selected ? "rgba(34,197,94,0.95)" : "rgba(34,197,94,0.75)";
  }

  if (zone.gapAnalysis.status === "oversaturated") {
    return selected ? "rgba(245,158,11,0.95)" : "rgba(245,158,11,0.75)";
  }

  return selected ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.35)";
}
