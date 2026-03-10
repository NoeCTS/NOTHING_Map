"use client";

import { useState } from "react";
import {
  LocationCategory,
  LocationsData,
  MarketMeta,
  ModeId,
} from "@/components/types";
import { getLayerConfig, getModes } from "@/lib/groundSignal";

interface ControlsProps {
  activeMode: ModeId;
  gapAnalysisEnabled: boolean;
  heatmapEnabled: boolean;
  locations: LocationsData;
  market: MarketMeta;
  markersVisible: boolean;
  radiusOverlay: boolean;
  visibleLayers: Record<LocationCategory, boolean>;
  onModeChange: (mode: ModeId) => void;
  onSetLayerGroup: (layers: LocationCategory[], enabled: boolean) => void;
  onToggleGapAnalysis: () => void;
  onToggleHeatmap: () => void;
  onToggleLayer: (layer: LocationCategory) => void;
  onToggleMarkers: () => void;
  onToggleRadiusOverlay: () => void;
}

const LAYER_STYLE: Record<string, { checkboxClass: string; labelClass: string }> = {
  accent: { checkboxClass: "accent", labelClass: "" },
  white: { checkboxClass: "white", labelClass: "" },
  grey: { checkboxClass: "grey", labelClass: "dim" },
  orange: { checkboxClass: "orange", labelClass: "" },
  cyan: { checkboxClass: "cyan", labelClass: "" },
  yellow: { checkboxClass: "yellow", labelClass: "" },
  magenta: { checkboxClass: "magenta", labelClass: "" },
  lime: { checkboxClass: "lime", labelClass: "" },
  blue: { checkboxClass: "blue", labelClass: "" },
};

