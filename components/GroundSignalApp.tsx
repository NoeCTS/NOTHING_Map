"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Controls } from "@/components/Controls";
import { Header } from "@/components/Header";
import { Recommendations } from "@/components/Recommendations";
import {
  HeatmapPoint,
  LocationCategory,
  LocationPoint,
  LocationsData,
  ModeId,
  Neighbourhood,
  Recommendation,
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

const GroundSignalMap = dynamic(
  () => import("@/components/Map").then((module) => module.GroundSignalMap),
  {
    ssr: false,
    loading: () => (
      <div className="map-panel">
        <div className="map-loading">
          <div className="loading-copy">Loading Berlin signal layers...</div>
        </div>
      </div>
    ),
  },
);

interface GroundSignalAppProps {
  locations: LocationsData;
  neighbourhoods: Neighbourhood[];
}

const DEFAULT_LAYERS: Record<LocationCategory, boolean> = {
  retail: true,
  galleries: true,
  agencies: true,
  coworking: true,
  venues: true,
  schools: true,
  ubahn_poster: true,
  ubahn_special: true,
  bridge_banner: true,
  street_furniture: true,
};

const ALL_VISIBLE_LAYERS: Record<LocationCategory, boolean> = {
  ...DEFAULT_LAYERS,
};

export function GroundSignalApp({
  locations,
  neighbourhoods,
}: GroundSignalAppProps) {
  const [activeMode, setActiveMode] = useState<ModeId>("guerrilla");
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_LAYERS);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [radiusOverlay, setRadiusOverlay] = useState(false);
  const [gapAnalysisEnabled, setGapAnalysisEnabled] = useState(false);
  const [markersVisible, setMarkersVisible] = useState(true);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const baselineStats = useMemo(
    () => computeDynamicStats(neighbourhoods, locations, ALL_VISIBLE_LAYERS),
    [locations, neighbourhoods],
  );

  const computedNeighbourhoods = useMemo(() => {
    const currentStats = computeDynamicStats(neighbourhoods, locations, visibleLayers);

    const dynamicZones = neighbourhoods.map((zone) => {
      const zoneStats = currentStats[zone.name];
      const fullStats = baselineStats[zone.name];

      return {
        ...zone,
        stats: zoneStats.stats,
        impressions: zoneStats.impressions,
        scores: {
          cultural: computeDynamicScore(zone, "cultural", zoneStats, fullStats),
          retail: computeDynamicScore(zone, "retail", zoneStats, fullStats),
          creator: computeDynamicScore(zone, "creator", zoneStats, fullStats),
          guerrilla: computeDynamicScore(zone, "guerrilla", zoneStats, fullStats),
          ooh: computeDynamicScore(zone, "ooh", zoneStats, fullStats),
        },
      };
    });

    const gapByZone = computeGapAnalysis(dynamicZones);
    return dynamicZones.map((zone) => ({
      ...zone,
      gapAnalysis: gapByZone[zone.name],
    }));
  }, [baselineStats, locations, neighbourhoods, visibleLayers]);

  const ranked = useMemo(
    () => rankNeighbourhoods(computedNeighbourhoods, activeMode),
    [activeMode, computedNeighbourhoods],
  );

  const [selectedZoneName, setSelectedZoneName] = useState(ranked[0]?.name ?? "");

  const heatmapPoints = useMemo<HeatmapPoint[]>(() => {
    const visibleEntries = (Object.entries(locations) as [LocationCategory, LocationPoint[]][])
      .filter(([category]) => visibleLayers[category]);
    const visibleOohImpressions = visibleEntries.flatMap(([category, points]) =>
      isOohCategory(category) ? points.map((point) => getImpressions(point, category)) : [],
    );
    const maxOohImpressions = Math.max(...visibleOohImpressions, 1);

    return visibleEntries.flatMap(([category, points]) =>
      points.map((point) => ({
        lat: point.lat,
        lng: point.lng,
        intensity: getHeatIntensity(point, category, activeMode, maxOohImpressions),
      })),
    );
  }, [activeMode, locations, visibleLayers]);

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
  }, [activeMode, visibleLayers]);

  const selectedZone =
    ranked.find((zone) => zone.name === selectedZoneName) ?? ranked[0];

  async function handleExportPdf() {
    if (!recommendation || !selectedZone) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const { exportGroundSignalPdf } = await import("@/lib/pdfExport");
      await exportGroundSignalPdf({
        activeMode,
        generatedAt: new Date(),
        ranked,
        recommendation,
        selectedZone,
      });
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="app-shell">
      <Header />

      <main className="workspace">
        <Controls
          activeMode={activeMode}
          gapAnalysisEnabled={gapAnalysisEnabled}
          heatmapEnabled={heatmapEnabled}
          locations={locations}
          markersVisible={markersVisible}
          onModeChange={setActiveMode}
          onToggleGapAnalysis={() => setGapAnalysisEnabled((current) => !current)}
          onToggleHeatmap={() => setHeatmapEnabled((current) => !current)}
          onToggleLayer={(layer) => {
            setVisibleLayers((current) => ({
              ...current,
              [layer]: !current[layer],
            }));
          }}
          onToggleMarkers={() => setMarkersVisible((current) => !current)}
          onToggleRadiusOverlay={() => setRadiusOverlay((current) => !current)}
          radiusOverlay={radiusOverlay}
          visibleLayers={visibleLayers}
        />

        <GroundSignalMap
          activeMode={activeMode}
          gapAnalysisEnabled={gapAnalysisEnabled}
          heatmapEnabled={heatmapEnabled}
          heatmapPoints={heatmapPoints}
          locations={locations}
          markersVisible={markersVisible}
          neighbourhoods={ranked}
          onSelectZone={setSelectedZoneName}
          radiusOverlay={radiusOverlay}
          selectedZoneName={selectedZoneName}
          visibleLayers={visibleLayers}
        />

        {selectedZone ? (
          <Recommendations
            activeMode={activeMode}
            gapAnalysisEnabled={gapAnalysisEnabled}
            isExportingPdf={isExportingPdf}
            neighbourhoods={ranked}
            onExportPdf={handleExportPdf}
            onGenerate={() => setRecommendation(buildRecommendation(activeMode, ranked))}
            onSelectZone={setSelectedZoneName}
            recommendation={recommendation}
            selectedZone={selectedZone}
          />
        ) : null}
      </main>
    </div>
  );
}

function getHeatIntensity(
  point: LocationPoint,
  category: LocationCategory,
  mode: ModeId,
  maxOohImpressions: number,
) {
  if (mode === "ooh") {
    if (isOohCategory(category)) {
      const normalized = getImpressions(point, category) / maxOohImpressions;
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
