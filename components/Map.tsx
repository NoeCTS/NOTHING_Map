"use client";

import { memo, useMemo, useState } from "react";
import L from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { HeatmapLayer } from "@/components/HeatmapLayer";
import {
  ComputedRoute,
  HeatmapPoint,
  LocationCategory,
  LocationPoint,
  LocationsData,
  MarketMeta,
  ModeId,
  Neighbourhood,
  OOHCategory,
  RouteSummary,
  RouteWaypoint,
} from "@/components/types";
import { categoryLabel, getModes } from "@/lib/groundSignal";
import { formatRouteDistance, formatTravelMinutes } from "@/lib/routePlanner";
import { resolvePointZone } from "@/lib/spatial";

interface GroundSignalMapProps {
  activeMode: ModeId;
  computedRoute: ComputedRoute | null;
  gapAnalysisEnabled: boolean;
  heatmapEnabled: boolean;
  heatmapPoints: HeatmapPoint[];
  locations: LocationsData;
  market: MarketMeta;
  markersVisible: boolean;
  neighbourhoods: Neighbourhood[];
  radiusOverlay: boolean;
  routeLoading: boolean;
  routePlannerEnabled: boolean;
  routeSummary: RouteSummary;
  routeWaypoints: RouteWaypoint[];
  visibleLayers: Record<LocationCategory, boolean>;
  onAddWaypoint: (waypoint: RouteWaypoint) => void;
  onSelectZone: (zoneName: string) => void;
}

const MARKER_CLASSNAME: Record<LocationCategory, string> = {
  retail: "marker-retail",
  galleries: "marker-gallery",
  agencies: "marker-creative",
  coworking: "marker-secondary",
  venues: "marker-secondary",
  schools: "marker-secondary",
  competitors: "marker-competitor",
  ubahn_poster: "marker-ooh-poster",
  ubahn_special: "marker-ooh-special",
  bridge_banner: "marker-ooh-bridge",
  street_furniture: "marker-ooh-street",
};

const OOH_ZOOM_THRESHOLD = 14;
const OOH_FULL_DETAIL_ZOOM = 15.5;
const VIEWPORT_PADDING = 0.18;
const BASE_ICON_CATEGORIES: Exclude<LocationCategory, OOHCategory>[] = [
  "retail",
  "galleries",
  "agencies",
  "coworking",
  "venues",
  "schools",
  "competitors",
];

const OOH_STYLE: Record<
  OOHCategory,
  { color: string; fillColor: string; fillOpacity: number; radius: number; weight: number }
> = {
  ubahn_poster: {
    color: "rgba(245, 158, 11, 0.65)",
    fillColor: "#F59E0B",
    fillOpacity: 0.88,
    radius: 3.2,
    weight: 0.6,
  },
  ubahn_special: {
    color: "rgba(217, 70, 239, 0.7)",
    fillColor: "#D946EF",
    fillOpacity: 0.9,
    radius: 3.2,
    weight: 0.65,
  },
  bridge_banner: {
    color: "rgba(6, 182, 212, 0.8)",
    fillColor: "#06B6D4",
    fillOpacity: 0.92,
    radius: 4.6,
    weight: 0.85,
  },
  street_furniture: {
    color: "rgba(132, 204, 22, 0.72)",
    fillColor: "#84CC16",
    fillOpacity: 0.9,
    radius: 4,
    weight: 0.75,
  },
};

interface ViewportState {
  east: number;
  north: number;
  south: number;
  west: number;
  zoom: number;
}

interface RenderPoint {
  category: LocationCategory;
  key: string;
  point: LocationPoint;
  zoneName: string | null;
}

interface AggregatedOohPoint extends RenderPoint {
  aggregateCount: number;
}

