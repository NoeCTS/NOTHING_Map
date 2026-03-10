import {
  MarketDataset,
  MarketId,
  MarketMeta,
  Neighbourhood,
  LocationsData,
} from "@/components/types";
import { MARKET as BERLIN_MARKET_CORE } from "@/data/berlinMarket";
import locationsBerlin from "@/data/locations.json";
import berlinOohLocations from "@/data/ooh_locations.json";
import berlinNeighbourhoodsData from "@/data/neighbourhoods.json";
import {
  DATA_REFRESH_DATE as BERLIN_DATA_REFRESH_DATE,
  DATA_SOURCE_META as BERLIN_DATA_SOURCE_META,
  ZONE_POLYGONS as BERLIN_ZONE_POLYGONS,
} from "@/data/zoneMetadata";
import {
  TRANSIT_DEFAULTS as BERLIN_TRANSIT_DEFAULTS,
  TRANSIT_WEIGHTS as BERLIN_TRANSIT_WEIGHTS,
} from "@/data/transit_weights";
import { MARKET as LONDON_MARKET_CORE } from "@/data/londonMarket";
import locationsLondon from "@/data/london_locations.json";
import londonOohLocations from "@/data/london_ooh_locations.json";
import londonNeighbourhoodsData from "@/data/london_neighbourhoods.json";
import {
  DATA_REFRESH_DATE as LONDON_DATA_REFRESH_DATE,
  DATA_SOURCE_META as LONDON_DATA_SOURCE_META,
  ZONE_POLYGONS as LONDON_ZONE_POLYGONS,
} from "@/data/londonZoneMetadata";
import {
  TRANSIT_DEFAULTS as LONDON_TRANSIT_DEFAULTS,
  TRANSIT_WEIGHTS as LONDON_TRANSIT_WEIGHTS,
} from "@/data/londonTransitWeights";

export const MARKET_OPTIONS: { id: MarketId; label: string }[] = [
  { id: "BER", label: "Berlin" },
  { id: "LDN", label: "London" },
];

const DEFAULT_MARKET_ID: MarketId = "LDN";

function mergeLocations(
  locations: Omit<LocationsData, "ubahn_poster" | "ubahn_special" | "bridge_banner" | "street_furniture">,
  oohLocations: Pick<LocationsData, "ubahn_poster" | "ubahn_special" | "bridge_banner" | "street_furniture">,
): LocationsData {
  return {
    ...locations,
    ubahn_poster: oohLocations.ubahn_poster,
    ubahn_special: oohLocations.ubahn_special,
    bridge_banner: oohLocations.bridge_banner,
    street_furniture: oohLocations.street_furniture,
  };
}

function enrichNeighbourhoods(
  neighbourhoods: { neighbourhoods: Neighbourhood[] },
  zonePolygons: Record<string, [number, number][]>,
) {
  return neighbourhoods.neighbourhoods.map((zone) => ({
    ...zone,
    polygon: zonePolygons[zone.name] ?? zone.polygon,
  })) as Neighbourhood[];
}

function buildMarketMeta(
  base: Omit<
    MarketMeta,
    "dataRefreshDate" | "dataSourceMeta" | "transitDefaults" | "transitWeights" | "zonePolygons"
  >,
  options: Pick<
    MarketMeta,
    "dataRefreshDate" | "dataSourceMeta" | "transitDefaults" | "transitWeights" | "zonePolygons"
  >,
): MarketMeta {
  return {
    ...base,
    ...options,
  };
}

export const MARKETS: Record<MarketId, MarketDataset> = {
  BER: {
    meta: buildMarketMeta(BERLIN_MARKET_CORE, {
      dataRefreshDate: BERLIN_DATA_REFRESH_DATE,
      dataSourceMeta: BERLIN_DATA_SOURCE_META,
      transitDefaults: BERLIN_TRANSIT_DEFAULTS,
      transitWeights: BERLIN_TRANSIT_WEIGHTS,
      zonePolygons: BERLIN_ZONE_POLYGONS,
    }),
    locations: mergeLocations(
      locationsBerlin as Omit<LocationsData, "ubahn_poster" | "ubahn_special" | "bridge_banner" | "street_furniture">,
      berlinOohLocations as Pick<
        LocationsData,
        "ubahn_poster" | "ubahn_special" | "bridge_banner" | "street_furniture"
      >,
    ),
    neighbourhoods: enrichNeighbourhoods(
      berlinNeighbourhoodsData as { neighbourhoods: Neighbourhood[] },
      BERLIN_ZONE_POLYGONS,
    ),
  },
  LDN: {
    meta: buildMarketMeta(LONDON_MARKET_CORE, {
      dataRefreshDate: LONDON_DATA_REFRESH_DATE,
      dataSourceMeta: LONDON_DATA_SOURCE_META,
      transitDefaults: LONDON_TRANSIT_DEFAULTS,
      transitWeights: LONDON_TRANSIT_WEIGHTS,
      zonePolygons: LONDON_ZONE_POLYGONS,
    }),
    locations: mergeLocations(
      locationsLondon as Omit<LocationsData, "ubahn_poster" | "ubahn_special" | "bridge_banner" | "street_furniture">,
      londonOohLocations as Pick<
        LocationsData,
        "ubahn_poster" | "ubahn_special" | "bridge_banner" | "street_furniture"
      >,
    ),
    neighbourhoods: enrichNeighbourhoods(
      londonNeighbourhoodsData as { neighbourhoods: Neighbourhood[] },
      LONDON_ZONE_POLYGONS,
    ),
  },
};

export function isMarketId(value: string | undefined): value is MarketId {
  return value === "BER" || value === "LDN";
}

export function resolveMarketId(value: string | undefined): MarketId {
  return isMarketId(value) ? value : DEFAULT_MARKET_ID;
}

export function getMarketDataset(value: string | undefined) {
  return MARKETS[resolveMarketId(value)];
}
