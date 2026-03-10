import {
  BreakdownMetric,
  BrandFit,
  ConfidenceLevel,
  ImpressionRange,
  LocationCategory,
  LocationPoint,
  LocationsData,
  MarketMeta,
  ModeId,
  Neighbourhood,
  NeighbourhoodImpressions,
  NeighbourhoodStats,
  OOHCategory,
  Recommendation,
  RecommendationMetric,
} from "@/components/types";
import { polygonBounds, resolvePointZone } from "@/lib/spatial";

const BASE_MODES: { id: ModeId; label: string; blurb: string }[] = [
  {
    id: "cultural",
    label: "Cultural Launchpad",
    blurb: "Weights galleries and live culture most heavily.",
  },
  {
    id: "retail",
    label: "Ecosystem Retail",
    blurb: "Prioritises retail adjacency and premium visibility.",
  },
  {
    id: "creator",
    label: "Creator Seeding",
    blurb: "Optimises for agencies, coworking, and creator infrastructure.",
  },
  {
    id: "guerrilla",
    label: "Guerrilla Activation",
    blurb: "Pushes nightlife, schools, and high-energy cultural density.",
  },
  {
    id: "ooh",
    label: "OOH Media",
    blurb: "",
  },
];

const BASE_LAYER_CONFIG: {
  id: LocationCategory;
  label: string;
  color: "accent" | "white" | "grey" | "orange" | "cyan" | "yellow" | "magenta" | "lime" | "blue";
}[] = [
  { id: "retail", label: "Retail", color: "accent" },
  { id: "galleries", label: "Galleries", color: "white" },
  { id: "agencies", label: "Agencies", color: "white" },
  { id: "coworking", label: "Coworking", color: "grey" },
  { id: "venues", label: "Venues", color: "grey" },
  { id: "schools", label: "Design Schools", color: "grey" },
  { id: "competitors", label: "Competitors", color: "blue" },
  { id: "ubahn_poster", label: "Posters", color: "orange" },
  { id: "ubahn_special", label: "Premium", color: "magenta" },
  { id: "bridge_banner", label: "Bridge", color: "cyan" },
  { id: "street_furniture", label: "Street Furniture", color: "lime" },
];

export const OOH_CATEGORIES: OOHCategory[] = [
  "ubahn_poster",
  "ubahn_special",
  "bridge_banner",
  "street_furniture",
];

export function getModes(market: MarketMeta) {
  return BASE_MODES.map((mode) =>
    mode.id === "ooh"
      ? {
          ...mode,
          blurb: market.oohModeBlurb,
        }
      : mode,
  );
}

export function getLayerConfig(market: MarketMeta) {
  return BASE_LAYER_CONFIG.map((layer) => {
    if (layer.id === "retail") {
      return { ...layer, label: market.retailLabel };
    }
    if (layer.id === "agencies") {
      return { ...layer, label: market.agenciesLabel };
    }
    if (layer.id === "venues") {
      return { ...layer, label: market.venuesLabel };
    }
    if (layer.id === "ubahn_poster") {
      return { ...layer, label: market.oohLabels.ubahn_poster };
    }
    if (layer.id === "ubahn_special") {
      return { ...layer, label: market.oohLabels.ubahn_special };
    }
    if (layer.id === "bridge_banner") {
      return { ...layer, label: market.oohLabels.bridge_banner };
    }
    if (layer.id === "street_furniture") {
      return { ...layer, label: market.oohLabels.street_furniture };
    }
    if (layer.id === "coworking" && market.code === "LDN") {
      return { ...layer, label: "Workspaces + Third Places" };
    }
    return layer;
  });
}

export const MODE_WEIGHTS: Record<ModeId, Partial<Record<LocationCategory, number>>> = {
  cultural: {
    galleries: 1.3,
    agencies: 1.15,
    venues: 1.2,
    coworking: 0.85,
    schools: 0.7,
  },
  retail: {
    retail: 1.5,
    galleries: 0.9,
    venues: 0.5,
  },
  creator: {
    agencies: 1.4,
    coworking: 1.3,
    galleries: 0.6,
  },
  guerrilla: {
    venues: 1.35,
    schools: 1.2,
    galleries: 0.7,
  },
  ooh: {
    ubahn_poster: 1.2,
    ubahn_special: 1.3,
    bridge_banner: 1.0,
    street_furniture: 0.8,
  },
};

