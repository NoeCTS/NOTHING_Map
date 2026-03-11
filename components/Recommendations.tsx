import {
  ComputedRoute,
  MarketMeta,
  ModeId,
  Neighbourhood,
  Recommendation,
  RouteOohAnalysis,
  RouteSummary,
  RouteWaypoint,
} from "@/components/types";
import {
  categoryLabel,
  formatImpressions,
  modeLabel,
  scoreForMode,
} from "@/lib/groundSignal";
import { formatRouteDistance, formatTravelMinutes } from "@/lib/routePlanner";

interface RecommendationsProps {
  activeMode: ModeId;
  canOptimizeRoute: boolean;
  computedRoute: ComputedRoute | null;
  market: MarketMeta;
  neighbourhoods: Neighbourhood[];
  optimizationGainMeters: number;
  onClearRoute: () => void;
  onDisableRoutePlanner: () => void;
  onEnableRoutePlanner: () => void;
  onGenerate: () => void;
  onOptimizeRoute: () => void;
  onRemoveRouteWaypoint: (waypointId: string) => void;
  onReverseRoute: () => void;
  onSelectZone: (zoneName: string) => void;
  recommendation: Recommendation | null;
  routeLoading: boolean;
  routeOohAnalysis: RouteOohAnalysis;
  routePlannerEnabled: boolean;
  routeSummary: RouteSummary;
  routeWaypoints: RouteWaypoint[];
  selectedZone: Neighbourhood;
}

