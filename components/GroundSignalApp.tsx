"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Controls } from "@/components/Controls";
import { Header } from "@/components/Header";
import { Recommendations } from "@/components/Recommendations";
import { Tutorial } from "@/components/Tutorial";
import {
  ComputedRoute,
  HeatmapPoint,
  LocationCategory,
  LocationPoint,
  MarketDataset,
  ModeId,
  Recommendation,
  RouteWaypoint,
} from "@/components/types";
import { computeGapAnalysis } from "@/lib/gapAnalysis";
import {
  MODE_WEIGHTS,
  buildRecommendation,
  computeDynamicScore,
  computeDynamicStats,
  getImpressions,
  isOohCategory,
  rankNeighbourhoods,
} from "@/lib/groundSignal";
import { buildDataQualitySummary, buildScoreExplanation } from "@/lib/intelligence";
import {
  analyzeRouteOohCorridor,
  buildFallbackComputedRoute,
  optimizeRouteWaypoints,
  summarizeRoute,
} from "@/lib/routePlanner";

const GroundSignalMap = dynamic(
  () => import("@/components/Map").then((module) => module.GroundSignalMap),
  {
    ssr: false,
    loading: () => (
      <div className="map-panel">
        <div className="map-loading">
          <div className="loading-copy">Loading signal layers...</div>
        </div>
      </div>
    ),
  },
);

interface GroundSignalAppProps {
  market: MarketDataset;
}

const ALL_LAYERS_ON: Record<LocationCategory, boolean> = {
  retail: true,
  galleries: true,
  agencies: true,
  coworking: true,
  venues: true,
  schools: true,
  competitors: true,
  ubahn_poster: true,
  ubahn_special: true,
  bridge_banner: true,
  street_furniture: true,
};

const LONDON_DEFAULT_LAYERS: Record<LocationCategory, boolean> = {
  retail: true,
  galleries: false,
  agencies: true,
  coworking: true,
  venues: false,
  schools: false,
  competitors: true,
  ubahn_poster: true,
  ubahn_special: false,
  bridge_banner: true,
  street_furniture: true,
};

function getDefaultLayers(marketCode: string): Record<LocationCategory, boolean> {
  return marketCode === "BER" ? ALL_LAYERS_ON : LONDON_DEFAULT_LAYERS;
}

