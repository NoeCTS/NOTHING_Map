import {
  MarketMeta,
  ModeId,
  Neighbourhood,
  Recommendation,
} from "@/components/types";
import {
  formatImpressions,
  modeLabel,
  scoreForMode,
} from "@/lib/groundSignal";

interface RecommendationsProps {
  activeMode: ModeId;
  market: MarketMeta;
  neighbourhoods: Neighbourhood[];
  selectedZone: Neighbourhood;
  recommendation: Recommendation | null;
  onGenerate: () => void;
  onSelectZone: (zoneName: string) => void;
}

export function Recommendations({
  activeMode,
  market,
  neighbourhoods,
  selectedZone,
  recommendation,
  onGenerate,
  onSelectZone,
}: RecommendationsProps) {
  const selectedScore = scoreForMode(selectedZone, activeMode);
  const isOoh = activeMode === "ooh";
  const estimatedImpressions = selectedZone.impressions?.total ?? 0;
  const scoreDrivers = selectedZone.scoreExplanations?.[activeMode]?.drivers.slice(0, 3) ?? [];

  return (
    <aside className="recommendations-panel">
      <section className="rankings-section">
        <div className="rankings-header">
          <div className="section-header">
            <span className="section-header-dot" />
            <span className="section-kicker">Zone Rankings</span>
          </div>
        </div>

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
      </section>

      <section className="zone-detail">
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

        <button className="btn-generate" onClick={onGenerate} type="button">
          Generate Report
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