export interface ZoneQualityCounters {
  defaultImpressions: number;
  geometryInferred: number;
  geometryVerified: number;
  polygonMismatches: number;
  stationWeighted: number;
  taggedFallback: number;
  visiblePoints: number;
}

export interface ZoneDynamicStats {
  impressions: NeighbourhoodImpressions;
  quality: ZoneQualityCounters;
  stats: NeighbourhoodStats;
}

interface ImpressionDetails {
  confidence: ConfidenceLevel;
  contextMultiplier: number;
  formatMultiplier: number;
  high: number;
  low: number;
  stationMatched: boolean;
  value: number;
}

const ACTIVATIONS: Record<ModeId, string> = {
  cultural:
    "Pop-up in gallery space + fly-poster burst + Glyph projection moment",
  retail:
    "Retail window and endcap programme across priority anchors + staff seeding + in-store Nothing experience zone",
  creator:
    "Seed product to 20 local creators in design, architecture, and lifestyle + host a creator dinner in-zone + launch a market-specific Community Edition",
  guerrilla:
    "Fly-posting across nightlife corridors + transit-and-street takeover + Glyph projections + limited product drop at venues",
  ooh:
    "Take over transit posters, digital screens, large-format roadside sites, and street furniture across priority zones, then echo into retail anchors for conversion",
};

function budgetTiers(market: MarketMeta): Record<ModeId, string> {
  const currency = market.code === "BER" ? "EUR" : "GBP";
  return {
    cultural: `Tier 2 / ${currency} ${market.code === "BER" ? "80K-160K" : "70K-150K"}`,
    retail: `Tier 2 / ${currency} ${market.code === "BER" ? "100K-180K" : "90K-170K"}`,
    creator: `Tier 1 / ${currency} ${market.code === "BER" ? "60K-120K" : "55K-110K"}`,
    guerrilla: `Tier 2 / ${currency} ${market.code === "BER" ? "90K-170K" : "80K-160K"}`,
    ooh: `Tier 3 / ${currency} ${market.code === "BER" ? "220K-420K" : "200K-380K"}`,
  };
}

function kpiList(market: MarketMeta) {
  return [
    `Branded search uplift (Google Trends ${market.searchRegion}, ${market.city} versus control city)`,
    market.code === "BER"
      ? "Retail footfall and sell-through (Saturn/MediaMarkt data)"
      : "Retail footfall and sell-through at priority anchors",
    `Social mentions (${market.hashtag})`,
    "CRM capture (email/SMS opt-in from QR codes)",
    "Creator content engagement (view-through rate, saves)",
  ];
}

function oohKpiList(market: MarketMeta) {
  return [
    market.code === "BER"
      ? "OOH impression estimates (U-Bahn station footfall data)"
      : "OOH impression estimates (flagship screen weighting + format defaults)",
    `Branded search uplift (Google Trends ${market.searchRegion}, ${market.city} versus control city)`,
    market.code === "BER"
      ? "QR code scan-through rate (street furniture + bridge banner placements)"
      : "QR code scan-through rate (street furniture + large-format placements)",
    "Retail footfall uplift within 500m of OOH placements",
    `Social mentions (${market.hashtag}, geo-tagged posts near placements)`,
  ];
}

const OOH_METRIC_CAPS = {
  total: 12_000_000,
  ubahn_poster: 4_000_000,
  ubahn_special: 6_000_000,
  bridge_banner: 1_200_000,
  street_furniture: 2_000_000,
};

const OOH_CATEGORY_LIMITS: Record<OOHCategory, { max: number; min: number }> = {
  ubahn_poster: { min: 6_000, max: 85_000 },
  ubahn_special: { min: 8_000, max: 180_000 },
  bridge_banner: { min: 18_000, max: 140_000 },
  street_furniture: { min: 5_000, max: 65_000 },
};

