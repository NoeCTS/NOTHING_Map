import { LocationPoint, Neighbourhood } from "@/components/types";

export type AssignmentMethod =
  | "polygon_verified"
  | "polygon_inferred"
  | "tagged_fallback"
  | "tagged_mismatch"
  | "unassigned";

export interface ZoneAssignment {
  method: AssignmentMethod;
  polygonZoneName?: string;
  zoneName?: string;
}

export function resolvePointZone(
  point: LocationPoint,
  neighbourhoods: Neighbourhood[],
): ZoneAssignment {
  const taggedZone = point.area ? neighbourhoods.find((zone) => zone.name === point.area) : undefined;
  const polygonZone = neighbourhoods.find(
    (zone) => zone.polygon && pointInPolygon([point.lat, point.lng], zone.polygon),
  );

  if (taggedZone?.polygon && pointInPolygon([point.lat, point.lng], taggedZone.polygon)) {
    return {
      zoneName: taggedZone.name,
      method: "polygon_verified",
      polygonZoneName: taggedZone.name,
    };
  }

  if (!point.area && polygonZone) {
    return {
      zoneName: polygonZone.name,
      method: "polygon_inferred",
      polygonZoneName: polygonZone.name,
    };
  }

  if (taggedZone && polygonZone && polygonZone.name !== taggedZone.name) {
    return {
      zoneName: taggedZone.name,
      method: "tagged_mismatch",
      polygonZoneName: polygonZone.name,
    };
  }

  if (taggedZone) {
    return {
      zoneName: taggedZone.name,
      method: "tagged_fallback",
      polygonZoneName: polygonZone?.name,
    };
  }

  if (polygonZone) {
    return {
      zoneName: polygonZone.name,
      method: "polygon_inferred",
      polygonZoneName: polygonZone.name,
    };
  }

  return {
    method: "unassigned",
  };
}

export function pointInPolygon(point: [number, number], polygon: [number, number][]) {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const intersects =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI || Number.EPSILON) + latI;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function polygonBounds(polygon: [number, number][]): [[number, number], [number, number]] {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  polygon.forEach(([lat, lng]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
