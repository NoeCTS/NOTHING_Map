import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { ModeId, Neighbourhood, Recommendation } from "@/components/types";
import {
  formatImpressions,
  getBreakdown,
  modeLabel,
  scoreForMode,
  summaryLine,
} from "@/lib/groundSignal";

interface ExportPdfOptions {
  activeMode: ModeId;
  generatedAt: Date;
  mapElementId?: string;
  ranked: Neighbourhood[];
  recommendation: Recommendation;
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
  generatedAt,
  mapElementId = "ground-signal-map-capture",
  ranked,
  recommendation,
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
  drawTitle(doc, "Berlin location intelligence report", 40, 82, 28);
  drawMuted(doc, `${modeLabel(activeMode)} / ${dateLabel}`, 40, 106, 11);
  drawMuted(
    doc,
    `Selected zone: ${selectedZone.name} / Recommendation: ${recommendation.zone}`,
    40,
    124,
    11,
  );

  if (mapCanvas) {
    doc.addImage(mapCanvas, "PNG", 40, 156, pageWidth - 80, 280);
  } else {
    drawPanel(doc, 40, 156, pageWidth - 80, 280);
    drawMuted(doc, "Map snapshot unavailable in this browser session.", 56, 312, 12);
  }

  drawPanel(doc, 40, 460, pageWidth - 80, 300);
  drawEyebrow(doc, "Executive read", 56, 486);
  const coverCopy = doc.splitTextToSize(
    `${recommendation.zone} is the current lead zone for ${modeLabel(activeMode)} based on visible layers, dynamic zone scoring, impression-weighted OOH coverage, and retail conversion support.`,
    pageWidth - 112,
  );
  doc.setTextColor(...PAGE.fg);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text(coverCopy, 56, 522);
  drawMuted(
    doc,
    "This export reflects the current app state, including gap analysis, selected zone detail, and dynamic layer visibility.",
    56,
    604,
    12,
  );

  doc.addPage();
  paintPage(doc);
  drawEyebrow(doc, "Page 2", 40, 44);
  drawTitle(doc, "Zone rankings", 40, 82, 24);

  let y = 122;
  ranked.forEach((zone, index) => {
    drawPanel(doc, 40, y, pageWidth - 80, 84);
    doc.setTextColor(...PAGE.fg);
    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    doc.text(String(index + 1).padStart(2, "0"), 56, y + 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(zone.name, 94, y + 28);
    drawMuted(doc, summaryLine(zone, activeMode), 94, y + 48, 10);

    const score = scoreForMode(zone, activeMode);
    doc.setTextColor(...PAGE.accent);
    doc.setFont("courier", "bold");
    doc.setFontSize(18);
    doc.text(String(score), pageWidth - 92, y + 30, { align: "right" });

    doc.setFillColor(...PAGE.line);
    doc.rect(94, y + 62, pageWidth - 188, 6, "F");
    doc.setFillColor(...PAGE.accent);
    doc.rect(94, y + 62, ((pageWidth - 188) * score) / 100, 6, "F");

    if (zone.gapAnalysis) {
      drawGapBadge(doc, zone.gapAnalysis.status, pageWidth - 210, y + 18);
    }

    y += 98;
  });

  doc.addPage();
  paintPage(doc);
  drawEyebrow(doc, "Page 3", 40, 44);
  drawTitle(doc, `${selectedZone.name} detail`, 40, 82, 24);
  drawMuted(doc, `Mode: ${modeLabel(activeMode)}`, 40, 102, 11);

  drawPanel(doc, 40, 128, pageWidth - 80, 148);
  drawMuted(doc, selectedZone.description, 56, 156, 12, pageWidth - 112);
  drawStatLine(doc, "Score", String(scoreForMode(selectedZone, activeMode)), 56, 218);
  drawStatLine(doc, "Brand fit", selectedZone.brandFit.toUpperCase(), 220, 218);
  if (activeMode === "ooh" && selectedZone.impressions) {
    drawStatLine(doc, "Est. daily reach", formatImpressions(selectedZone.impressions.total), 400, 218);
  }
  if (selectedZone.gapAnalysis) {
    drawStatLine(doc, "Gap", `${selectedZone.gapAnalysis.gap > 0 ? "+" : ""}${selectedZone.gapAnalysis.gap}`, 56, 246);
    drawStatLine(doc, "Status", selectedZone.gapAnalysis.status.toUpperCase(), 220, 246);
  }

  drawEyebrow(doc, "Metrics", 40, 314);
  const metrics = getBreakdown(selectedZone, activeMode);
  let metricY = 352;
  metrics.forEach((metric) => {
    doc.setTextColor(...PAGE.fg);
    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    doc.text(metric.label.toUpperCase(), 56, metricY);
    doc.text(metric.displayValue ?? String(metric.value), pageWidth - 56, metricY, {
      align: "right",
    });
    doc.setFillColor(...PAGE.line);
    doc.rect(56, metricY + 12, pageWidth - 112, 5, "F");
    doc.setFillColor(...PAGE.accent);
    doc.rect(56, metricY + 12, ((pageWidth - 112) * metric.value) / 100, 5, "F");
    metricY += 54;
  });

  doc.addPage();
  paintPage(doc);
  drawEyebrow(doc, "Page 4", 40, 44);
  drawTitle(doc, `${recommendation.zone} recommendation`, 40, 82, 24);

  drawPanel(doc, 40, 120, pageWidth - 80, pageHeight - 170);
  drawEyebrow(doc, "Why", 56, 150);
  let whyY = 182;
  recommendation.why.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, pageWidth - 112);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(...PAGE.fg);
    doc.text(wrapped, 56, whyY);
    whyY += wrapped.length * 18 + 8;
  });

  drawEyebrow(doc, "Activation", 56, whyY + 10);
  const activation = doc.splitTextToSize(recommendation.activation, pageWidth - 112);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(...PAGE.fg);
  doc.text(activation, 56, whyY + 42);
  whyY += activation.length * 18 + 68;

  drawEyebrow(doc, "KPIs", 56, whyY);
  let kpiY = whyY + 28;
  recommendation.kpis.forEach((kpi) => {
    doc.setTextColor(...PAGE.accent);
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text("-", 56, kpiY);
    const wrapped = doc.splitTextToSize(kpi, pageWidth - 140);
    doc.setTextColor(...PAGE.fg);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(wrapped, 72, kpiY);
    kpiY += wrapped.length * 16 + 6;
  });

  doc.save(`nothing-ground-signal-${activeMode}-${generatedAt.toISOString().slice(0, 10)}.pdf`);
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