const IMPRESSION_FORMATTER = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function scoreForMode(zone: Neighbourhood, mode: ModeId) {
  return zone.scores[mode];
}

export function rankNeighbourhoods(
  neighbourhoods: Neighbourhood[],
  mode: ModeId,
): Neighbourhood[] {
  return [...neighbourhoods].sort(
    (left, right) => scoreForMode(right, mode) - scoreForMode(left, mode),
  );
}

export function categoryLabel(category: LocationCategory, market: MarketMeta) {
  return getLayerConfig(market).find((layer) => layer.id === category)?.label ?? category;
}

export function computeDynamicStats(
  neighbourhoods: Neighbourhood[],
  locations: LocationsData,
  visibleLayers: Record<LocationCategory, boolean>,
  market: MarketMeta,
): Record<string, ZoneDynamicStats> {
  const byZone = Object.fromEntries(
    neighbourhoods.map((zone) => [
      zone.name,
      {
        stats: createEmptyStats(),
        impressions: createEmptyImpressions(),
        quality: createEmptyQualityCounters(),
      },
    ]),
  ) as Record<string, ZoneDynamicStats>;

  for (const [category, layerPoints] of Object.entries(locations) as [
    LocationCategory,
    LocationPoint[],
  ][]) {
    if (!visibleLayers[category]) {
      continue;
    }

    for (const point of layerPoints) {
      const assignment = resolvePointZone(point, neighbourhoods);

      if (!assignment.zoneName) {
        continue;
      }

      const zoneBucket = byZone[assignment.zoneName];
      zoneBucket.stats[category] += 1;
      zoneBucket.quality.visiblePoints += 1;

      if (assignment.method === "polygon_verified") {
        zoneBucket.quality.geometryVerified += 1;
      } else if (assignment.method === "polygon_inferred") {
        zoneBucket.quality.geometryInferred += 1;
      } else if (assignment.method === "tagged_fallback") {
        zoneBucket.quality.taggedFallback += 1;
      } else if (assignment.method === "tagged_mismatch") {
        zoneBucket.quality.taggedFallback += 1;
        zoneBucket.quality.polygonMismatches += 1;
      }

      if (isOohCategory(category)) {
        const impressionDetails = getImpressionDetails(point, category, market);
        zoneBucket.impressions[category] += impressionDetails.value;
        zoneBucket.impressions.low += impressionDetails.low;
        zoneBucket.impressions.high += impressionDetails.high;
        zoneBucket.impressions.total += impressionDetails.value;

        if (impressionDetails.stationMatched) {
          zoneBucket.quality.stationWeighted += 1;
        } else {
          zoneBucket.quality.defaultImpressions += 1;
        }
      }
    }
  }

  return byZone;
}

export function computeDynamicScore(
  zone: Neighbourhood,
  mode: ModeId,
  current: ZoneDynamicStats,
  baseline: ZoneDynamicStats,
): number {
  const baseScore = zone.scores[mode];
  const weights = MODE_WEIGHTS[mode];

  let visibleWeightedSum = 0;
  let fullWeightedSum = 0;

  for (const [category, weight] of Object.entries(weights) as [LocationCategory, number][]) {
    if (mode === "ooh" && isOohCategory(category)) {
      visibleWeightedSum += current.impressions[category] * weight;
      fullWeightedSum += baseline.impressions[category] * weight;
      continue;
    }

    visibleWeightedSum += current.stats[category] * weight;
    fullWeightedSum += baseline.stats[category] * weight;
  }

  if (fullWeightedSum <= 0) {
    return 0;
  }

  return clamp(Math.round(baseScore * (visibleWeightedSum / fullWeightedSum)), 0, 100);
}

export function brandFitValue(brandFit: BrandFit) {
  switch (brandFit) {
    case "high":
      return 92;
    case "medium":
      return 68;
    case "low":
      return 42;
    default:
      return 50;
  }
}

export function getImpressions(point: LocationPoint, category: LocationCategory, market: MarketMeta): number {
  if (!isOohCategory(category)) {
    return 0;
  }

  return getImpressionDetails(point, category, market).value;
}

export function formatImpressions(value: number) {
  return IMPRESSION_FORMATTER.format(value).toUpperCase();
}

