import {
  BreakdownMetric,
  BrandFit,
  LocationCategory,
  LocationPoint,
  LocationsData,
  ModeId,
  Neighbourhood,
  NeighbourhoodImpressions,
  NeighbourhoodStats,
  OOHCategory,
  Recommendation,
} from "@/components/types";
import { TRANSIT_DEFAULTS, TRANSIT_WEIGHTS } from "@/data/transit_weights";

export const MODES: { id: ModeId; label: string; blurb: string }[] = [
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
    blurb: "Maps 5,000+ out-of-home surfaces: U-Bahn posters, track billboards, bridge banners, street furniture.",
  },
];

export const LAYER_CONFIG: {
  id: LocationCategory;
  label: string;
  color: "accent" | "white" | "grey" | "orange" | "cyan" | "yellow" | "magenta" | "lime";
}[] = [
  { id: "retail", label: "Retail Partners", color: "accent" },
  { id: "galleries", label: "Galleries", color: "white" },
  { id: "agencies", label: "Creative Agencies", color: "white" },
  { id: "coworking", label: "Coworking Spaces", color: "grey" },
  { id: "venues", label: "Music Venues", color: "grey" },
  { id: "schools", label: "Design Schools", color: "grey" },
  { id: "ubahn_poster", label: "U-Bahn Posters", color: "orange" },
  { id: "ubahn_special", label: "U-Bahn Premium", color: "magenta" },
  { id: "bridge_banner", label: "Bridge Banners", color: "cyan" },
  { id: "street_furniture", label: "Street Furniture", color: "lime" },
];

export const OOH_CATEGORIES: OOHCategory[] = ["ubahn_poster", "ubahn_special", "bridge_banner", "street_furniture"];

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

interface ZoneDynamicStats {
  stats: NeighbourhoodStats;
  impressions: NeighbourhoodImpressions;
}

const ACTIVATIONS: Record<ModeId, string> = {
  cultural:
    "Pop-up in gallery space + wheat-paste poster campaign + Glyph projection event",
  retail:
    "Endcap display programme in Saturn/MediaMarkt + staff training with community intelligence signals + in-store Nothing experience zone",
  creator:
    "Seed product to 20 local creators in design, architecture, and lifestyle + host creator dinner at coworking space + launch Berlin-specific Community Edition",
  guerrilla:
    "Wheat-paste campaign across 50+ locations + U-Bahn takeover + Glyph projections on buildings + limited drop at music venues",
  ooh:
    "Takeover U-Bahn poster + premium placements in highest-density stations + bridge banner blitz across Kreuzberg/Friedrichshain corridors + street furniture branding at key transit nodes + coordinate with retail partners for in-store echo",
};

export const KPI_LIST = [
  "Branded search uplift (Google Trends DE, Berlin versus control city)",
  "Retail footfall and sell-through (Saturn/MediaMarkt data)",
  "Social mentions (#NothingBerlin)",
  "CRM capture (email/SMS opt-in from QR codes)",
  "Creator content engagement (view-through rate, saves)",
];

const OOH_KPI_LIST = [
  "OOH impression estimates (U-Bahn station footfall data)",
  "Branded search uplift (Google Trends DE, Berlin versus control city)",
  "QR code scan-through rate (street furniture + bridge banner placements)",
  "Retail footfall uplift within 500m of OOH placements",
  "Social mentions (#NothingBerlin, geo-tagged posts near placements)",
];