export function Recommendations({
  activeMode,
  canOptimizeRoute,
  computedRoute,
  market,
  neighbourhoods,
  optimizationGainMeters,
  onClearRoute,
  onDisableRoutePlanner,
  onEnableRoutePlanner,
  onGenerate,
  onOptimizeRoute,
  onRemoveRouteWaypoint,
  onReverseRoute,
  onSelectZone,
  recommendation,
  routeLoading,
  routeOohAnalysis,
  routePlannerEnabled,
  routeSummary,
  routeWaypoints,
  selectedZone,
}: RecommendationsProps) {
  const selectedScore = scoreForMode(selectedZone, activeMode);
  const isOoh = activeMode === "ooh";
  const estimatedImpressions = selectedZone.impressions?.total ?? 0;
  const scoreDrivers = selectedZone.scoreExplanations?.[activeMode]?.drivers.slice(0, 3) ?? [];
  const routeCadence =
    routeSummary.totalDistanceMeters <= 1800
      ? "Walkable single-session corridor"
      : routeSummary.totalDistanceMeters <= 4000
        ? "Comfortable half-day route"
        : "Split this into multiple waves or use transport";
  const routeSourceLabel = routeLoading
    ? "Calculating live walking route..."
    : computedRoute?.provider === "osrm"
      ? "OSRM walking route"
      : routeWaypoints.length > 1
        ? "Straight-line fallback"
        : "Waiting for route";
  const routeMix = Object.entries(routeSummary.categoryCounts)
    .sort((left, right) => (right[1] ?? 0) - (left[1] ?? 0))
    .slice(0, 3)
    .map(([category, count]) => `${count} ${categoryLabel(category as RouteWaypoint["category"], market)}`)
    .join(" / ");
  const routeOohMix = Object.entries(routeOohAnalysis.counts)
    .sort((left, right) => (right[1] ?? 0) - (left[1] ?? 0))
    .map(([category, count]) => `${count} ${categoryLabel(category as RouteWaypoint["category"], market)}`)
    .join(" / ");

  return (
    <aside className="recommendations-panel">
      <section className="rankings-section">
        <div className="rankings-header">
          <div className="section-header-right">
            <div className="section-header">
              <span className="section-header-dot" />
              <span className="section-kicker">{routePlannerEnabled ? "Route Planner" : "Zone Rankings"}</span>
            </div>
            <div className="recommendations-switch">
              <button
                className={`recommendations-switch-btn${routePlannerEnabled ? "" : " active"}`}
                onClick={onDisableRoutePlanner}
                type="button"
              >
                Zones
              </button>
              <button
                className={`recommendations-switch-btn${routePlannerEnabled ? " active" : ""}`}
                onClick={onEnableRoutePlanner}
                type="button"
              >
                Routes
              </button>
            </div>
          </div>
        </div>

        {routePlannerEnabled ? (
          <div className="rankings-list">
            <div className="route-controls route-controls-sidebar">
              <p className="route-helper">
                Click map markers to add stops. While this tab is open, the map is in route-building mode.
              </p>

              {routeWaypoints.length ? (
                <>
                  <div className="route-controls-top">
                    <span className="route-waypoint-count">
                      {routeWaypoints.length} waypoint{routeWaypoints.length !== 1 ? "s" : ""} selected
                    </span>
                    <button className="route-clear-btn" onClick={onClearRoute} type="button">
                      Clear
                    </button>
                  </div>

                  <div className="route-action-row">
                    <button
                      className="route-action-btn"
                      disabled={!canOptimizeRoute}
                      onClick={onOptimizeRoute}
                      type="button"
                    >
                      {canOptimizeRoute ? `Optimize (-${formatRouteDistance(optimizationGainMeters)})` : "Optimize"}
                    </button>
                    <button
                      className="route-action-btn"
                      disabled={routeWaypoints.length < 2}
                      onClick={onReverseRoute}
                      type="button"
                    >
                      Reverse
                    </button>
                  </div>

                  <div className="route-waypoint-list">
                    {routeWaypoints.map((waypoint, index) => (
                      <div key={waypoint.id} className="route-waypoint-row">
                        <div className="route-waypoint-order">{String(index + 1).padStart(2, "0")}</div>
                        <div className="route-waypoint-copy">
                          <div className="route-waypoint-name">{waypoint.name}</div>
                          <div className="route-waypoint-meta">
                            {categoryLabel(waypoint.category, market)}
                            {waypoint.zoneName ? ` / ${waypoint.zoneName}` : ""}
                          </div>
                        </div>
                        <button
                          aria-label={`Remove ${waypoint.name}`}
                          className="route-remove-btn"
                          onClick={() => onRemoveRouteWaypoint(waypoint.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="route-empty-state">
                  <div className="route-empty-title">Route mode is active</div>
                  <p className="route-empty-copy">
                    Pick your first stop directly on the map. The walking route and OOH sightings will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rankings-list">
            {neighbourhoods.map((zone, index) => {
              const score = scoreForMode(zone, activeMode);
              const isSelected = zone.name === selectedZone.name;

              return (
                <button
                  key={zone.name}
                  className={`rank-card${isSelected ? " active" : ""}`}
                  onClick={() => onSelectZone(zone.name)}
                  type="button"
                >
                  <div className="rank-top-row">
                    <div className="rank-left">
                      <span className="rank-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="rank-name">{zone.name}</span>
                    </div>
                    <span className="rank-score">{score}</span>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-fill" style={{ width: `${score}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="zone-detail">
        {routePlannerEnabled ? (
          <div className="route-detail-stack">
            <div className="zone-detail-top">
              <div>
                <h3 className="zone-title">Walking Route</h3>
                <p className="zone-mode">{routeSourceLabel}</p>
              </div>
              <div className="zone-score-chip">{routeWaypoints.length}</div>
            </div>

            <p className="zone-description">
              {computedRoute?.provider === "osrm"
                ? "The route line follows OSRM walking geometry, and the OOH list is estimated from that path."
                : "The route is currently a fallback estimate. Add more waypoints or retry if the walking router is unavailable."}
            </p>

            {routeWaypoints.length ? (
              <>
                <div className="route-metrics-grid">
                  <RouteMetric label="Distance" value={formatRouteDistance(routeSummary.totalDistanceMeters)} />
                  <RouteMetric label="Walk" value={formatTravelMinutes(routeSummary.walkingMinutes)} />
                  <RouteMetric label="Stops" value={String(routeWaypoints.length)} />
                  <RouteMetric
                    label="Zones"
                    value={String(Math.max(routeSummary.uniqueZones.length, routeWaypoints.length > 0 ? 1 : 0))}
                  />
                </div>

                <div className="route-note">
                  <span className="route-note-kicker">Cadence</span>
                  <strong>{routeCadence}</strong>
                </div>

                {routeMix ? (
                  <div className="route-note">
                    <span className="route-note-kicker">Mix</span>
                    <strong>{routeMix}</strong>
                  </div>
                ) : null}

                {routeSummary.legs.length ? (
                  <div className="route-leg-list">
                    {routeSummary.legs.map((leg, index) => (
                      <div key={`${leg.from.id}-${leg.to.id}`} className="route-leg-row">
                        <span>
                          {String(index + 1).padStart(2, "0")} {leg.from.name} to {leg.to.name}
                        </span>
                        <strong>
                          {formatRouteDistance(leg.distanceMeters)}
                          {leg.durationSeconds ? ` / ${formatTravelMinutes(Math.max(1, Math.round(leg.durationSeconds / 60)))}` : ""}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="route-ooh-section">
                  <div className="route-note">
                    <span className="route-note-kicker">OOH Along Walking Corridor</span>
                    <strong>
                      {routeOohAnalysis.totalHits > 0
                        ? `${routeOohAnalysis.totalHits} surfaces within ${routeOohAnalysis.bufferMeters}m of the route`
                        : "No visible OOH surfaces near this route"}
                    </strong>
                  </div>

                  {routeOohAnalysis.totalHits > 0 ? (
                    <>
                      <div className="route-metrics-grid">
                        <RouteMetric label="Surfaces" value={String(routeOohAnalysis.totalHits)} />
                        <RouteMetric
                          label="Est. Reach"
                          value={formatImpressions(routeOohAnalysis.totalEstimatedImpressions)}
                        />
                      </div>

                      {routeOohMix ? (
                        <div className="route-note">
                          <span className="route-note-kicker">OOH Mix</span>
                          <strong>{routeOohMix}</strong>
                        </div>
                      ) : null}

                      <div className="route-ooh-list">
                        {routeOohAnalysis.hits.slice(0, 12).map((hit) => (
                          <div key={`${hit.category}-${hit.name}-${hit.legIndex}`} className="route-ooh-row">
                            <div className="route-ooh-copy">
                              <div className="route-waypoint-name">{hit.name}</div>
                              <div className="route-waypoint-meta">
                                Leg {String(hit.legIndex + 1).padStart(2, "0")} / {categoryLabel(hit.category, market)} / {Math.round(hit.distanceMeters)}m off route
                              </div>
                            </div>
                            <strong className="route-ooh-value">{formatImpressions(hit.impressions)}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <>
            <div className="zone-detail-top">
              <div>
                <h3 className="zone-title">{selectedZone.name}</h3>
                <p className="zone-mode">{modeLabel(activeMode)}</p>
              </div>
              <div className="zone-score-chip">{selectedScore}</div>
            </div>

            {isOoh ? (
              <>
                <div className="stats-grid">
                  <StatChip label={market.oohLabels.ubahn_poster} value={selectedZone.stats.ubahn_poster} />
                  <StatChip label={market.oohLabels.ubahn_special} value={selectedZone.stats.ubahn_special} />
                  <StatChip label={market.oohLabels.bridge_banner} value={selectedZone.stats.bridge_banner} />
                  <StatChip label={market.oohLabels.street_furniture} value={selectedZone.stats.street_furniture} />
                </div>
                <div className="ooh-impressions-row">
                  <span className="ooh-impressions-label">{market.city} Daily Impressions</span>
                  <strong className="ooh-impressions-value">{formatImpressions(estimatedImpressions)}</strong>
                </div>
              </>
            ) : (
              <div className="stats-grid">
                <StatChip label="Galleries" value={selectedZone.stats.galleries} />
                <StatChip label="Agencies" value={selectedZone.stats.agencies} />
                <StatChip label="Venues" value={selectedZone.stats.venues} />
                <StatChip label="Retail" value={selectedZone.stats.retail} />
              </div>
            )}

            <p className="zone-description">{selectedZone.description}</p>

            {!recommendation && (
              <p className="generate-hint">
                Get activation strategy, KPIs, and tactical recommendations for this zone
              </p>
            )}

            <button className="btn-generate" onClick={onGenerate} type="button">
              {recommendation ? "Regenerate Report" : "Generate Report"}
            </button>

            {recommendation ? (
              <div className="recommendation-card">
                <div className="section-kicker">Recommendation</div>
                <h3 className="recommendation-title">{recommendation.zone}</h3>

                {recommendation.metrics.length ? (
                  <div className="recommendation-grid">
                    {recommendation.metrics.map((metric) => (
                      <div key={metric.label} className="recommendation-micro">
                        <span className="recommendation-micro-label">{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                {recommendation.impressionRange ? (
                  <div className="recommendation-block">
                    <div className="recommendation-label">Reach Model</div>
                    <div className="recommendation-grid">
                      <div className="recommendation-micro">
                        <span className="recommendation-micro-label">Expected</span>
                        <strong>{formatImpressions(recommendation.impressionRange.expected)}</strong>
                      </div>
                      <div className="recommendation-micro">
                        <span className="recommendation-micro-label">Range</span>
                        <strong>
                          {formatImpressions(recommendation.impressionRange.low)}-{formatImpressions(recommendation.impressionRange.high)}
                        </strong>
                      </div>
                      <div className="recommendation-micro">
                        <span className="recommendation-micro-label">Confidence</span>
                        <strong>{recommendation.impressionRange.confidence.toUpperCase()}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="recommendation-block">
                  <div className="recommendation-label">Why This Zone</div>
                  {recommendation.why.map((line) => (
                    <p key={line} className="recommendation-copy">{line}</p>
                  ))}
                </div>

                {scoreDrivers.length ? (
                  <div className="recommendation-block">
                    <div className="recommendation-label">Score Drivers</div>
                    <ul className="recommendation-list">
                      {scoreDrivers.map((driver) => (
                        <li key={driver.label}>
                          {driver.label}: {driver.displayCurrent} live vs {driver.displayBaseline} full coverage
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="recommendation-block">
                  <div className="recommendation-label">Activation</div>
                  <p className="recommendation-copy">{recommendation.activation}</p>
                </div>

                <div className="recommendation-block">
                  <div className="recommendation-label">Budget</div>
                  <p className="recommendation-copy">{recommendation.budget}</p>
                </div>

                <div className="recommendation-block">
                  <div className="recommendation-label">KPIs</div>
                  <ul className="recommendation-list">
                    {recommendation.kpis.map((kpi) => (
                      <li key={kpi}>{kpi}</li>
                    ))}
                  </ul>
                </div>

                <div className="recommendation-block">
                  <div className="recommendation-label">Risks</div>
                  <ul className="recommendation-list">
                    {recommendation.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </div>

                <div className="recommendation-block">
                  <div className="recommendation-label">Math / Assumptions</div>
                  <ul className="recommendation-list">
                    {recommendation.assumptions.map((assumption) => (
                      <li key={assumption}>{assumption}</li>
                    ))}
                  </ul>
                </div>

                <div className="recommendation-block">
                  <div className="recommendation-label">Next Step</div>
                  <p className="recommendation-copy">{recommendation.nextStep}</p>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </aside>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-chip">
      <span className="stat-chip-label">{label}</span>
      <strong className={`stat-chip-value${value === 0 ? " zero" : ""}`}>{value}</strong>
    </div>
  );
}

function RouteMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="route-metric">
      <span className="route-metric-label">{label}</span>
      <strong className="route-metric-value">{value}</strong>
    </div>
  );
}