export function getBreakdown(zone: Neighbourhood, market: MarketMeta, mode?: ModeId): BreakdownMetric[] {
  if (mode === "ooh") {
    const impressions = zone.impressions ?? createEmptyImpressions();
    return [
      {
        label: "Daily reach",
        value: metricPercent(impressions.total, OOH_METRIC_CAPS.total),
        displayValue: formatImpressions(impressions.total),
      },
      {
        label: market.oohLabels.ubahn_poster,
        value: metricPercent(impressions.ubahn_poster, OOH_METRIC_CAPS.ubahn_poster),
        displayValue: formatImpressions(impressions.ubahn_poster),
      },
      {
        label: market.oohLabels.ubahn_special,
        value: metricPercent(impressions.ubahn_special, OOH_METRIC_CAPS.ubahn_special),
        displayValue: formatImpressions(impressions.ubahn_special),
      },
      {
        label: "Street + large format",
        value: metricPercent(
          impressions.bridge_banner + impressions.street_furniture,
          OOH_METRIC_CAPS.bridge_banner + OOH_METRIC_CAPS.street_furniture,
        ),
        displayValue: formatImpressions(impressions.bridge_banner + impressions.street_furniture),
      },
    ];
  }

  const creativeRaw =
    zone.stats.galleries * 1.3 +
    zone.stats.agencies * 1.15 +
    zone.stats.venues * 1.2 +
    zone.stats.coworking * 0.85 +
    zone.stats.schools * 0.7;
  const footfallRaw =
    zone.stats.venues * 1.35 +
    zone.stats.galleries * 0.9 +
    zone.stats.retail * 1.2 +
    zone.stats.coworking * 0.65;

  return [
    {
      label: "Creative density",
      value: clamp(Math.round((creativeRaw / 20) * 100), 12, 100),
    },
    {
      label: "Retail proximity",
      value: clamp(Math.round((zone.stats.retail / 3) * 100), 8, 100),
    },
    {
      label: "Footfall",
      value: clamp(Math.round((footfallRaw / 12) * 100), 10, 100),
    },
    {
      label: "Brand fit",
      value: brandFitValue(zone.brandFit),
    },
  ];
}

export function recommendationWhy(zone: Neighbourhood, mode: ModeId, market: MarketMeta) {
  const stats = zone.stats;

  if (mode === "ooh") {
    const totalOoh =
      stats.ubahn_poster +
      stats.ubahn_special +
      stats.bridge_banner +
      stats.street_furniture;
    const estimatedReach = formatImpressions(zone.impressions?.total ?? 0);
    return [
      zone.description.split(". ")[0] + ".",
      `${totalOoh} OOH surfaces drive roughly ${estimatedReach} daily impressions, led by ${stats.ubahn_poster} ${market.oohLabels.ubahn_poster.toLowerCase()}, ${stats.ubahn_special} ${market.oohLabels.ubahn_special.toLowerCase()}, ${stats.bridge_banner} ${market.oohLabels.bridge_banner.toLowerCase()}, and ${stats.street_furniture} ${market.oohLabels.street_furniture.toLowerCase()}.`,
      `Pairing that media weight with ${stats.retail} retail anchor${stats.retail === 1 ? "" : "s"} creates a clear awareness-to-conversion corridor.`,
    ];
  }

  switch (mode) {
    case "cultural":
      return [
        zone.description.split(". ")[0] + ".",
        `${stats.galleries} galleries, ${stats.venues} music venues, and ${stats.agencies} creative agencies create the strongest cultural stack in-zone.`,
        `${stats.retail} retail anchor${stats.retail === 1 ? "" : "s"} sit within reach for conversion once awareness spikes.`,
      ];
    case "retail":
      return [
        zone.description.split(". ")[0] + ".",
        `${stats.retail} retail anchor${stats.retail === 1 ? "" : "s"} plus ${stats.galleries} galleries give this zone the cleanest mix of visibility and brand context.`,
        "The area supports flagship moments while still linking directly to high-traffic retail conversion.",
      ];
    case "creator":
      return [
        zone.description.split(". ")[0] + ".",
        `${stats.agencies} agencies and ${stats.coworking} coworking hubs make this the densest creator-network cluster in the prototype.`,
        `That gives Nothing a credible base for seeding, events, and local creator amplification.`,
      ];
    case "guerrilla":
      return [
        zone.description.split(". ")[0] + ".",
        `${stats.venues} venues and ${stats.schools} design school touchpoint${stats.schools === 1 ? "" : "s"} create strong after-dark and youth reach.`,
        `The zone is best suited to high-frequency street presence, projections, and limited drops.`,
      ];
    default:
      return [zone.description];
  }
}

