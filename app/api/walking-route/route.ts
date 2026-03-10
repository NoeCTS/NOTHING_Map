import { NextRequest, NextResponse } from "next/server";
import { ComputedRoute, ComputedRouteLeg, RoutePathPoint, RouteWaypoint } from "@/components/types";
import { buildFallbackComputedRoute } from "@/lib/routePlanner";

export const runtime = "nodejs";

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: [number, number][];
      type?: string;
    };
  }>;
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const rawWaypoints = Array.isArray(payload?.waypoints) ? payload.waypoints : [];
  const waypoints = rawWaypoints.filter(isRouteWaypointLike) as RouteWaypoint[];

  if (waypoints.length < 2) {
    return NextResponse.json({ error: "At least two waypoints are required." }, { status: 400 });
  }

  const fallbackRoute = buildFallbackComputedRoute(waypoints);

  try {
    const legs = await Promise.all(
      waypoints.slice(1).map((to, index) => fetchOsrmLeg(waypoints[index], to)),
    );
    const path = combineLegPaths(legs);

    return NextResponse.json({
      route: {
        distanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
        durationSeconds: Math.round(legs.reduce((sum, leg) => sum + leg.durationSeconds, 0)),
        legs,
        mode: "walk",
        path: path.length > 1 ? path : fallbackRoute.path,
        provider: "osrm",
      } satisfies ComputedRoute,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "osrm_route_fetch_failed";

    return NextResponse.json({
      route: {
        ...fallbackRoute,
        reason,
      } satisfies ComputedRoute,
    });
  }
}

async function fetchOsrmLeg(from: RouteWaypoint, to: RouteWaypoint): Promise<ComputedRouteLeg> {
  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const params = new URLSearchParams({
    geometries: "geojson",
    overview: "full",
    steps: "false",
  });
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/foot/${coordinates}?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`osrm_route_error_${response.status}`);
  }

  const data = (await response.json()) as OsrmRouteResponse;
  const route = data.routes?.[0];

  if (data.code !== "Ok" || !route?.geometry?.coordinates?.length) {
    throw new Error("osrm_route_missing_geometry");
  }

  const path = route.geometry.coordinates.map(([lng, lat]) => ({
    lat,
    lng,
  }));

  return {
    distanceMeters: route.distance ?? 0,
    durationSeconds: Math.round(route.duration ?? 0),
    path,
  };
}

function combineLegPaths(legs: ComputedRouteLeg[]): RoutePathPoint[] {
  return legs.reduce<RoutePathPoint[]>((combined, leg, index) => {
    if (!leg.path.length) {
      return combined;
    }

    if (index === 0) {
      return [...leg.path];
    }

    return [...combined, ...leg.path.slice(1)];
  }, []);
}

function isRouteWaypointLike(value: unknown): value is RouteWaypoint {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RouteWaypoint>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.lat === "number" &&
    typeof candidate.lng === "number" &&
    typeof candidate.category === "string"
  );
}
