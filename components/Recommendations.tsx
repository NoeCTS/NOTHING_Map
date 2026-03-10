import { BreakdownMetric, ModeId, Neighbourhood, Recommendation } from "@/components/types";
import {
  formatImpressions,
  getBreakdown,
  modeLabel,
  scoreForMode,
  summaryLine,
} from "@/lib/groundSignal";

interface RecommendationsProps {
  activeMode: ModeId;
  gapAnalysisEnabled: boolean;
  isExportingPdf: boolean;
  neighbourhoods: Neighbourhood[];
  selectedZone: Neighbourhood;
  recommendation: Recommendation | null;
  onExportPdf: () => void;
  onGenerate: () => void;
  onSelectZone: (zoneName: string) => void;
}

export function Recommendations({
  activeMode,
  gapAnalysisEnabled,
  isExportingPdf,
  neighbourhoods,
  selectedZone,
  recommendation,
  onExportPdf,
  onGenerate,
  onSelectZone,
}: RecommendationsProps) {
  const detailMetrics = getBreakdown(selectedZone, activeMode);
  const selectedScore = scoreForMode(selectedZone, activeMode);
  const lastIndex = neighbourhoods.length - 1;
  const isOoh = activeMode === "ooh";
  const estimatedImpressions = selectedZone.impressions?.total ?? 0;

  return (
    <aside className="recommendations-panel">
      <section className="rankings-section">
        <div className="rankings-header">
          <div className="section-header">
            <span className="section-header-dot" />
            <span className="section-kicker">Top Zones</span>
          </div>
        </div>

        <div className="rankings-list">
          {neighbourhoods.map((zone, index) => {
            const score = scoreForMode(zone, activeMode);
            const isSelected = zone.name === selectedZone.name;
            const isLast = index === lastIndex;

            return (
              <button
                key={zone.name}
                className={`rank-card${isSelected ? " active" : ""}${isLast && !isSelected ? " dimmed" : ""}`}
                onClick={() => onSelectZone(zone.name)}
                type="button"
              >
                <div className="rank-top-row">
                  <div className="rank-left">
                    <span className="rank-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="rank-name">{zone.name.toUpperCase()}</span>
                  </div>
                  <div className="rank-right">
                    {gapAnalysisEnabled && zone.gapAnalysis ? (
                      <GapBadge status={zone.gapAnalysis.status} />
                    ) : null}
                    <span className="rank-score">{score}</span>
                  </div>
                </div>
                <div className="score-bar">
                  <div className="score-bar-fill" style={{ width: `${score}%` }} />
                </div>
                {!isLast && <p className="rank-meta">{summaryLine(zone, activeMode)}</p>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="zone-detail">
        <div className="zone-detail-top">
          <div>
            <h3 className="zone-title">{selectedZone.name}</h3>
            <p className="zone-mode">OPT: {modeLabel(activeMode)}</p>
          </div>
          <div className="zone-detail-score-group">
            {gapAnalysisEnabled && selectedZone.gapAnalysis ? (
              <GapBadge status={selectedZone.gapAnalysis.status} />
            ) : null}
            <div className="zone-score-chip">{selectedScore}</div>
          </div>
        </div>

        {isOoh ? (
          <>
            <div className="stats-grid">
              <StatChip label="Post" value={selectedZone.stats.ubahn_poster} />
              <StatChip label="Prem" value={selectedZone.stats.ubahn_special} />
              <StatChip label="Brdg" value={selectedZone.stats.bridge_banner} />
              <StatChip label="Strt" value={selectedZone.stats.street_furniture} />
            </div>
            <div className="ooh-impressions-row">
              <span className="ooh-impressions-label">Est. Daily Impressions</span>
              <strong className="ooh-impressions-value">{formatImpressions(estimatedImpressions)}</strong>
            </div>
          </>
        ) : (
          <div className="stats-grid">
            <StatChip label="Gal" value={selectedZone.stats.galleries} />
            <StatChip label="Agy" value={selectedZone.stats.agencies} />
            <StatChip label="Ven" value={selectedZone.stats.venues} />
            <StatChip label="Ret" value={selectedZone.stats.retail} />
          </div>
        )}

        <p className="zone-description">{selectedZone.description}</p>

        <div className="metric-stack">
          {detailMetrics.map((metric) => (
            <DetailMetric key={metric.label} metric={metric} isOoh={isOoh} />
          ))}
        </div>

        <button className="btn-generate" onClick={onGenerate} type="button">
          Generate Report
        </button>

        {recommendation ? (
          <div className="recommendation-card">
            <div className="recommendation-divider" />
            <div className="section-kicker">Recommended Zone</div>
            <h3 className="recommendation-title">{recommendation.zone}</h3>

            <div className="recommendation-block">
              <div className="recommendation-label">Why</div>
              {recommendation.why.map((line) => (
                <p key={line} className="recommendation-copy">{line}</p>
              ))}
            </div>

            <div className="recommendation-block">
              <div className="recommendation-label">Suggested Activation</div>
              <p className="recommendation-copy">{recommendation.activation}</p>
            </div>

            <div className="recommendation-block">
              <div className="recommendation-label">KPIs To Track</div>
              <ul className="recommendation-list">
                {recommendation.kpis.map((kpi) => (
                  <li key={kpi}>{kpi}</li>
                ))}
              </ul>
            </div>

            <button
              className="btn-export"
              disabled={isExportingPdf}
              onClick={onExportPdf}
              type="button"
            >
              {isExportingPdf ? "Exporting..." : "Export PDF"}
            </button>

            <div className="recommendation-divider" />
          </div>
        ) : null}
      </section>
    </aside>
  );
}

function DetailMetric({ metric, isOoh }: { metric: BreakdownMetric; isOoh: boolean }) {
  const isBrandFit = metric.label.toLowerCase() === "brand fit";
  const isAccent = isBrandFit || isOoh;
  return (
    <div className="metric-item">
      <div className="metric-head">
        <span className="metric-label">{metric.label}</span>
        <span className={`metric-value${isAccent ? " accent" : ""}`}>
          {metric.displayValue ?? String(metric.value).padStart(2, "0")}
        </span>
      </div>
      <div className="metric-bar">
        <div
          className={`metric-bar-fill ${isAccent ? "red" : "white"}`}
          style={{ width: `${metric.value}%` }}
        />
      </div>
    </div>
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

function GapBadge({ status }: { status: NonNullable<Neighbourhood["gapAnalysis"]>["status"] }) {
  const label =
    status === "opportunity"
      ? "Opportunity"
      : status === "oversaturated"
        ? "Oversaturated"
        : "Balanced";

  return <span className={`gap-badge ${status}`}>{label}</span>;
}