export function estimateZoneImpressionRange(zone: Neighbourhood): ImpressionRange | null {
  const expected = zone.impressions?.total ?? 0;
  if (expected <= 0) {
    return null;
  }

  const explicitLow = zone.impressions?.low ?? 0;
  const explicitHigh = zone.impressions?.high ?? 0;
  if (explicitLow > 0 && explicitHigh > 0) {
    return {
      confidence: zone.dataQuality?.level ?? "medium",
      expected,
      low: explicitLow,
      high: explicitHigh,
    };
  }

  const quality = zone.dataQuality;
  const sourceCount = (quality?.stationWeighted ?? 0) + (quality?.defaultImpressions ?? 0);
  const stationShare = sourceCount > 0 ? (quality?.stationWeighted ?? 0) / sourceCount : 0;

  let lowFactor = 0.74;
  let highFactor = 1.28;
  let confidence: ConfidenceLevel = quality?.level ?? "medium";

  if (confidence === "high") {
    lowFactor = 0.84;
    highFactor = 1.16;
  } else if (confidence === "low") {
    lowFactor = 0.6;
    highFactor = 1.46;
  }

  lowFactor += stationShare * 0.06;
  highFactor -= stationShare * 0.08;

  return {
    confidence,
    expected,
    low: Math.round(expected * lowFactor),
    high: Math.round(expected * highFactor),
  };
}

function buildRecommendationMetrics(
  zone: Neighbourhood,
  mode: ModeId,
  market: MarketMeta,
): RecommendationMetric[] {
  const metrics: RecommendationMetric[] = [
    {
      label: "Mode score",
      value: `${scoreForMode(zone, mode)}/100`,
    },
    {
      label: "Brand fit",
      value: zone.brandFit.toUpperCase(),
    },
  ];

  if (mode === "ooh") {
    const impressionRange = estimateZoneImpressionRange(zone);
    metrics.push(
      {
        label: "Daily reach",
        value: formatImpressions(zone.impressions?.total ?? 0),
      },
      {
        label: "Range",
        value: impressionRange
          ? `${formatImpressions(impressionRange.low)}-${formatImpressions(impressionRange.high)}`
          : "N/A",
      },
      {
        label: market.oohLabels.ubahn_special,
        value: String(zone.stats.ubahn_special),
      },
      {
        label: "Retail anchors",
        value: String(zone.stats.retail),
      },
    );
    return metrics;
  }

  const breakdown = getBreakdown(zone, market, mode);
  metrics.push(
    {
      label: breakdown[0]?.label ?? "Creative density",
      value: `${breakdown[0]?.value ?? 0}/100`,
    },
    {
      label: breakdown[1]?.label ?? "Retail proximity",
      value: `${breakdown[1]?.value ?? 0}/100`,
    },
    {
      label: "OOH support",
      value: zone.impressions?.total ? formatImpressions(zone.impressions.total) : "Light",
    },
    {
      label: "Gap status",
      value: zone.gapAnalysis?.status.toUpperCase() ?? "N/A",
    },
  );

  return metrics;
}