export function GroundSignalApp({
  market,
}: GroundSignalAppProps) {
  const { locations, meta, neighbourhoods } = market;
  const [activeMode, setActiveMode] = useState<ModeId>("guerrilla");
  const [visibleLayers, setVisibleLayers] = useState(() => getDefaultLayers(meta.code));
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [radiusOverlay, setRadiusOverlay] = useState(false);
  const [gapAnalysisEnabled, setGapAnalysisEnabled] = useState(false);
  const [markersVisible, setMarkersVisible] = useState(true);
  const [routePlannerEnabled, setRoutePlannerEnabled] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState<RouteWaypoint[]>([]);
  const [computedRoute, setComputedRoute] = useState<ComputedRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const deferredActiveMode = useDeferredValue(activeMode);
  const deferredVisibleLayers = useDeferredValue(visibleLayers);

  const baselineStats = useMemo(
    () => computeDynamicStats(neighbourhoods, locations, ALL_LAYERS_ON, meta),
    [locations, meta, neighbourhoods],
  );

  const currentStats = useMemo(
    () => computeDynamicStats(neighbourhoods, locations, deferredVisibleLayers, meta),
    [deferredVisibleLayers, locations, meta, neighbourhoods],
  );

  const computedNeighbourhoods = useMemo(() => {
    const dynamicZones = neighbourhoods.map((zone) => {
      const zoneStats = currentStats[zone.name];
      const fullStats = baselineStats[zone.name];
      const culturalScore = computeDynamicScore(zone, "cultural", zoneStats, fullStats);
      const retailScore = computeDynamicScore(zone, "retail", zoneStats, fullStats);
      const creatorScore = computeDynamicScore(zone, "creator", zoneStats, fullStats);
      const guerrillaScore = computeDynamicScore(zone, "guerrilla", zoneStats, fullStats);
      const oohScore = computeDynamicScore(zone, "ooh", zoneStats, fullStats);

      return {
        ...zone,
        stats: zoneStats.stats,
        impressions: zoneStats.impressions,
        scores: {
          cultural: culturalScore,
          retail: retailScore,
          creator: creatorScore,
          guerrilla: guerrillaScore,
          ooh: oohScore,
        },
        dataQuality: buildDataQualitySummary(zoneStats, deferredVisibleLayers, meta),
        scoreExplanations: {
          cultural: buildScoreExplanation(zone, "cultural", zoneStats, fullStats, culturalScore, meta),
          retail: buildScoreExplanation(zone, "retail", zoneStats, fullStats, retailScore, meta),
          creator: buildScoreExplanation(zone, "creator", zoneStats, fullStats, creatorScore, meta),
          guerrilla: buildScoreExplanation(zone, "guerrilla", zoneStats, fullStats, guerrillaScore, meta),
          ooh: buildScoreExplanation(zone, "ooh", zoneStats, fullStats, oohScore, meta),
        },
      };
    });

    const gapByZone = computeGapAnalysis(dynamicZones);
    return dynamicZones.map((zone) => ({
      ...zone,
      gapAnalysis: gapByZone[zone.name],
    }));
  }, [baselineStats, currentStats, deferredVisibleLayers, meta, neighbourhoods]);

  const ranked = useMemo(
    () => rankNeighbourhoods(computedNeighbourhoods, deferredActiveMode),
    [computedNeighbourhoods, deferredActiveMode],
  );

  const [selectedZoneName, setSelectedZoneName] = useState(ranked[0]?.name ?? "");

  useEffect(() => {
    if (!selectedZoneName) {
      setSelectedZoneName(ranked[0]?.name ?? "");
      return;
    }

    if (!ranked.some((zone) => zone.name === selectedZoneName)) {
      setSelectedZoneName(ranked[0]?.name ?? "");
    }
  }, [ranked, selectedZoneName]);

  useEffect(() => {
    setRecommendation(null);
  }, [activeMode, gapAnalysisEnabled, meta.code, radiusOverlay, visibleLayers]);

  useEffect(() => {
    if (routeWaypoints.length < 2) {
      setComputedRoute(null);
      setRouteLoading(false);
      return;
    }

    const controller = new AbortController();

    setRouteLoading(true);

    fetch("/api/walking-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        waypoints: routeWaypoints,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("walking_route_failed");
        }

        return response.json() as Promise<{ route?: ComputedRoute }>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setComputedRoute(data.route ?? buildFallbackComputedRoute(routeWaypoints));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setComputedRoute(buildFallbackComputedRoute(routeWaypoints));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      });

    return () => controller.abort();
  }, [routeWaypoints]);

  const selectedZone =
    ranked.find((zone) => zone.name === selectedZoneName) ?? ranked[0];

  const heatmapPoints = useMemo<HeatmapPoint[]>(() => {
    const visibleEntries = (Object.entries(locations) as [LocationCategory, LocationPoint[]][])
      .filter(([category]) => deferredVisibleLayers[category]);
    const visibleOohImpressions = visibleEntries.flatMap(([category, points]) =>
      isOohCategory(category) ? points.map((point) => getImpressions(point, category, meta)) : [],
    );
    const maxOohImpressions = Math.max(...visibleOohImpressions, 1);
    const bucketSizeLat = deferredActiveMode === "ooh" ? 0.0018 : 0.0025;
    const bucketSizeLng = deferredActiveMode === "ooh" ? 0.0024 : 0.0032;
    const buckets = new Map<
      string,
      { count: number; intensity: number; latTotal: number; lngTotal: number }
    >();

    visibleEntries.forEach(([category, points]) => {
      points.forEach((point) => {
        const intensity = getHeatIntensity(point, category, deferredActiveMode, maxOohImpressions, meta);
        const bucketKey = `${Math.round(point.lat / bucketSizeLat)}:${Math.round(point.lng / bucketSizeLng)}`;
        const currentBucket = buckets.get(bucketKey);

        if (currentBucket) {
          currentBucket.count += 1;
          currentBucket.intensity += intensity;
          currentBucket.latTotal += point.lat;
          currentBucket.lngTotal += point.lng;
          return;
        }

        buckets.set(bucketKey, {
          count: 1,
          intensity,
          latTotal: point.lat,
          lngTotal: point.lng,
        });
      });
    });

    return [...buckets.values()].map((bucket) => {
      const averageIntensity = bucket.intensity / bucket.count;
      const densityBoost = Math.min(1.35, 1 + Math.log10(bucket.count + 1) * 0.35);

      return {
        lat: bucket.latTotal / bucket.count,
        lng: bucket.lngTotal / bucket.count,
        intensity: Math.min(1, averageIntensity * densityBoost),
      };
    });
  }, [deferredActiveMode, deferredVisibleLayers, locations, meta]);
  const routeSummary = useMemo(
    () => summarizeRoute(routeWaypoints, computedRoute),
    [computedRoute, routeWaypoints],
  );
  const routeOohAnalysis = useMemo(
    () => analyzeRouteOohCorridor(routeWaypoints, locations, deferredVisibleLayers, meta, computedRoute),
    [computedRoute, deferredVisibleLayers, locations, meta, routeWaypoints],
  );
  const optimizedRouteWaypoints = useMemo(() => optimizeRouteWaypoints(routeWaypoints), [routeWaypoints]);
  const currentLinearRouteSummary = useMemo(() => summarizeRoute(routeWaypoints), [routeWaypoints]);
  const optimizedRouteSummary = useMemo(() => summarizeRoute(optimizedRouteWaypoints), [optimizedRouteWaypoints]);
  const optimizationGainMeters = Math.max(
    0,
    currentLinearRouteSummary.totalDistanceMeters - optimizedRouteSummary.totalDistanceMeters,
  );
  const canOptimizeRoute =
    routeWaypoints.length > 2 &&
    optimizationGainMeters >= 100 &&
    !isSameWaypointOrder(routeWaypoints, optimizedRouteWaypoints);

  return (
    <div className="app-shell">
      <Header market={meta} />

      <main className="workspace">
        <Controls
          activeMode={activeMode}
          gapAnalysisEnabled={gapAnalysisEnabled}
          heatmapEnabled={heatmapEnabled}
          locations={locations}
          market={meta}
          markersVisible={markersVisible}
          onModeChange={(mode) => {
            startTransition(() => {
              setActiveMode(mode);
            });
          }}
          onToggleGapAnalysis={() => setGapAnalysisEnabled((current) => !current)}
          onToggleHeatmap={() => setHeatmapEnabled((current) => !current)}
          onToggleLayer={(layer) => {
            startTransition(() => {
              setVisibleLayers((current) => ({
                ...current,
                [layer]: !current[layer],
              }));
            });
          }}
          onToggleMarkers={() => setMarkersVisible((current) => !current)}
          onToggleRadiusOverlay={() => setRadiusOverlay((current) => !current)}
          onSetLayerGroup={(layers, enabled) => {
            startTransition(() => {
              setVisibleLayers((current) => {
                const next = { ...current };

                layers.forEach((layer) => {
                  next[layer] = enabled;
                });

                return next;
              });
            });
          }}
          radiusOverlay={radiusOverlay}
          visibleLayers={visibleLayers}
        />

        <GroundSignalMap
          activeMode={deferredActiveMode}
          gapAnalysisEnabled={gapAnalysisEnabled}
          heatmapEnabled={heatmapEnabled}
          heatmapPoints={heatmapPoints}
          locations={locations}
          market={meta}
          markersVisible={markersVisible}
          neighbourhoods={ranked}
          computedRoute={computedRoute}
          onSelectZone={setSelectedZoneName}
          radiusOverlay={radiusOverlay}
          routeLoading={routeLoading}
          routePlannerEnabled={routePlannerEnabled}
          routeSummary={routeSummary}
          routeWaypoints={routeWaypoints}
          onAddWaypoint={(waypoint) => {
            setRouteWaypoints((current) => {
              const exists = current.some((w) => w.id === waypoint.id);
              if (exists) {
                return current.filter((w) => w.id !== waypoint.id);
              }
              return [...current, waypoint];
            });
          }}
          visibleLayers={deferredVisibleLayers}
        />

        {selectedZone ? (
          <Recommendations
            activeMode={activeMode}
            canOptimizeRoute={canOptimizeRoute}
            computedRoute={computedRoute}
            market={meta}
            neighbourhoods={ranked}
            optimizationGainMeters={optimizationGainMeters}
            onGenerate={() => setRecommendation(buildRecommendation(activeMode, ranked, meta, selectedZone))}
            onClearRoute={() => setRouteWaypoints([])}
            onDisableRoutePlanner={() => setRoutePlannerEnabled(false)}
            onEnableRoutePlanner={() => setRoutePlannerEnabled(true)}
            onOptimizeRoute={() => setRouteWaypoints(optimizedRouteWaypoints)}
            onRemoveRouteWaypoint={(waypointId) => {
              setRouteWaypoints((current) => current.filter((waypoint) => waypoint.id !== waypointId));
            }}
            onReverseRoute={() => setRouteWaypoints((current) => [...current].reverse())}
            onSelectZone={setSelectedZoneName}
            recommendation={recommendation}
            routeLoading={routeLoading}
            routeOohAnalysis={routeOohAnalysis}
            routePlannerEnabled={routePlannerEnabled}
            routeSummary={routeSummary}
            routeWaypoints={routeWaypoints}
            selectedZone={selectedZone}
          />
        ) : null}
      </main>

      <Tutorial />
    </div>
  );
}

function getHeatIntensity(
  point: LocationPoint,
  category: LocationCategory,
  mode: ModeId,
  maxOohImpressions: number,
  market: MarketDataset["meta"],
) {
  if (mode === "ooh") {
    if (isOohCategory(category)) {
      const normalized = getImpressions(point, category, market) / maxOohImpressions;
      return 0.35 + normalized * 0.65;
    }

    return 0.3;
  }

  const weight = MODE_WEIGHTS[mode][category] ?? 0;
  if (weight > 0) {
    return 0.45 + Math.min(weight / 1.5, 1) * 0.5;
  }

  return isOohCategory(category) ? 0.22 : 0.32;
}

function isSameWaypointOrder(left: RouteWaypoint[], right: RouteWaypoint[]) {
  return left.length === right.length && left.every((waypoint, index) => waypoint.id === right[index]?.id);
}