export const GroundSignalMap = memo(function GroundSignalMap({
  activeMode,
  computedRoute,
  heatmapEnabled,
  heatmapPoints,
  locations,
  market,
  markersVisible,
  neighbourhoods,
  radiusOverlay,
  routeLoading,
  routePlannerEnabled,
  routeSummary,
  routeWaypoints,
  visibleLayers,
  onAddWaypoint,
  onSelectZone,
}: GroundSignalMapProps) {
  const icons = useMemo(() => {
    return BASE_ICON_CATEGORIES.reduce((accumulator, category) => {
      const className = MARKER_CLASSNAME[category];
      accumulator[category] = L.divIcon({
        className: "signal-marker-shell",
        html: `<span class="map-marker ${className}"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      return accumulator;
    }, {} as Record<Exclude<LocationCategory, OOHCategory>, L.DivIcon>);
  }, []);
  const nothingStoreIcon = useMemo(
    () =>
      L.divIcon({
        className: "signal-marker-shell",
        html: '<span class="map-marker marker-nothing-store"></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    [],
  );

  const modeMeta = getModes(market).find((mode) => mode.id === activeMode);
  const routeSummaryLabel = useMemo(() => {
    if (routeLoading && routeWaypoints.length > 1) {
      return "Calculating walking route...";
    }

    if (routeWaypoints.length < 2) {
      return `${routeWaypoints.length} waypoint${routeWaypoints.length === 1 ? "" : "s"} selected`;
    }

    return `${routeWaypoints.length} waypoints · ${formatRouteDistance(routeSummary.totalDistanceMeters)} · ${formatTravelMinutes(routeSummary.walkingMinutes)} walk`;
  }, [routeLoading, routeSummary.totalDistanceMeters, routeSummary.walkingMinutes, routeWaypoints.length]);

  return (
    <div className="map-panel">
      <div className="map-bg-grid" />

      <div className="map-overlay glass-panel">
        <div className="map-overlay-top">
          <span className="map-mode-chip">ACTIVE</span>
          <span className="map-tile-label">{market.code} / CARTO DARK MATTER</span>
        </div>
        <h2 className="map-title">{modeMeta?.label ?? market.mapTitle}</h2>
        <p className="map-caption">
          {modeMeta?.blurb ?? "Dynamic zone scoring and layer visibility are driving the map state."}
        </p>
      </div>

      <div className="map-coords">{market.coordsLabel}</div>

      {routePlannerEnabled ? (
        <div className="route-map-overlay glass-panel">
          <div className="route-map-kicker">Route Planner</div>
          <div className="route-map-summary">{routeSummaryLabel}</div>
          <p className="route-map-copy">
            {computedRoute?.provider === "osrm"
              ? "The line reflects a routed walking path rather than a straight corridor."
              : "If OSRM is unavailable, the planner falls back to a straight-line estimate."}
          </p>
        </div>
      ) : null}

      <div className="map-crosshair">
        <div className="map-crosshair-h" />
        <div className="map-crosshair-v" />
      </div>

      <div className="map-wrap" id="ground-signal-map-capture">
        <MapContainer
          center={market.center}
          className="signal-map"
          preferCanvas
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
            market={market}
            markersVisible={markersVisible}
            neighbourhoods={neighbourhoods}
            nothingStoreIcon={nothingStoreIcon}
            routePlannerEnabled={routePlannerEnabled}
            routeWaypoints={routeWaypoints}
            visibleLayers={visibleLayers}
            onAddWaypoint={onAddWaypoint}
            onSelectZone={onSelectZone}
          />

          {routeWaypoints.length > 1 ? (
            <Polyline
              pathOptions={{
                color: "#22D3EE",
                dashArray: "10 8",
                lineCap: "round",
                lineJoin: "round",
                opacity: 0.9,
                weight: 4,
              }}
              positions={
                computedRoute?.path.length
                  ? computedRoute.path.map((point) => [point.lat, point.lng] as [number, number])
                  : routeWaypoints.map((waypoint) => [waypoint.lat, waypoint.lng] as [number, number])
              }
            />
          ) : null}

          {routeWaypoints.map((waypoint, index) => (
            <Marker
              key={`route-waypoint-${waypoint.id}`}
              icon={createRouteWaypointIcon(index + 1)}
              position={[waypoint.lat, waypoint.lng]}
            >
              <Tooltip direction="top" opacity={1}>
                <div className="map-tooltip">
                  <strong>
                    {String(index + 1).padStart(2, "0")} {waypoint.name}
                  </strong>
                  <span>{categoryLabel(waypoint.category, market)}</span>
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
});

const ZoomAwareMarkers = memo(function ZoomAwareMarkers({
  heatmapEnabled,
  icons,
  locations,
  market,
  markersVisible,
  neighbourhoods,
  nothingStoreIcon,
  routePlannerEnabled,
  routeWaypoints,
  visibleLayers,
  onAddWaypoint,
  onSelectZone,
}: {
  heatmapEnabled: boolean;
  icons: Record<Exclude<LocationCategory, OOHCategory>, L.DivIcon>;
  locations: LocationsData;
  market: MarketMeta;
  markersVisible: boolean;
  neighbourhoods: Neighbourhood[];
  nothingStoreIcon: L.DivIcon;
  routePlannerEnabled: boolean;
  routeWaypoints: RouteWaypoint[];
  visibleLayers: Record<LocationCategory, boolean>;
  onAddWaypoint: (waypoint: RouteWaypoint) => void;
  onSelectZone: (zoneName: string) => void;
}) {
  const map = useMap();
  const [viewport, setViewport] = useState<ViewportState>(() => getViewportState(map));
  const selectedWaypointIds = useMemo(
    () => new Set(routeWaypoints.map((waypoint) => waypoint.id)),
    [routeWaypoints],
  );

  useMapEvents({
    zoomend: (event) => {
      setViewport(getViewportState(event.target));
    },
    moveend: (event) => {
      setViewport(getViewportState(event.target));
    },
  });

  const showOoh = markersVisible && viewport.zoom >= OOH_ZOOM_THRESHOLD;
  const showOohTooltips = viewport.zoom >= OOH_FULL_DETAIL_ZOOM;

  const baseMarkers = useMemo(
    () =>
      markersVisible
        ? buildRenderPoints({
            categories: BASE_ICON_CATEGORIES,
            locations,
            neighbourhoods,
            viewport,
            visibleLayers,
          })
        : [],
    [locations, markersVisible, neighbourhoods, viewport, visibleLayers],
  );

  const oohMarkers = useMemo(
    () =>
      showOoh
        ? buildRenderPoints({
            categories: ["ubahn_poster", "ubahn_special", "bridge_banner", "street_furniture"],
            locations,
            neighbourhoods,
            viewport,
            visibleLayers,
          })
        : [],
    [locations, neighbourhoods, showOoh, viewport, visibleLayers],
  );

  const renderedOohMarkers = useMemo(
    () => aggregateOohMarkers(oohMarkers, viewport.zoom),
    [oohMarkers, viewport.zoom],
  );

  if (!markersVisible) {
    return null;
  }

  return (
    <>
      {baseMarkers.map(({ category, key, point, zoneName }) => (
        <Marker
          key={key}
          eventHandlers={{
              click: () => {
                if (routePlannerEnabled) {
                  onAddWaypoint(buildRouteWaypoint(category, key, point, zoneName));
                  return;
                }

              if (zoneName) {
                onSelectZone(zoneName);
              }
            },
          }}
          icon={point.type === "nothing_store" ? nothingStoreIcon : icons[category as Exclude<LocationCategory, OOHCategory>]}
          opacity={heatmapEnabled ? 0.24 : 1}
          position={[point.lat, point.lng]}
        >
          <Tooltip direction="top" opacity={1}>
            <div className="map-tooltip">
              <strong>{point.name}</strong>
              <span>
                {point.type === "nothing_store" ? "Nothing Store / Own Retail" : categoryLabel(category, market)}
                {selectedWaypointIds.has(key) ? " / ROUTE" : ""}
              </span>
            </div>
          </Tooltip>
        </Marker>
      ))}

      {renderedOohMarkers.map(({ aggregateCount, category, key, point, zoneName }) => {
        const style = OOH_STYLE[category as OOHCategory];

        return (
          <CircleMarker
            key={key}
            center={[point.lat, point.lng]}
            eventHandlers={{
              click: () => {
                if (routePlannerEnabled && aggregateCount === 1) {
                  onAddWaypoint(buildRouteWaypoint(category, key, point, zoneName));
                  return;
                }

                if (zoneName) {
                  onSelectZone(zoneName);
                }
              },
            }}
            pathOptions={{
              color: style.color,
              fillColor: style.fillColor,
              fillOpacity: heatmapEnabled ? Math.max(0.2, style.fillOpacity * 0.4) : style.fillOpacity,
              opacity: heatmapEnabled ? 0.28 : 0.92,
              weight: style.weight,
            }}
            radius={getOohRadius(category as OOHCategory, aggregateCount, heatmapEnabled)}
          >
            {showOohTooltips ? (
              <Tooltip direction="top" opacity={1}>
                <div className="map-tooltip">
                  <strong>{aggregateCount > 1 ? `${point.name} x${aggregateCount}` : point.name}</strong>
                  <span>
                    {categoryLabel(category, market)}
                    {selectedWaypointIds.has(key) ? " / ROUTE" : ""}
                    {routePlannerEnabled && aggregateCount > 1 ? " / ZOOM IN TO ROUTE" : ""}
                  </span>
                </div>
              </Tooltip>
            ) : null}
          </CircleMarker>
        );
      })}
    </>
  );
});

function getViewportState(map: L.Map): ViewportState {
  const bounds = map.getBounds().pad(VIEWPORT_PADDING);
  return {
    east: bounds.getEast(),
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    west: bounds.getWest(),
    zoom: map.getZoom(),
  };
}

function buildRenderPoints({
  categories,
  locations,
  neighbourhoods,
  viewport,
  visibleLayers,
}: {
  categories: LocationCategory[];
  locations: LocationsData;
  neighbourhoods: Neighbourhood[];
  viewport: ViewportState;
  visibleLayers: Record<LocationCategory, boolean>;
}) {
  const markers: RenderPoint[] = [];

  categories.forEach((category) => {
    if (!visibleLayers[category]) {
      return;
    }

    locations[category].forEach((point, index) => {
      if (!isPointInsideViewport(point, viewport)) {
        return;
      }

      const assignment = resolvePointZone(point, neighbourhoods);
      markers.push({
        category,
        key: `${category}-${index}-${point.name}`,
        point,
        zoneName: assignment.zoneName ?? null,
      });
    });
  });

  return markers;
}

function aggregateOohMarkers(markers: RenderPoint[], zoom: number): AggregatedOohPoint[] {
  if (zoom >= OOH_FULL_DETAIL_ZOOM) {
    return markers.map((marker) => ({
      ...marker,
      aggregateCount: 1,
    }));
  }

  const latStep = zoom >= 15 ? 0.0014 : 0.0024;
  const lngStep = zoom >= 15 ? 0.002 : 0.0034;
  const buckets = new Map<
    string,
    { count: number; latTotal: number; lngTotal: number; marker: RenderPoint }
  >();

  markers.forEach((marker) => {
    const latBucket = Math.round(marker.point.lat / latStep);
    const lngBucket = Math.round(marker.point.lng / lngStep);
    const bucketKey = `${marker.category}:${latBucket}:${lngBucket}`;
    const currentBucket = buckets.get(bucketKey);

    if (currentBucket) {
      currentBucket.count += 1;
      currentBucket.latTotal += marker.point.lat;
      currentBucket.lngTotal += marker.point.lng;
      return;
    }

    buckets.set(bucketKey, {
      count: 1,
      latTotal: marker.point.lat,
      lngTotal: marker.point.lng,
      marker,
    });
  });

  return [...buckets.values()].map(({ count, latTotal, lngTotal, marker }) => ({
    ...marker,
    aggregateCount: count,
    key: count > 1 ? `${marker.key}-agg-${count}` : marker.key,
    point: {
      ...marker.point,
      lat: latTotal / count,
      lng: lngTotal / count,
      name: count > 1 ? marker.point.name : marker.point.name,
    },
  }));
}

function getOohRadius(category: OOHCategory, aggregateCount: number, heatmapEnabled: boolean) {
  const baseRadius = OOH_STYLE[category].radius;
  const densityBoost = aggregateCount > 1 ? Math.min(2.6, 1 + Math.log2(aggregateCount) * 0.45) : 1;
  const heatmapScale = heatmapEnabled ? 0.88 : 1;
  return baseRadius * densityBoost * heatmapScale;
}

function buildRouteWaypoint(
  category: LocationCategory,
  key: string,
  point: LocationPoint,
  zoneName: string | null,
): RouteWaypoint {
  return {
    category,
    id: key,
    lat: point.lat,
    lng: point.lng,
    name: point.name,
    zoneName: zoneName ?? undefined,
  };
}

function createRouteWaypointIcon(order: number) {
  return L.divIcon({
    className: "route-waypoint-shell",
    html: `<span class="route-waypoint-badge">${order}</span>`,
    iconAnchor: [12, 12],
    iconSize: [24, 24],
  });
}

function isPointInsideViewport(point: LocationPoint, viewport: ViewportState) {
  return (
    point.lat >= viewport.south &&
    point.lat <= viewport.north &&
    point.lng >= viewport.west &&
    point.lng <= viewport.east
  );
}