function buildRecommendationAssumptions(
  zone: Neighbourhood,
  mode: ModeId,
  market: MarketMeta,
): string[] {
  const assumptions = [
    "Zone scores reflect only currently visible layers.",
    `Geometry uses ${zone.dataQuality?.geometryVerified ?? 0} polygon-verified and ${zone.dataQuality?.geometryInferred ?? 0} polygon-inferred points.`,
  ];

  if (mode === "ooh") {
    assumptions.push(
      `Impressions blend named site weights with format multipliers; ${zone.dataQuality?.stationWeighted ?? 0} placements use explicit site weights and ${zone.dataQuality?.defaultImpressions ?? 0} use market defaults.`,
    );
    assumptions.push(
      market.code === "LDN"
        ? "Planning-proxy OOH rows are treated with wider uncertainty bands than named operator or station-linked surfaces."
        : "Unmatched OOH surfaces fall back to category defaults and therefore carry wider uncertainty than named transit nodes.",
    );
  } else {
    assumptions.push(
      "Retail conversion support is directional and based on curated anchors rather than full commercial inventory coverage.",
    );
  }

  return assumptions;
}

export function buildRecommendation(
  mode: ModeId,
  ranked: Neighbourhood[],
  market: MarketMeta,
  focusZone?: Neighbourhood,
): Recommendation | null {
  const topZone = focusZone ?? ranked[0];

  if (!topZone) {
    return null;
  }

  return {
    zone: topZone.name,
    why: recommendationWhy(topZone, mode, market),
    activation: ACTIVATIONS[mode],
    kpis: mode === "ooh" ? oohKpiList(market) : kpiList(market),
    budget: budgetTiers(market)[mode],
    impressionRange: mode === "ooh" ? estimateZoneImpressionRange(topZone) ?? undefined : undefined,
    metrics: buildRecommendationMetrics(topZone, mode, market),
    risks: recommendationRisks(topZone, mode, market),
    assumptions: buildRecommendationAssumptions(topZone, mode, market),
    nextStep: recommendationNextStep(topZone, mode, market),
  };
}

export function summaryLine(zone: Neighbourhood, mode: ModeId, market: MarketMeta) {
  const { stats, brandFit } = zone;

  switch (mode) {
    case "cultural":
      return `${stats.galleries} galleries · ${stats.venues} creative venues · ${brandFit} brand fit`;
    case "retail":
      return `${stats.retail} retail · ${stats.galleries} galleries · premium visibility`;
    case "creator":
      return `${stats.agencies} agencies · ${stats.coworking} coworking · creator density`;
    case "guerrilla":
      return `${stats.venues} music venues · ${stats.schools} schools · high footfall`;
    case "ooh": {
      const total =
        stats.ubahn_poster +
        stats.ubahn_special +
        stats.bridge_banner +
        stats.street_furniture;
      const estimatedReach = zone.impressions?.total
        ? `${formatImpressions(zone.impressions.total)} reach`
        : `${total} OOH`;
      return `${estimatedReach} · ${stats.ubahn_poster + stats.ubahn_special} ${market.code === "BER" ? "U-Bahn" : "transit + digital"} · ${stats.bridge_banner} ${market.code === "BER" ? "bridge" : "large format"} · ${stats.street_furniture} street`;
    }
    default:
      return `${stats.galleries} galleries · ${stats.retail} retail`;
  }
}

export function modeLabel(mode: ModeId) {
  return BASE_MODES.find((item) => item.id === mode)?.label ?? mode;
}

export function heatOpacity(score: number) {
  return clamp(0.06 + score / 430, 0.08, 0.32);
}

export function isOohCategory(category: LocationCategory): category is OOHCategory {
  return OOH_CATEGORIES.includes(category as OOHCategory);
}

export function computeDynamicBounds(
  zone: Neighbourhood,
  locations: LocationsData,
  visibleLayers: Record<LocationCategory, boolean>,
): [[number, number], [number, number]] {
  if (zone.polygon?.length) {
    return polygonBounds(zone.polygon);
  }

  const points: { lat: number; lng: number }[] = [];

  for (const [category, layerPoints] of Object.entries(locations) as [
    LocationCategory,
    LocationPoint[],
  ][]) {
    if (!visibleLayers[category]) continue;
    for (const point of layerPoints) {
      if (resolvePointZone(point, [zone]).zoneName === zone.name) {
        points.push(point);
      }
    }
  }

  if (points.length < 2) {
    return zone.bounds;
  }

  const PAD_LAT = 0.004;
  const PAD_LNG = 0.006;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const point of points) {
    if (point.lat < minLat) minLat = point.lat;
    if (point.lat > maxLat) maxLat = point.lat;
    if (point.lng < minLng) minLng = point.lng;
    if (point.lng > maxLng) maxLng = point.lng;
  }

  return [
    [minLat - PAD_LAT, minLng - PAD_LNG],
    [maxLat + PAD_LAT, maxLng + PAD_LNG],
  ];
}

