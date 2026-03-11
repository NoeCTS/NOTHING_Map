import {
  ComputedRoute,
  ComputedRouteLeg,
  LocationCategory,
  LocationPoint,
  LocationsData,
  MarketMeta,
  OOHCategory,
  RouteLeg,
  RouteOohAnalysis,
  RouteOohEncounter,
  RoutePathPoint,
  RouteSummary,
  RouteWaypoint,
} from "@/components/types";
import { getImpressions } from "@/lib/groundSignal";

const WALKING_SPEED_KMH = 4.8;
const EARTH_RADIUS_METERS = 6371000;
const WALKING_CORRIDOR_BUFFER_METERS = 70;
const ROUTE_OOH_CATEGORIES: OOHCategory[] = [
  "ubahn_poster",
  "ubahn_special",
  "bridge_banner",
  "street_furniture",
];

export function summarizeRoute(
  waypoints: RouteWaypoint[],
  computedRoute?: ComputedRoute | null,
): RouteSummary {
  const legs = buildSummaryLegs(waypoints, computedRoute);
  const totalDistanceMeters =
    computedRoute?.distanceMeters ?? legs.reduce((sum, leg) => sum + leg.distanceMeters, 0);
  const walkingMinutes =
    computedRoute?.durationSeconds != null
      ? Math.max(1, Math.round(computedRoute.durationSeconds / 60))
      : estimateTravelMinutes(totalDistanceMeters, WALKING_SPEED_KMH);
  const categoryCounts = waypoints.reduce<Partial<Record<LocationCategory, number>>>((counts, waypoint) => {
    counts[waypoint.category] = (counts[waypoint.category] ?? 0) + 1;
    return counts;
  }, {});
  const uniqueZones = [...new Set(waypoints.flatMap((waypoint) => (waypoint.zoneName ? [waypoint.zoneName] : [])))];

  return {
    categoryCounts,
    legs,
    stopCount: waypoints.length,
    totalDistanceMeters,
    uniqueZones,
    walkingMinutes,
  };
}

export function buildFallbackComputedRoute(waypoints: RouteWaypoint[]): ComputedRoute {
  const path = waypoints.map(({ lat, lng }) => ({ lat, lng }));
  const legs = buildRouteLegGeometry(waypoints, path);
  const distanceMeters = legs.reduce((sum, leg) => sum + leg.distanceMeters, 0);

  return {
    distanceMeters,
    durationSeconds: estimateTravelMinutes(distanceMeters, WALKING_SPEED_KMH) * 60,
    legs,
    mode: "walk",
    path,
    provider: "fallback",
    reason: "straight_line_fallback",
  };
}

export function optimizeRouteWaypoints(waypoints: RouteWaypoint[]) {
  if (waypoints.length < 3) {
    return waypoints;
  }

  const [start, ...rest] = waypoints;
  const ordered = [start];
  const remaining = [...rest];

  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    remaining.forEach((candidate, index) => {
      const distance = getDistanceMeters(last, candidate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    ordered.push(remaining.splice(nearestIndex, 1)[0]);
  }

  return ordered;
}

export function analyzeRouteOohCorridor(
  waypoints: RouteWaypoint[],
  locations: LocationsData,
  visibleLayers: Record<LocationCategory, boolean>,
  market: MarketMeta,
  computedRoute?: ComputedRoute | null,
): RouteOohAnalysis {
  const geometry = computedRoute ?? buildFallbackComputedRoute(waypoints);
  if (!geometry.legs.length) {
    return {
      bufferMeters: WALKING_CORRIDOR_BUFFER_METERS,
      counts: {},
      hits: [],
      totalEstimatedImpressions: 0,
      totalHits: 0,
    };
  }

  const hits: RouteOohEncounter[] = [];
  const counts: Partial<Record<OOHCategory, number>> = {};

  ROUTE_OOH_CATEGORIES.filter((category) => visibleLayers[category] && locations[category]).forEach((category) => {
    locations[category].forEach((point) => {
      let nearestLegIndex = -1;
      let nearestDistance = Infinity;

      geometry.legs.forEach((leg, legIndex) => {
        const distance = getPointToPathDistanceMeters(point, leg.path);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestLegIndex = legIndex;
        }
      });

      if (nearestDistance > WALKING_CORRIDOR_BUFFER_METERS || nearestLegIndex < 0) {
        return;
      }

      hits.push({
        category,
        distanceMeters: nearestDistance,
        impressions: getImpressions(point, category, market),
        lat: point.lat,
        legIndex: nearestLegIndex,
        lng: point.lng,
        name: point.name,
      });
      counts[category] = (counts[category] ?? 0) + 1;
    });
  });

  const sortedHits = hits.sort((left, right) => {
    if (left.legIndex !== right.legIndex) {
      return left.legIndex - right.legIndex;
    }
    if (Math.abs(left.distanceMeters - right.distanceMeters) > 10) {
      return left.distanceMeters - right.distanceMeters;
    }
    return right.impressions - left.impressions;
  });

  return {
    bufferMeters: WALKING_CORRIDOR_BUFFER_METERS,
    counts,
    hits: sortedHits,
    totalEstimatedImpressions: sortedHits.reduce((sum, hit) => sum + hit.impressions, 0),
    totalHits: sortedHits.length,
  };
}

export function formatRouteDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

export function formatTravelMinutes(totalMinutes: number) {
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }

  return `${totalMinutes} min`;
}

