import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  DataQualitySummary,
  MarketMeta,
  ModeId,
  Neighbourhood,
  Recommendation,
  ScenarioComparison,
  ScenarioSlotId,
  ScenarioSnapshot,
} from "@/components/types";
import {
  getBreakdown,
  modeLabel,
  scoreForMode,
  summaryLine,
} from "@/lib/groundSignal";

interface ExportPdfOptions {
  activeMode: ModeId;
  currentScenario: ScenarioSnapshot;
  dataQuality: DataQualitySummary;
  generatedAt: Date;
  mapElementId?: string;
  market: MarketMeta;
  ranked: Neighbourhood[];
  recommendation: Recommendation;
  scenarioComparisons: ScenarioComparison[];
  scenarioSlots: Record<ScenarioSlotId, ScenarioSnapshot | null>;
  selectedZone: Neighbourhood;
}

const PAGE = {
  bg: [5, 5, 5] as const,
  fg: [245, 245, 245] as const,
  accent: [224, 33, 40] as const,
  muted: [115, 115, 115] as const,
  line: [42, 42, 42] as const,
  green: [34, 197, 94] as const,
  amber: [245, 158, 11] as const,
};

export async function exportGroundSignalPdf({
  activeMode,
  currentScenario,
  dataQuality,
  generatedAt,
  mapElementId = "ground-signal-map-capture",
  market,
  ranked,
  recommendation,
  scenarioComparisons,
  scenarioSlots,
  selectedZone,
}: ExportPdfOptions) {
  const doc = new jsPDF({
    format: "a4",
    unit: "pt",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const mapCanvas = await captureMap(mapElementId);
  const dateLabel = generatedAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  paintPage(doc);
  drawEyebrow(doc, "Nothing . Ground Signal", 40, 44);
  drawTitle(doc, market.reportTitle, 40, 82, 28);
  drawMuted(doc, `${modeLabel(activeMode)} / ${dateLabel}`, 40, 106, 11);
  drawMuted(doc, `Selected zone: ${selectedZone.name} / Recommendation: ${recommendation.zone}`, 40, 124, 11);

  if (mapCanvas) {
    doc.addImage(mapCanvas, "PNG", 40, 156, pageWidth - 80, 280);
  } else {
    drawPanel(doc, 40, 156, pageWidth - 80, 280);
    drawMuted(doc, "Map snapshot unavailable in this browser session.", 56, 312, 12);
  }

  drawPanel(doc, 40, 460, pageWidth - 80, 290);
  drawEyebrow(doc, "Executive read", 56, 486);
  writeWrapped(
    doc,
    `${recommendation.zone} leads the current ${modeLabel(activeMode)} scenario based on polygon-aware zone logic, dynamic score completeness, and visible-layer coverage.`,
    56,
    518,
    pageWidth - 112,
    16,
    PAGE.fg,
  );
  drawMuted(doc, `Scenario state: ${currentScenario.label}`, 56, 604, 12);
  drawMuted(doc, `Dataset confidence: ${dataQuality.score}/100 (${dataQuality.level})`, 56, 624, 12);
  drawMuted(doc, recommendation.nextStep, 56, 652, 12, pageWidth - 112);

  doc.addPage();
  paintPage(doc);
  drawEyebrow(doc, "Page 2", 40, 44);
  drawTitle(doc, "Zone rankings", 40, 82, 24);

  let rankingY = 122;
  ranked.forEach((zone, index) => {
    drawPanel(doc, 40, rankingY, pageWidth - 80, 84);
    doc.setTextColor(...PAGE.fg);
    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    doc.text(String(index + 1).padStart(2, "0"), 56, rankingY + 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(zone.name, 94, rankingY + 28);
    drawMuted(doc, summaryLine(zone, activeMode, market), 94, rankingY + 48, 10);

    const score = scoreForMode(zone, activeMode);
    doc.setTextColor(...PAGE.accent);
    doc.setFont("courier", "bold");
    doc.setFontSize(18);
    doc.text(String(score), pageWidth - 92, rankingY + 30, { align: "right" });
    drawScoreBar(doc, 94, rankingY + 62, pageWidth - 188, score);

    if (zone.gapAnalysis) {
      drawGapBadge(doc, zone.gapAnalysis.status, pageWidth - 210, rankingY + 18);
    }

    rankingY += 98;
  });

  doc.addPage();
  paintPage(doc);
  drawEyebrow(doc, "Page 3", 40, 44);
  drawTitle(doc, `${selectedZone.name} detail`, 40, 82, 24);
  drawMuted(doc, `Mode: ${modeLabel(activeMode)}`, 40, 102, 11);

  drawPanel(doc, 40, 128, pageWidth - 80, 154);
  drawMuted(doc, selectedZone.description, 56, 156, 12, pageWidth - 112);
  drawStatLine(doc, "Score", String(scoreForMode(selectedZone, activeMode)), 56, 218);
  drawStatLine(doc, "Brand fit", selectedZone.brandFit.toUpperCase(), 220, 218);
  drawStatLine(doc, "Confidence", `${selectedZone.dataQuality?.score ?? dataQuality.score}/100`, 400, 218);
  if (selectedZone.gapAnalysis) {
    drawStatLine(doc, "Gap", `${selectedZone.gapAnalysis.gap > 0 ? "+" : ""}${selectedZone.gapAnalysis.gap}`, 56, 246);
    drawStatLine(doc, "Status", selectedZone.gapAnalysis.status.toUpperCase(), 220, 246);
  }

  drawEyebrow(doc, "Metrics", 40, 320);
  const metrics = getBreakdown(selectedZone, market, activeMode);
  let metricY = 352;
  metrics.forEach((metric) => {
    doc.setTextColor(...PAGE.fg);
    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    doc.text(metric.label.toUpperCase(), 56, metricY);
    doc.text(metric.displayValue ?? String(metric.value), pageWidth - 56, metricY, { align: "right" });
    drawScoreBar(doc, 56, metricY + 12, pageWidth - 112, metric.value);
    metricY += 52;
  });

  const explanation = selectedZone.scoreExplanations?.[activeMode];
  if (explanation) {
    drawEyebrow(doc, "Score drivers", 40, 580);
    let driverY = 612;
    explanation.drivers.slice(0, 4).forEach((driver) => {
      drawMuted(doc, driver.label, 56, driverY, 10);
      doc.setTextColor(...PAGE.fg);
      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.text(`${driver.displayCurrent}/${driver.displayBaseline}`, pageWidth - 56, driverY, { align: "right" });
      drawMuted(doc, `Weight ${driver.weight.toFixed(2)} / ${driver.completeness}% completeness`, 56, driverY + 16, 9);
      drawScoreBar(doc, 56, driverY + 24, pageWidth - 112, driver.completeness);
      driverY += 44;
    });
  }

  doc.addPage();
  paintPage(doc);
  drawEyebrow(doc, "Page 4", 40, 44);
  drawTitle(doc, "Scenario compare and confidence", 40, 82, 24);

  drawPanel(doc, 40, 118, pageWidth - 80, 220);
  drawEyebrow(doc, "Scenario snapshots", 56, 146);
  let slotY = 178;
  (["A", "B"] as ScenarioSlotId[]).forEach((slot) => {
    const snapshot = scenarioSlots[slot];
    drawMuted(doc, `Scenario ${slot}`, 56, slotY, 11);
    drawMuted(
      doc,
      snapshot
        ? `${snapshot.label} / ${snapshot.rankedZones[0]?.name ?? "No zone"} lead`
        : "Empty slot",
      146,
      slotY,
      11,
    );
    slotY += 28;
  });

  drawEyebrow(doc, "Compare output", 56, 264);
  let compareY = 292;
  scenarioComparisons.slice(0, 3).forEach((comparison) => {
    drawMuted(doc, comparison.title, 56, compareY, 11);
    compareY += 18;
    comparison.lines.forEach((line) => {
      drawMuted(doc, line.label, 72, compareY, 10);
      doc.setTextColor(...PAGE.fg);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(line.value, pageWidth - 56, compareY, { align: "right" });
      compareY += 16;
    });
    compareY += 10;
  });

  drawPanel(doc, 40, 370, pageWidth - 80, 350);
  drawEyebrow(doc, "Data confidence", 56, 398);
  drawStatLine(doc, "Score", `${dataQuality.score}/100`, 56, 430);
  drawStatLine(doc, "Geometry", `${dataQuality.geometryVerified + dataQuality.geometryInferred}/${dataQuality.visiblePoints || 0}`, 200, 430);
  drawStatLine(doc, "Weighted", String(dataQuality.stationWeighted), 380, 430);
  drawStatLine(doc, "Fallback", String(dataQuality.taggedFallback + dataQuality.defaultImpressions), 500, 430);
  let noteY = 486;
  dataQuality.notes.slice(0, 4).forEach((note) => {
    writeWrapped(doc, note, 56, noteY, pageWidth - 112, 11, PAGE.fg);
    noteY += 36;
  });
  drawEyebrow(doc, "Visible sources", 56, 620);
  writeWrapped(doc, dataQuality.visibleSources.join(" / "), 56, 646, pageWidth - 112, 10, PAGE.muted);

  doc.addPage();
  paintPage(doc);
  drawEyebrow(doc, "Page 5", 40, 44);
  drawTitle(doc, `${recommendation.zone} recommendation`, 40, 82, 24);

  drawPanel(doc, 40, 120, pageWidth - 80, pageHeight - 170);
  let sectionTop = 150;
  if (recommendation.metrics.length) {
    drawEyebrow(doc, "Snapshot", 56, sectionTop);
    let metricsY = sectionTop + 32;
    recommendation.metrics.slice(0, 4).forEach((metric) => {
      drawMuted(doc, metric.label, 56, metricsY, 10);
      doc.setTextColor(...PAGE.fg);
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.text(metric.value, pageWidth - 56, metricsY, { align: "right" });
      metricsY += 18;
    });
    sectionTop = metricsY + 10;
  }

  if (recommendation.impressionRange) {
    drawEyebrow(doc, "Reach model", 56, sectionTop);
    sectionTop =
      writeWrapped(
        doc,
        `${formatCompactNumber(recommendation.impressionRange.expected)} expected daily impressions with a ${formatCompactNumber(recommendation.impressionRange.low)}-${formatCompactNumber(recommendation.impressionRange.high)} range at ${recommendation.impressionRange.confidence} confidence.`,
        56,
        sectionTop + 32,
        pageWidth - 112,
        12,
        PAGE.fg,
      ) + 16;
  }

  drawEyebrow(doc, "Why", 56, sectionTop);
  let whyY = sectionTop + 32;
  recommendation.why.forEach((line) => {
    whyY = writeWrapped(doc, line, 56, whyY, pageWidth - 112, 14, PAGE.fg) + 8;
  });

  drawEyebrow(doc, "Activation", 56, whyY + 16);
  whyY = writeWrapped(doc, recommendation.activation, 56, whyY + 48, pageWidth - 112, 14, PAGE.fg) + 18;

  drawEyebrow(doc, "Budget", 56, whyY + 16);
  whyY = writeWrapped(doc, recommendation.budget, 56, whyY + 48, pageWidth - 112, 13, PAGE.fg) + 18;

  drawEyebrow(doc, "Risks", 56, whyY + 16);
  whyY += 44;
  recommendation.risks.forEach((risk) => {
    whyY = writeWrapped(doc, `- ${risk}`, 56, whyY, pageWidth - 112, 12, PAGE.fg) + 6;
  });

  drawEyebrow(doc, "Next step", 56, whyY + 16);
  whyY = writeWrapped(doc, recommendation.nextStep, 56, whyY + 48, pageWidth - 112, 13, PAGE.fg) + 18;

  drawEyebrow(doc, "KPIs", 56, whyY + 16);
  let kpiY = whyY + 44;
  recommendation.kpis.forEach((kpi) => {
    kpiY = writeWrapped(doc, `- ${kpi}`, 56, kpiY, pageWidth - 112, 11, PAGE.fg) + 6;
  });

  if (recommendation.assumptions.length) {
    drawEyebrow(doc, "Math / assumptions", 56, kpiY + 16);
    let assumptionY = kpiY + 44;
    recommendation.assumptions.slice(0, 4).forEach((assumption) => {
      assumptionY = writeWrapped(doc, `- ${assumption}`, 56, assumptionY, pageWidth - 112, 11, PAGE.fg) + 6;
    });
  }

  doc.save(`nothing-ground-signal-${market.code.toLowerCase()}-${activeMode}-${generatedAt.toISOString().slice(0, 10)}.pdf`);
}

async function captureMap(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    return null;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: "#050505",
      scale: 2,
      useCORS: true,
    });
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function paintPage(doc: jsPDF) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setFillColor(...PAGE.bg);
  doc.rect(0, 0, width, height, "F");
}

function drawPanel(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setFillColor(10, 10, 10);
  doc.setDrawColor(...PAGE.line);
  doc.rect(x, y, width, height, "FD");
}

function drawEyebrow(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PAGE.accent);
  doc.text(text.toUpperCase(), x, y);
}