function createEmptyStats(): NeighbourhoodStats {
  return {
    galleries: 0,
    agencies: 0,
    venues: 0,
    coworking: 0,
    retail: 0,
    schools: 0,
    competitors: 0,
    ubahn_poster: 0,
    ubahn_special: 0,
    bridge_banner: 0,
    street_furniture: 0,
  };
}

function createEmptyImpressions(): NeighbourhoodImpressions {
  return {
    low: 0,
    high: 0,
    expected: 0,
    ubahn_poster: 0,
    ubahn_special: 0,
    bridge_banner: 0,
    street_furniture: 0,
    total: 0,
  };
}

function createEmptyQualityCounters(): ZoneQualityCounters {
  return {
    visiblePoints: 0,
    geometryVerified: 0,
    geometryInferred: 0,
    taggedFallback: 0,
    polygonMismatches: 0,
    stationWeighted: 0,
    defaultImpressions: 0,
  };
}

function getImpressionDetails(point: LocationPoint, category: OOHCategory, market: MarketMeta): ImpressionDetails {
  const lookupKey = extractTransitNodeKey(point.name);
  const matchedValue = lookupKey ? market.transitWeights[lookupKey] : undefined;
  const baseValue = matchedValue ?? market.transitDefaults[category];
  const formatMultiplier = getFormatMultiplier(point, category);
  const contextMultiplier = getContextMultiplier(point, category, matchedValue, market);
  const { min, max } = OOH_CATEGORY_LIMITS[category];
  const value = clamp(Math.round(baseValue * formatMultiplier * contextMultiplier), min, max);
  const confidence = getImpressionConfidence(point, matchedValue);
  const { lowFactor, highFactor } = getImpressionBand(confidence, matchedValue);

  return {
    stationMatched: Boolean(matchedValue),
    confidence,
    contextMultiplier,
    formatMultiplier,
    low: Math.round(value * lowFactor),
    high: Math.round(value * highFactor),
    value,
  };
}

function recommendationRisks(zone: Neighbourhood, mode: ModeId, market: MarketMeta) {
  const risks = [
    zone.dataQuality?.polygonMismatches
      ? `${zone.dataQuality.polygonMismatches} visible placements still rely on manual zone tags rather than polygon confirmation.`
      : "Geometry coverage is stable, but the zone still depends on a curated rather than exhaustive inventory.",
  ];

  if (mode === "ooh") {
    risks.push(
      zone.gapAnalysis?.status === "oversaturated"
        ? "OOH supply is already dense here, so creative quality and retail echo will matter more than incremental inventory."
        : `Inventory availability at the highest-reach ${market.city} digital and transit nodes may compress quickly once buying windows open.`,
    );
  } else if (zone.stats.retail === 0) {
    risks.push("Conversion support is weak in-zone, so the activation needs a deliberate handoff to retail or CRM capture.");
  } else {
    risks.push("Retail adjacency is present, but the shortlist still needs venue-level validation before media goes live.");
  }

  return risks;
}

function recommendationNextStep(zone: Neighbourhood, mode: ModeId, market: MarketMeta) {
  if (mode === "ooh") {
    return `Pressure-test ${zone.name} availability against premium ${market.city} digital and transit inventory, then shortlist the top 15 surfaces by reach, retail fit, and gap opportunity.`;
  }

  return `Validate the top three addresses in ${zone.name} with local ops, then turn the selected route into a timed launch calendar with venue, retail, and creator dependencies.`;
}