function buildRouteLegs(waypoints: RouteWaypoint[]): RouteLeg[] {
  const legs: RouteLeg[] = [];

  for (let index = 1; index < waypoints.length; index += 1) {
    const from = waypoints[index - 1];
    const to = waypoints[index];

    legs.push({
      distanceMeters: getDistanceMeters(from, to),
      from,
      to,
    });
  }

  return legs;
}

function estimateTravelMinutes(distanceMeters: number, speedKmh: number) {
  if (distanceMeters <= 0) {
    return 0;
  }

  const metersPerMinute = (speedKmh * 1000) / 60;
  return Math.max(1, Math.round(distanceMeters / metersPerMinute));
}

function getDistanceMeters(
  left: Pick<RouteWaypoint, "lat" | "lng"> | RoutePathPoint,
  right: Pick<RouteWaypoint, "lat" | "lng"> | RoutePathPoint,
) {
  const leftLat = toRadians(left.lat);
  const rightLat = toRadians(right.lat);
  const deltaLat = toRadians(right.lat - left.lat);
  const deltaLng = toRadians(right.lng - left.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function buildSummaryLegs(
  waypoints: RouteWaypoint[],
  computedRoute?: ComputedRoute | null,
): RouteLeg[] {
  if (!computedRoute || computedRoute.legs.length !== Math.max(waypoints.length - 1, 0)) {
    return buildRouteLegs(waypoints);
  }

  return computedRoute.legs.map((leg, index) => ({
    distanceMeters: leg.distanceMeters,
    durationSeconds: leg.durationSeconds,
    from: waypoints[index],
    to: waypoints[index + 1],
  }));
}

function buildRouteLegGeometry(
  waypoints: RouteWaypoint[],
  routePath?: RoutePathPoint[],
): ComputedRouteLeg[] {
  const fallbackLegs = waypoints.slice(1).map((to, index) => {
    const from = waypoints[index];
    const legPath = routePath && routePath.length > index + 1
      ? [routePath[index], routePath[index + 1]]
      : [
          { lat: from.lat, lng: from.lng },
          { lat: to.lat, lng: to.lng },
        ];
    const distanceMeters = getPathDistanceMeters(legPath);

    return {
      distanceMeters,
      durationSeconds: estimateTravelMinutes(distanceMeters, WALKING_SPEED_KMH) * 60,
      path: legPath,
    } satisfies ComputedRouteLeg;
  });

  return fallbackLegs;
}

function getPointToPathDistanceMeters(point: LocationPoint, path: RoutePathPoint[]) {
  if (path.length < 2) {
    return Infinity;
  }

  let shortestDistance = Infinity;

  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    const referenceLat = (from.lat + to.lat + point.lat) / 3;
    const referenceLng = from.lng;
    const fromProjected = projectToMeters(from.lat, from.lng, referenceLat, referenceLng);
    const toProjected = projectToMeters(to.lat, to.lng, referenceLat, referenceLng);
    const target = projectToMeters(point.lat, point.lng, referenceLat, referenceLng);
    const dx = toProjected.x - fromProjected.x;
    const dy = toProjected.y - fromProjected.y;
    const lengthSquared = dx * dx + dy * dy;

    const distance =
      lengthSquared === 0
        ? Math.hypot(target.x - fromProjected.x, target.y - fromProjected.y)
        : (() => {
            const t = clamp(
              ((target.x - fromProjected.x) * dx + (target.y - fromProjected.y) * dy) / lengthSquared,
              0,
              1,
            );
            const closestX = fromProjected.x + t * dx;
            const closestY = fromProjected.y + t * dy;

            return Math.hypot(target.x - closestX, target.y - closestY);
          })();

    if (distance < shortestDistance) {
      shortestDistance = distance;
    }
  }

  return shortestDistance;
}

function getPathDistanceMeters(path: RoutePathPoint[]) {
  let total = 0;

  for (let index = 1; index < path.length; index += 1) {
    total += getDistanceMeters(path[index - 1], path[index]);
  }

  return total;
}

function projectToMeters(lat: number, lng: number, referenceLat: number, referenceLng: number) {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = Math.cos(toRadians(referenceLat)) * 111320;

  return {
    x: (lng - referenceLng) * metersPerDegreeLng,
    y: (lat - referenceLat) * metersPerDegreeLat,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