export function Controls({
  activeMode,
  gapAnalysisEnabled,
  heatmapEnabled,
  locations,
  market,
  markersVisible,
  radiusOverlay,
  visibleLayers,
  onModeChange,
  onSetLayerGroup,
  onToggleGapAnalysis,
  onToggleHeatmap,
  onToggleLayer,
  onToggleMarkers,
  onToggleRadiusOverlay,
}: ControlsProps) {
  const [expandedSections, setExpandedSections] = useState({
    mode: true,
    layers: false,
    ooh: false,
    visualization: false,
  });
  const totalNodes = Object.values(locations).reduce((sum, arr) => sum + arr.length, 0);
  const layerConfig = getLayerConfig(market);
  const modes = getModes(market);

  const baseLayers = layerConfig.filter(
    (layer) =>
      !["ubahn_poster", "ubahn_special", "bridge_banner", "street_furniture"].includes(layer.id),
  );
  const oohLayers = layerConfig.filter((layer) =>
    ["ubahn_poster", "ubahn_special", "bridge_banner", "street_furniture"].includes(layer.id),
  );
  const areBaseLayersEnabled = baseLayers.every((layer) => visibleLayers[layer.id]);
  const areOohLayersEnabled = oohLayers.every((layer) => visibleLayers[layer.id]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside className="controls-panel">
      <section className="controls-section">
        <button
          className="section-header section-header-toggle"
          onClick={() => toggleSection("mode")}
          type="button"
        >
          <span className="section-header-dot" />
          <span className="section-kicker">Mode</span>
          <span className={`section-chevron ${expandedSections.mode ? "expanded" : ""}`} />
        </button>
        <div className={`section-content ${expandedSections.mode ? "expanded" : ""}`}>
          <div className="mode-pills">
          {modes.map((mode) => {
            const isActive = mode.id === activeMode;
            const shortLabel = mode.id === "cultural" ? "Cultural"
              : mode.id === "retail" ? "Retail"
              : mode.id === "creator" ? "Creator"
              : mode.id === "guerrilla" ? "Guerrilla"
              : "OOH";
            return (
              <button
                key={mode.id}
                className={`mode-pill${isActive ? " active" : ""}`}
                onClick={() => onModeChange(mode.id)}
                type="button"
              >
                {shortLabel}
              </button>
            );
          })}
          </div>
        </div>
      </section>

      <section className="controls-section">
        <div className="section-header-right">
          <button
            className="section-header section-header-toggle"
            onClick={() => toggleSection("layers")}
            type="button"
          >
            <span className="section-header-dot" />
            <span className="section-kicker">Data Layers</span>
            <span className={`section-chevron ${expandedSections.layers ? "expanded" : ""}`} />
          </button>
          <div className="section-header-tools">
            <button
              className="segment-toggle-btn"
              onClick={() =>
                onSetLayerGroup(
                  baseLayers.map((layer) => layer.id),
                  !areBaseLayersEnabled,
                )
              }
              type="button"
            >
              {areBaseLayersEnabled ? "Hide all" : "Show all"}
            </button>
            <span className="section-node-count">{String(totalNodes).padStart(5, "0")} NODES</span>
          </div>
        </div>
        <div className={`section-content ${expandedSections.layers ? "expanded" : ""}`}>
          <div className="layer-stack">
          {baseLayers.map((layer) => {
            const style = LAYER_STYLE[layer.color] ?? LAYER_STYLE.grey;
            return (
              <label key={layer.id} className="layer-row">
                <div className="layer-row-left">
                  <div className={`layer-checkbox ${style.checkboxClass}`}>
                    <input
                      checked={visibleLayers[layer.id]}
                      onChange={() => onToggleLayer(layer.id)}
                      type="checkbox"
                    />
                    <div className="layer-checkbox-box" />
                    <div className="layer-checkbox-inner" />
                  </div>
                  <span className={`layer-label ${style.labelClass}`}>{layer.label}</span>
                </div>
                <span className="layer-count">{String(locations[layer.id].length).padStart(2, "0")}</span>
              </label>
            );
          })}
          </div>
        </div>
      </section>

      <section className="controls-section">
        <div className="section-header-right">
          <button
            className="section-header section-header-toggle"
            onClick={() => toggleSection("ooh")}
            type="button"
          >
            <span className="section-header-dot" />
            <span className="section-kicker">OOH Media</span>
            <span className={`section-chevron ${expandedSections.ooh ? "expanded" : ""}`} />
          </button>
          <div className="section-header-tools">
            <button
              className="segment-toggle-btn"
              onClick={() =>
                onSetLayerGroup(
                  oohLayers.map((layer) => layer.id),
                  !areOohLayersEnabled,
                )
              }
              type="button"
            >
              {areOohLayersEnabled ? "Hide all" : "Show all"}
            </button>
            <span className="section-node-count">
              {String(oohLayers.reduce((sum, layer) => sum + locations[layer.id].length, 0)).padStart(5, "0")} SURFACES
            </span>
          </div>
        </div>
        <div className={`section-content ${expandedSections.ooh ? "expanded" : ""}`}>
          <div className="layer-stack">
            {oohLayers.map((layer) => {
              const style = LAYER_STYLE[layer.color] ?? LAYER_STYLE.grey;
              return (
                <label key={layer.id} className="layer-row">
                  <div className="layer-row-left">
                    <div className={`layer-checkbox ${style.checkboxClass}`}>
                      <input
                        checked={visibleLayers[layer.id]}
                        onChange={() => onToggleLayer(layer.id)}
                        type="checkbox"
                      />
                      <div className="layer-checkbox-box" />
                      <div className="layer-checkbox-inner" />
                    </div>
                    <span className="layer-label">{layer.label}</span>
                  </div>
                  <span className="layer-count">{String(locations[layer.id].length).padStart(4, "0")}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className="controls-section">
        <div className="section-header-right">
          <button
            className="section-header section-header-toggle"
            onClick={() => toggleSection("visualization")}
            type="button"
          >
            <span className="section-header-dot" />
            <span className="section-kicker">Visualization</span>
            <span className={`section-chevron ${expandedSections.visualization ? "expanded" : ""}`} />
          </button>
          <span className="section-node-count">004 TOGGLES</span>
        </div>
        <div className={`section-content ${expandedSections.visualization ? "expanded" : ""}`}>
          <div className="layer-stack">
            <VisualizationToggle
              active={heatmapEnabled}
              checkboxClass="accent"
              label="Density Heatmap"
              onToggle={onToggleHeatmap}
            />
            <VisualizationToggle
              active={!markersVisible}
              checkboxClass="white"
              label="Hide Markers"
              onToggle={onToggleMarkers}
            />
            <VisualizationToggle
              active={radiusOverlay}
              checkboxClass="white"
              label="Conversion Radius"
              onToggle={onToggleRadiusOverlay}
            />
            <VisualizationToggle
              active={gapAnalysisEnabled}
              checkboxClass="grey"
              label="Gap Analysis"
              onToggle={onToggleGapAnalysis}
            />
          </div>
        </div>
      </section>

    </aside>
  );
}

function VisualizationToggle({
  active,
  checkboxClass,
  label,
  onToggle,
}: {
  active: boolean;
  checkboxClass: string;
  label: string;
  onToggle: () => void;
}) {
  return (
    <label className="layer-row">
      <div className="layer-row-left">
        <div className={`layer-checkbox ${checkboxClass}`}>
          <input checked={active} onChange={onToggle} type="checkbox" />
          <div className="layer-checkbox-box" />
          <div className="layer-checkbox-inner" />
        </div>
        <span className="layer-label">{label}</span>
      </div>
      <span className="layer-count">{active ? "ON" : "OFF"}</span>
    </label>
  );
}