function drawTitle(doc: jsPDF, text: string, x: number, y: number, size: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(...PAGE.fg);
  doc.text(text, x, y);
}

function drawMuted(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size: number,
  maxWidth?: number,
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(...PAGE.muted);
  const output = maxWidth ? doc.splitTextToSize(text, maxWidth) : text;
  doc.text(output, x, y);
}

function drawStatLine(doc: jsPDF, label: string, value: string, x: number, y: number) {
  drawMuted(doc, label.toUpperCase(), x, y, 10);
  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PAGE.fg);
  doc.text(value, x, y + 18);
}

function drawScoreBar(doc: jsPDF, x: number, y: number, width: number, value: number) {
  doc.setFillColor(...PAGE.line);
  doc.rect(x, y, width, 5, "F");
  doc.setFillColor(...PAGE.accent);
  doc.rect(x, y, (width * value) / 100, 5, "F");
}

function drawGapBadge(doc: jsPDF, status: NonNullable<Neighbourhood["gapAnalysis"]>["status"], x: number, y: number) {
  const color =
    status === "opportunity"
      ? PAGE.green
      : status === "oversaturated"
        ? PAGE.amber
        : PAGE.line;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, 110, 18, 4, 4, "F");
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(5, 5, 5);
  doc.text(status.toUpperCase(), x + 8, y + 12);
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  color: readonly [number, number, number],
) {
  const wrapped = doc.splitTextToSize(text, width);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(wrapped, x, y);
  return y + wrapped.length * (size + 4);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value).toUpperCase();
}
