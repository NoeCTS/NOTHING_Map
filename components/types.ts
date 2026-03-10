export type ModeId = "cultural" | "retail" | "creator" | "guerrilla" | "ooh";

export type LocationCategory =
  | "retail"
  | "galleries"
  | "agencies"
  | "coworking"
  | "venues"
  | "schools"
  | "ubahn_poster"
  | "ubahn_special"
  | "bridge_banner"
  | "street_furniture";

export type OOHCategory = "ubahn_poster" | "ubahn_special" | "bridge_banner" | "street_furniture";
export type BrandFit = "high" | "medium" | "low";
export type GapStatus = "opportunity" | "balanced" | "oversaturated";

export interface LocationPoint {
  name: string;
  lat: number;
  lng: number;
  area?: string;
  type?: string;
  district?: string;
  plz?: string;
}

export interface LocationsData {
  retail: LocationPoint[];
  galleries: LocationPoint[];
  agencies: LocationPoint[];
  coworking: LocationPoint[];
  venues: LocationPoint[];
  schools: LocationPoint[];
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
  ubahn_poster: number;
  ubahn_special: number;
  bridge_banner: number;
  street_furniture: number;
}

export interface NeighbourhoodImpressions {
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

export interface Neighbourhood {
  name: string;
  scores: NeighbourhoodScores;
  stats: NeighbourhoodStats;
  description: string;
  brandFit: BrandFit;
  bounds: [[number, number], [number, number]];
  impressions?: NeighbourhoodImpressions;
  gapAnalysis?: GapAnalysisResult;
}

export interface Recommendation {
  zone: string;
  why: string[];
  activation: string;
  kpis: string[];
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