const OOH_METRIC_CAPS = {
  total: 12_000_000,
  ubahn_poster: 4_000_000,
  ubahn_special: 6_000_000,
  bridge_banner: 1_200_000,
  street_furniture: 2_000_000,
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

export function computeDynamicStats(
  neighbourhoods: Neighbourhood[],
  locations: LocationsData,
  visibleLayers: Record<LocationCategory, boolean>,
): Record<string, ZoneDynamicStats> {
  const zoneNames = new Set(neighbourhoods.map((zone) => zone.name));
  const byZone = Object.fromEntries(
    neighbourhoods.map((zone) => [
      zone.name,
      {
        stats: createEmptyStats(),
        impressions: createEmptyImpressions(),
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
      if (!point.area || !zoneNames.has(point.area)) {
        continue;
      }

      const zoneBucket = byZone[point.area];
      zoneBucket.stats[category] += 1;

      if (isOohCategory(category)) {
        const impressions = getImpressions(point, category);
        zoneBucket.impressions[category] += impressions;
        zoneBucket.impressions.total += impressions;
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

export function getImpressions(point: LocationPoint, category: LocationCategory): number {
  if (!isOohCategory(category)) {
    return 0;
  }

  const lookupKey = extractTransitNodeKey(point.name);
  if (lookupKey && TRANSIT_WEIGHTS[lookupKey]) {
    return TRANSIT_WEIGHTS[lookupKey];
  }

  return TRANSIT_DEFAULTS[category];
}

export function formatImpressions(value: number) {
  return IMPRESSION_FORMATTER.format(value).toUpperCase();
}

export function getBreakdown(zone: Neighbourhood, mode?: ModeId): BreakdownMetric[] {
  if (mode === "ooh") {
    const impressions = zone.impressions ?? createEmptyImpressions();
    return [
      {
        label: "Daily reach",
        value: metricPercent(impressions.total, OOH_METRIC_CAPS.total),
        displayValue: formatImpressions(impressions.total),
      },
      {
        label: "U-Bahn posters",
        value: metricPercent(impressions.ubahn_poster, OOH_METRIC_CAPS.ubahn_poster),
        displayValue: formatImpressions(impressions.ubahn_poster),
      },
      {
        label: "U-Bahn premium",
        value: metricPercent(impressions.ubahn_special, OOH_METRIC_CAPS.ubahn_special),
        displayValue: formatImpressions(impressions.ubahn_special),
      },
      {
        label: "Street + bridge",
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

export function recommendationWhy(zone: Neighbourhood, mode: ModeId) {
  const stats = zone.stats;

  if (mode === "ooh") {
    const totalOoh = stats.ubahn_poster + stats.ubahn_special + stats.bridge_banner + stats.street_furniture;
    const estimatedReach = formatImpressions(zone.impressions?.total ?? 0);
    return [
      zone.description.split(". ")[0] + ".",
      `${totalOoh} OOH surfaces drive roughly ${estimatedReach} daily impressions, led by ${stats.ubahn_poster} U-Bahn poster slots, ${stats.ubahn_special} premium formats, ${stats.bridge_banner} bridge banners, and ${stats.street_furniture} street furniture placements.`,
      `Pairing that media weight with ${stats.retail} retail touchpoint${stats.retail === 1 ? "" : "s"} creates a clear awareness-to-conversion corridor.`,
    ];
  }

  switch (mode) {
    case "cultural":
      return [
        zone.description.split(". ")[0] + ".",
        `${stats.galleries} galleries, ${stats.venues} music venues, and ${stats.agencies} creative agencies create the strongest cultural stack in-zone.`,
        `${stats.retail} retail partner${stats.retail === 1 ? "" : "s"} sit within reach for conversion once awareness spikes.`,
      ];
    case "retail":
      return [
        zone.description.split(". ")[0] + ".",
        `${stats.retail} retail touchpoint${stats.retail === 1 ? "" : "s"} plus ${stats.galleries} galleries give this zone the cleanest mix of visibility and brand context.`,
        `The area supports flagship moments while still linking directly to Saturn and MediaMarkt sell-through.`,
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

export function buildRecommendation(
  mode: ModeId,
  ranked: Neighbourhood[],
): Recommendation | null {
  const topZone = ranked[0];

  if (!topZone) {
    return null;
  }

  return {
    zone: topZone.name,
    why: recommendationWhy(topZone, mode),
    activation: ACTIVATIONS[mode],
    kpis: mode === "ooh" ? OOH_KPI_LIST : KPI_LIST,
  };
}

export function summaryLine(zone: Neighbourhood, mode: ModeId) {
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
      const total = stats.ubahn_poster + stats.ubahn_special + stats.bridge_banner + stats.street_furniture;
      const estimatedReach = zone.impressions?.total
        ? `${formatImpressions(zone.impressions.total)} reach`
        : `${total} OOH`;
      return `${estimatedReach} · ${stats.ubahn_poster + stats.ubahn_special} U-Bahn · ${stats.bridge_banner} bridge · ${stats.street_furniture} street`;
    }
    default:
      return `${stats.galleries} galleries · ${stats.retail} retail`;
  }
}

export function modeLabel(mode: ModeId) {
  return MODES.find((item) => item.id === mode)?.label ?? mode;
}

export function heatOpacity(score: number) {
  return clamp(0.06 + score / 430, 0.08, 0.32);
}

export function isOohCategory(category: LocationCategory): category is OOHCategory {
  return OOH_CATEGORIES.includes(category as OOHCategory);
}

/**
 * Compute dynamic bounds for a neighbourhood based on which layers are visible.
 * Collects all visible points that belong to the zone and returns a tight bounding box.
 * Falls back to the static bounds if no visible points exist.
 */
export function computeDynamicBounds(
  zone: Neighbourhood,
  locations: LocationsData,
  visibleLayers: Record<LocationCategory, boolean>,
): [[number, number], [number, number]] {
  const points: { lat: number; lng: number }[] = [];

  for (const [category, layerPoints] of Object.entries(locations) as [
    LocationCategory,
    LocationPoint[],
  ][]) {
    if (!visibleLayers[category]) continue;
    for (const point of layerPoints) {
      if (point.area === zone.name) {
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
    ubahn_poster: 0,
    ubahn_special: 0,
    bridge_banner: 0,
    street_furniture: 0,
  };
}

function createEmptyImpressions(): NeighbourhoodImpressions {
  return {
    ubahn_poster: 0,
    ubahn_special: 0,
    bridge_banner: 0,
    street_furniture: 0,
    total: 0,
  };
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
