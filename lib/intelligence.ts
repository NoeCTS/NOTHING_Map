import {
  ConfidenceLevel,
  DataQualitySummary,
  LocationCategory,
  MarketMeta,
  ModeId,
  Neighbourhood,
  OOHCategory,
  ScenarioComparison,
  ScenarioSlotId,
  ScenarioSnapshot,
  ScoreDriver,
  ScoreExplanation,
} from "@/components/types";
import {
  MODE_WEIGHTS,
  ZoneDynamicStats,
  categoryLabel,
  formatImpressions,
  modeLabel,
  scoreForMode,
} from "@/lib/groundSignal";

export function buildScoreExplanation(
  zone: Neighbourhood,
  mode: ModeId,
  current: ZoneDynamicStats,
  baseline: ZoneDynamicStats,
  currentScore: number,
  market: MarketMeta,
): ScoreExplanation {
  const drivers = Object.entries(MODE_WEIGHTS[mode]).map(([rawCategory, weight]) => {
    const category = rawCategory as LocationCategory;
    const oohCategory = category as OOHCategory;
    const baselineValue =
      mode === "ooh" ? baseline.impressions[oohCategory] ?? 0 : baseline.stats[category];
    const currentValue =
      mode === "ooh" ? current.impressions[oohCategory] ?? 0 : current.stats[category];
    const completeness = baselineValue > 0 ? Math.round((currentValue / baselineValue) * 100) : 0;
    const contribution = currentValue * weight;

    return {
      category,
      label: categoryLabel(category, market),
      weight,
      currentValue,
      baselineValue,
      completeness: clamp(completeness, 0, 100),
      contribution,
      displayCurrent: mode === "ooh" ? formatImpressions(currentValue) : String(currentValue),
      displayBaseline: mode === "ooh" ? formatImpressions(baselineValue) : String(baselineValue),
    } satisfies ScoreDriver;
  });

  const currentWeighted = drivers.reduce((sum, driver) => sum + driver.currentValue * driver.weight, 0);
  const baselineWeighted = drivers.reduce((sum, driver) => sum + driver.baselineValue * driver.weight, 0);

  return {
    baseScore: zone.scores[mode],
    currentScore,
    delta: currentScore - zone.scores[mode],
    completeness:
      baselineWeighted > 0 ? clamp(Math.round((currentWeighted / baselineWeighted) * 100), 0, 100) : 0,
    drivers: drivers.sort((left, right) => right.contribution - left.contribution),
  };
}

export function buildDataQualitySummary(
  stats: ZoneDynamicStats,
  visibleLayers: Record<LocationCategory, boolean>,
  market: MarketMeta,
): DataQualitySummary {
  const visibleCategories = (Object.keys(visibleLayers) as LocationCategory[]).filter(
    (category) => visibleLayers[category],
  );
  const quality = stats.quality;
  const geometryCoverage =
    quality.visiblePoints > 0
      ? (quality.geometryVerified + quality.geometryInferred) / quality.visiblePoints
      : 0;
  const impressionCoverage =
    quality.stationWeighted + quality.defaultImpressions > 0
      ? quality.stationWeighted / (quality.stationWeighted + quality.defaultImpressions)
      : 1;
  const sourceConfidence =
    visibleCategories.reduce((sum, category) => sum + confidenceWeight(market.dataSourceMeta[category].confidence), 0) /
    Math.max(visibleCategories.length, 1);

  const score = Math.round(geometryCoverage * 55 + impressionCoverage * 25 + sourceConfidence * 20);

  return {
    score,
    level: score >= 80 ? "high" : score >= 60 ? "medium" : "low",
    visiblePoints: quality.visiblePoints,
    geometryVerified: quality.geometryVerified,
    geometryInferred: quality.geometryInferred,
    taggedFallback: quality.taggedFallback,
    polygonMismatches: quality.polygonMismatches,
    stationWeighted: quality.stationWeighted,
    defaultImpressions: quality.defaultImpressions,
    visibleSources: visibleCategories.map((category) => market.dataSourceMeta[category].source),
    lastUpdated: market.dataRefreshDate,
    notes: buildQualityNotes(quality),
  };
}

