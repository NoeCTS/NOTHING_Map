export type ModeId = "cultural" | "retail" | "creator" | "guerrilla" | "ooh";
export type MarketId = "BER" | "LDN";

export type LocationCategory =
  | "retail"
  | "galleries"
  | "agencies"
  | "coworking"
  | "venues"
  | "schools"
  | "competitors"
  | "ubahn_poster"
  | "ubahn_special"
  | "bridge_banner"
  | "street_furniture";

export type OOHCategory = "ubahn_poster" | "ubahn_special" | "bridge_banner" | "street_furniture";
export type BrandFit = "high" | "medium" | "low";
export type GapStatus = "opportunity" | "balanced" | "oversaturated";
export type ConfidenceLevel = "high" | "medium" | "low";
export type ScenarioSlotId = "A" | "B";

export interface LocationPoint {
  name: string;
  lat: number;
  lng: number;
  area?: string;
  type?: string;
  district?: string;
  media_type?: string;
  plz?: string;
  source_type?: string;
}

export interface LocationsData {
  retail: LocationPoint[];
  galleries: LocationPoint[];
  agencies: LocationPoint[];
  coworking: LocationPoint[];
  venues: LocationPoint[];
  schools: LocationPoint[];
  competitors: LocationPoint[];
  ubahn_poster: LocationPoint[];
  ubahn_special: LocationPoint[];
  bridge_banner: LocationPoint[];
  street_furniture: LocationPoint[];
}

export interface NeighbourhoodScores {
  cultural: number;
  retail: number;
  creator: number;
  guerrilla: number;
  ooh: number;
}

export interface NeighbourhoodStats {
  galleries: number;
  agencies: number;
  venues: number;
  coworking: number;
  retail: number;
  schools: number;
  competitors: number;
  ubahn_poster: number;
  ubahn_special: number;
  bridge_banner: number;
  street_furniture: number;
}

export interface NeighbourhoodImpressions {
  high: number;
  low: number;
  expected?: number;
  ubahn_poster: number;
  ubahn_special: number;
  bridge_banner: number;
  street_furniture: number;
  total: number;
}

export interface GapAnalysisResult {
  cultural: number;
  ooh: number;
  gap: number;
  status: GapStatus;
}

export interface ScoreDriver {
  category: LocationCategory;
  label: string;
  weight: number;
  currentValue: number;
  baselineValue: number;
  completeness: number;
  contribution: number;
  displayCurrent: string;
  displayBaseline: string;
}

export interface ScoreExplanation {
  baseScore: number;
  currentScore: number;
  delta: number;
  completeness: number;
  drivers: ScoreDriver[];
}

export interface DataQualitySummary {
  score: number;
  level: ConfidenceLevel;
  visiblePoints: number;
  geometryVerified: number;
  geometryInferred: number;
  taggedFallback: number;
  polygonMismatches: number;
  stationWeighted: number;
  defaultImpressions: number;
  visibleSources: string[];
  lastUpdated: string;
  notes: string[];
}

export interface Neighbourhood {
  name: string;
  scores: NeighbourhoodScores;
  stats: NeighbourhoodStats;
  description: string;
  brandFit: BrandFit;
  bounds: [[number, number], [number, number]];
  polygon?: [number, number][];
  impressions?: NeighbourhoodImpressions;
  gapAnalysis?: GapAnalysisResult;
  dataQuality?: DataQualitySummary;
  scoreExplanations?: Partial<Record<ModeId, ScoreExplanation>>;
}

export interface Recommendation {
  zone: string;
  why: string[];
  activation: string;
  kpis: string[];
  budget: string;
  impressionRange?: ImpressionRange;
  metrics: RecommendationMetric[];
  risks: string[];
  assumptions: string[];
  nextStep: string;
}

export interface RecommendationMetric {
  label: string;
  value: string;
}

export interface ImpressionRange {
  confidence: ConfidenceLevel;
  expected: number;
  high: number;
  low: number;
}

export interface BreakdownMetric {
  label: string;
  value: number;
  displayValue?: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: LocationCategory;
  zoneName?: string;
}

export interface RoutePathPoint {
  lat: number;
  lng: number;
}

export interface RouteLeg {
  distanceMeters: number;
  from: RouteWaypoint;
  to: RouteWaypoint;
  durationSeconds?: number;
}

export interface RouteSummary {
  categoryCounts: Partial<Record<LocationCategory, number>>;
  legs: RouteLeg[];
  stopCount: number;
  totalDistanceMeters: number;
  uniqueZones: string[];
  walkingMinutes: number;
}

export interface ComputedRouteLeg {
  distanceMeters: number;
  durationSeconds: number;
  path: RoutePathPoint[];
}

export interface ComputedRoute {
  distanceMeters: number;
  durationSeconds: number;
  legs: ComputedRouteLeg[];
  mode: "walk";
  path: RoutePathPoint[];
  provider: "fallback" | "osrm";
  reason?: string;
}

export interface RouteOohEncounter {
  category: OOHCategory;
  distanceMeters: number;
  impressions: number;
  lat: number;
  legIndex: number;
  lng: number;
  name: string;
}

export interface RouteOohAnalysis {
  bufferMeters: number;
  counts: Partial<Record<OOHCategory, number>>;
  hits: RouteOohEncounter[];
  totalEstimatedImpressions: number;
  totalHits: number;
}

export interface ScenarioSnapshot {
  slot: ScenarioSlotId | "CURRENT";
  label: string;
  savedAt: string;
  activeMode: ModeId;
  visibleLayers: Record<LocationCategory, boolean>;
  heatmapEnabled: boolean;
  gapAnalysisEnabled: boolean;
  radiusOverlay: boolean;
  markersVisible: boolean;
  selectedZoneName: string;
  rankedZones: Neighbourhood[];
}

export interface ScenarioDiffLine {
  label: string;
  value: string;
}

export interface ScenarioComparison {
  title: string;
  lines: ScenarioDiffLine[];
}

export interface LocationSourceMeta {
  confidence: ConfidenceLevel;
  note: string;
  source: string;
  updatedAt: string;
}

export interface MarketMeta {
  code: MarketId;
  city: string;
  locationLabel: string;
  reportTitle: string;
  mapTitle: string;
  center: [number, number];
  coordsLabel: string;
  retailLabel: string;
  agenciesLabel: string;
  venuesLabel: string;
  oohLabels: Record<OOHCategory, string>;
  oohModeBlurb: string;
  hashtag: string;
  searchRegion: string;
  dataRefreshDate: string;
  dataSourceMeta: Record<LocationCategory, LocationSourceMeta>;
  transitDefaults: Record<OOHCategory, number>;
  transitWeights: Record<string, number>;
  zonePolygons: Record<string, [number, number][]>;
}

export interface MarketDataset {
  meta: MarketMeta;
  locations: LocationsData;
  neighbourhoods: Neighbourhood[];
}