function extractTransitNodeKey(name: string) {
  const asciiName = name.normalize("NFD").replace(/\p{Diacritic}/gu, "");

  return normalizeTransitKey(
    asciiName
      .replace(/^U-Bhf\.\s*/i, "")
      .replace(/^U-Bahnhof\s*/i, "")
      .replace(/\s+-\s+U\s*\d.*$/i, "")
      .replace(/\s+U9\b.*$/i, "")
      .replace(/\s+Bstg\..*$/i, "")
      .replace(/\s+Bahnsteig.*$/i, "")
      .replace(/\s+Ausgang.*$/i, "")
      .replace(/\s+Vorhalle.*$/i, "")
      .replace(/\s+Ubergang.*$/i, "")
      .replace(/\s+Zwischengeschoss.*$/i, "")
      .replace(/\s+[A-H](?:\/[A-H])?(?=\s|$).*/i, "")
      .trim(),
  );
}

function getImpressionConfidence(
  point: LocationPoint,
  matchedValue: number | undefined,
): ConfidenceLevel {
  if (matchedValue) {
    return "high";
  }

  const sourceType = `${point.source_type ?? ""}`.toLowerCase();
  if (sourceType.includes("planning")) {
    return "low";
  }

  if (sourceType.includes("global") || sourceType.includes("ocean")) {
    return "medium";
  }

  return "medium";
}

function getImpressionBand(
  confidence: ConfidenceLevel,
  matchedValue: number | undefined,
) {
  if (confidence === "high") {
    return {
      lowFactor: matchedValue ? 0.88 : 0.82,
      highFactor: matchedValue ? 1.12 : 1.18,
    };
  }

  if (confidence === "low") {
    return {
      lowFactor: 0.62,
      highFactor: 1.42,
    };
  }

  return {
    lowFactor: 0.72,
    highFactor: 1.28,
  };
}

function getFormatMultiplier(point: LocationPoint, category: OOHCategory) {
  const mediaType = `${point.media_type ?? ""}`.toLowerCase();

  switch (category) {
    case "ubahn_poster":
      if (mediaType.includes("bus shelter")) return 0.92;
      if (mediaType.includes("advertising panel")) return 0.95;
      if (mediaType.includes("poster")) return 1;
      return 0.94;
    case "ubahn_special":
      if (mediaType.includes("digital roadside billboard")) return 1.45;
      if (mediaType.includes("digital")) return 1.25;
      if (mediaType.includes("floor")) return 0.62;
      if (mediaType.includes("stair") || mediaType.includes("treppen")) return 0.76;
      return 1.08;
    case "bridge_banner":
      if (mediaType.includes("billboard") || mediaType.includes("hoarding")) return 1.25;
      if (mediaType.includes("banner") || mediaType.includes("wrap")) return 1.08;
      return 1.12;
    case "street_furniture":
      if (mediaType.includes("city light")) return 1.05;
      if (mediaType.includes("telephone kiosk")) return 0.58;
      if (mediaType.includes("totem")) return 0.9;
      if (mediaType.includes("signage")) return 0.52;
      return 0.86;
    default:
      return 1;
  }
}

function getContextMultiplier(
  point: LocationPoint,
  category: OOHCategory,
  matchedValue: number | undefined,
  market: MarketMeta,
) {
  const text = `${point.name} ${point.media_type ?? ""} ${point.district ?? ""} ${point.area ?? ""}`.toLowerCase();
  let multiplier = matchedValue ? 1.04 : 1;

  if (
    /westfield|piccadilly|leicester square|canary wharf|heathrow|oxford street|london bridge|alexanderplatz|zoologischer|kurfurstendamm|warschauer|kottbusser|hermannplatz/.test(
      text,
    )
  ) {
    multiplier += 0.12;
  }

  if (/ticket hall|bahnsteig|platform|ausgang|vorhalle|crossrail|broadway/.test(text)) {
    multiplier += 0.05;
  }

  if (category === "street_furniture" && /phone box|telephone kiosk/.test(text)) {
    multiplier -= 0.08;
  }

  if (market.code === "LDN" && /planning application core proxy/.test(`${point.source_type ?? ""}`.toLowerCase())) {
    multiplier -= 0.04;
  }

  return clamp(Number(multiplier.toFixed(2)), 0.45, 1.35);
}

function normalizeTransitKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function metricPercent(value: number, max: number) {
  if (max <= 0 || value <= 0) {
    return 0;
  }

  return clamp(Math.round((value / max) * 100), 0, 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