export function buildAggregateDataQuality(
  statsByZone: Record<string, ZoneDynamicStats>,
  visibleLayers: Record<LocationCategory, boolean>,
  market: MarketMeta,
): DataQualitySummary {
  const merged: ZoneDynamicStats = {
    stats: {
      galleries: 0,
      agencies: 0,
      venues: 0,
      coworking: 0,
      retail: 0,
      schools: 0,
      ubahn_poster: 0,
      ubahn_special: 0,
      bridge_banner: 0,
      street_furniture: 0,
    },
    impressions: {
      high: 0,
      low: 0,
      expected: 0,
      ubahn_poster: 0,
      ubahn_special: 0,
      bridge_banner: 0,
      street_furniture: 0,
      total: 0,
    },
    quality: {
      visiblePoints: 0,
      geometryVerified: 0,
      geometryInferred: 0,
      taggedFallback: 0,
      polygonMismatches: 0,
      stationWeighted: 0,
      defaultImpressions: 0,
    },
  };

  Object.values(statsByZone).forEach((stats) => {
    merged.quality.visiblePoints += stats.quality.visiblePoints;
    merged.quality.geometryVerified += stats.quality.geometryVerified;
    merged.quality.geometryInferred += stats.quality.geometryInferred;
    merged.quality.taggedFallback += stats.quality.taggedFallback;
    merged.quality.polygonMismatches += stats.quality.polygonMismatches;
    merged.quality.stationWeighted += stats.quality.stationWeighted;
    merged.quality.defaultImpressions += stats.quality.defaultImpressions;
  });

  return buildDataQualitySummary(merged, visibleLayers, market);
}

export function buildScenarioLabel(
  slot: ScenarioSlotId,
  activeMode: ModeId,
  visibleLayers: Record<LocationCategory, boolean>,
) {
  const activeLayerCount = Object.values(visibleLayers).filter(Boolean).length;
  return `Scenario ${slot} / ${modeLabel(activeMode)} / ${activeLayerCount} layers`;
}

export function buildScenarioComparisons(
  current: ScenarioSnapshot,
  slots: Record<ScenarioSlotId, ScenarioSnapshot | null>,
): ScenarioComparison[] {
  const comparisons: ScenarioComparison[] = [];

  (["A", "B"] as ScenarioSlotId[]).forEach((slot) => {
    const saved = slots[slot];
    if (!saved) {
      return;
    }

    comparisons.push(compareSnapshots(`Current vs ${slot}`, saved, current));
  });

  if (slots.A && slots.B) {
    comparisons.push(compareSnapshots("Scenario A vs B", slots.A, slots.B));
  }

  return comparisons;
}

function compareSnapshots(
  title: string,
  left: ScenarioSnapshot,
  right: ScenarioSnapshot,
): ScenarioComparison {
  const leftTop = left.rankedZones[0];
  const rightTop = right.rankedZones[0];

  const lines = [
    {
      label: "Mode",
      value: `${modeLabel(left.activeMode)} -> ${modeLabel(right.activeMode)}`,
    },
    {
      label: "Top zone",
      value: `${leftTop?.name ?? "None"} ${leftTop ? scoreForMode(leftTop, left.activeMode) : "-"} -> ${rightTop?.name ?? "None"} ${rightTop ? scoreForMode(rightTop, right.activeMode) : "-"}`,
    },
    {
      label: "Layers",
      value: `${countVisibleLayers(left.visibleLayers)} -> ${countVisibleLayers(right.visibleLayers)}`,
    },
    {
      label: "Biggest mover",
      value: biggestMoverLabel(left, right),
    },
  ];

  return {
    title,
    lines,
  };
}

function biggestMoverLabel(left: ScenarioSnapshot, right: ScenarioSnapshot) {
  if (left.activeMode !== right.activeMode) {
    return "Cross-mode comparison; score deltas are strategic rather than like-for-like.";
  }

  const deltas = right.rankedZones.map((zone) => {
    const leftZone = left.rankedZones.find((candidate) => candidate.name === zone.name);
    const from = leftZone ? scoreForMode(leftZone, left.activeMode) : 0;
    const to = scoreForMode(zone, right.activeMode);

    return {
      delta: to - from,
      from,
      name: zone.name,
      to,
    };
  });

  const biggest = deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  if (!biggest) {
    return "No rank delta.";
  }

  return `${biggest.name} ${biggest.delta >= 0 ? "+" : ""}${biggest.delta} (${biggest.from} -> ${biggest.to})`;
}

function confidenceWeight(level: ConfidenceLevel) {
  switch (level) {
    case "high":
      return 1;
    case "medium":
      return 0.72;
    case "low":
      return 0.45;
    default:
      return 0.5;
  }
}

function buildQualityNotes(stats: ZoneDynamicStats["quality"]) {
  const notes: string[] = [];

  if (stats.taggedFallback > 0) {
    notes.push(`${stats.taggedFallback} visible points rely on tagged zone fallback.`);
  }

  if (stats.polygonMismatches > 0) {
    notes.push(`${stats.polygonMismatches} tagged points fall outside their zone polygon and should be reviewed.`);
  }

  if (stats.defaultImpressions > 0) {
    notes.push(`${stats.defaultImpressions} OOH surfaces use default impression weights instead of station-specific matches.`);
  }

  if (!notes.length) {
    notes.push("Visible points are geometry-validated and impression-weighted where applicable.");
  }

  return notes;
}

function countVisibleLayers(visibleLayers: Record<LocationCategory, boolean>) {
  return Object.values(visibleLayers).filter(Boolean).length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
