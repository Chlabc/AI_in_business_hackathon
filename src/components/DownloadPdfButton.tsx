"use client";

import { useState } from "react";
import type { PracticeScore } from "@/lib/rubric";

type DownloadPdfButtonProps = {
  score: PracticeScore;
  whatYouSaid?: string[];
  repName?: string;
  /** Omit from PDF when empty / undefined. */
  reflection?: { whatWentWrong?: string; nextTime?: string };
};

// Navy is the brand/structural color (headers, titles, text). Tier colors
// (teal/gold/burgundy) are deliberately distinct from it, so the page reads
// as a proper multi-color report instead of one hue washed over everything.
const COLOR = {
  navy: [27, 58, 92] as const,
  gold: [191, 149, 33] as const,
  teal: [26, 122, 109] as const,
  burgundy: [163, 52, 68] as const,
  ink: [30, 34, 40] as const,
  muted: [108, 117, 128] as const,
  hairline: [222, 227, 232] as const,
  track: [237, 240, 243] as const,
  headerText: [220, 226, 232] as const,
};
type RGB = readonly [number, number, number];

function setRgb(doc: { setTextColor: (r: number, g: number, b: number) => void }, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function setFill(doc: { setFillColor: (r: number, g: number, b: number) => void }, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setDraw(doc: { setDrawColor: (r: number, g: number, b: number) => void }, c: RGB) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

const PAGE_MARGIN = 18;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - 12;

function tierColor(fraction: number): RGB {
  if (fraction >= 0.8) return COLOR.teal;
  if (fraction >= 0.5) return COLOR.gold;
  return COLOR.burgundy;
}

export function DownloadPdfButton({
  score,
  whatYouSaid = [],
  repName = "Rep",
  reflection,
}: DownloadPdfButtonProps) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = 0;

    function drawHeader() {
      setFill(doc, COLOR.navy);
      doc.rect(0, 0, PAGE_WIDTH, 30, "F");
      setFill(doc, COLOR.gold);
      doc.rect(0, 30, PAGE_WIDTH, 1.2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(255, 255, 255);
      doc.text("CORNERMAN", PAGE_MARGIN, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setRgb(doc, COLOR.headerText);
      doc.text("SALES PRACTICE REPORT", PAGE_MARGIN, 21.5);
      doc.text(repName, PAGE_WIDTH - PAGE_MARGIN, 13, { align: "right" });
      const dateLabel = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      doc.text(dateLabel, PAGE_WIDTH - PAGE_MARGIN, 19, { align: "right" });
    }

    function newPage() {
      doc.addPage();
      drawHeader();
      y = 44;
    }

    function ensureSpace(need: number) {
      if (y + need > PAGE_HEIGHT - 22) newPage();
    }

    function sectionTitle(text: string) {
      ensureSpace(11);
      setFill(doc, COLOR.navy);
      doc.rect(PAGE_MARGIN, y - 2.6, 2.2, 2.2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      setRgb(doc, COLOR.navy);
      doc.text(text.toUpperCase(), PAGE_MARGIN + 6, y);
      setDraw(doc, COLOR.hairline);
      doc.setLineWidth(0.25);
      doc.line(PAGE_MARGIN, y + 2, PAGE_WIDTH - PAGE_MARGIN, y + 2);
      y += 9;
    }

    function bulletList(items: string[]) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setRgb(doc, COLOR.ink);
      for (const item of items) {
        const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 10);
        ensureSpace(lines.length * 5 + 2);
        setFill(doc, COLOR.navy);
        doc.circle(PAGE_MARGIN + 2.2, y - 1.3, 0.7, "F");
        doc.text(lines, PAGE_MARGIN + 6, y);
        y += lines.length * 5 + 2.5;
      }
    }

    /** White box, hairline border, single navy stripe. No color-wash fill. */
    function calloutBox(text: string, opts: { italic?: boolean } = {}) {
      doc.setFont("helvetica", opts.italic ? "italic" : "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 14);
      const boxHeight = lines.length * 5 + 10;
      ensureSpace(boxHeight + 2);
      setDraw(doc, COLOR.hairline);
      doc.setLineWidth(0.3);
      doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, boxHeight, 1.5, 1.5, "S");
      setFill(doc, COLOR.navy);
      doc.rect(PAGE_MARGIN, y, 1, boxHeight, "F");
      setRgb(doc, COLOR.ink);
      doc.text(lines, PAGE_MARGIN + 7, y + 6.5);
      y += boxHeight + 6;
    }

    /** Single continuous ring-segment path (annulus sector) — one fill, no seams. */
    function ringSector(cx: number, cy: number, outerR: number, innerR: number, fromDeg: number, toDeg: number, color: RGB) {
      if (toDeg <= fromDeg) return;
      setFill(doc, color);
      const segments = 48;
      const step = (toDeg - fromDeg) / segments;
      const outer: [number, number][] = [];
      for (let s = 0; s <= segments; s++) {
        const a = ((fromDeg + s * step) * Math.PI) / 180;
        outer.push([cx + outerR * Math.cos(a), cy + outerR * Math.sin(a)]);
      }
      const inner: [number, number][] = [];
      for (let s = segments; s >= 0; s--) {
        const a = ((fromDeg + s * step) * Math.PI) / 180;
        inner.push([cx + innerR * Math.cos(a), cy + innerR * Math.sin(a)]);
      }
      const path = [...outer, ...inner];
      const start = path[0];
      const deltas = path.slice(1).map((p, i) => [p[0] - path[i][0], p[1] - path[i][1]] as [number, number]);
      doc.lines(deltas, start[0], start[1], [1, 1], "F", true);
    }

    /** Overall score: semi-circular donut gauge (tier-colored) + a fee/context side panel. */
    function scoreSection() {
      sectionTitle("Overall score");
      const gaugeHeight = 58;
      ensureSpace(gaugeHeight);
      const cx = PAGE_MARGIN + 38;
      const cyBase = y + 32;
      const outerR = 28;
      const innerR = 19;
      const midR = (outerR + innerR) / 2;
      const capR = (outerR - innerR) / 2;
      const color = tierColor(score.overall / 100);
      const fraction = score.overall / 100;
      const startDeg = 180;
      const endDeg = 360;
      const fillEnd = startDeg + (endDeg - startDeg) * fraction;

      ringSector(cx, cyBase, outerR, innerR, startDeg, endDeg, COLOR.track);
      ringSector(cx, cyBase, outerR, innerR, startDeg, fillEnd, color);
      const a0 = (startDeg * Math.PI) / 180;
      const a1 = (fillEnd * Math.PI) / 180;
      setFill(doc, color);
      doc.circle(cx + midR * Math.cos(a0), cyBase + midR * Math.sin(a0), capR, "F");
      doc.circle(cx + midR * Math.cos(a1), cyBase + midR * Math.sin(a1), capR, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(27);
      setRgb(doc, COLOR.navy);
      doc.text(String(score.overall), cx, cyBase - 1, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setRgb(doc, COLOR.muted);
      doc.text("OUT OF 100", cx, cyBase + 6, { align: "center" });

      const panelX = PAGE_MARGIN + 84;
      const panelW = CONTENT_WIDTH - 84;
      let py = y + 2;
      const feeColor: RGB = score.heldFee ? COLOR.teal : COLOR.burgundy;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setRgb(doc, feeColor);
      doc.text(score.heldFee ? "Fee held" : "Fee softened", panelX, py + 4);
      setDraw(doc, COLOR.hairline);
      doc.setLineWidth(0.3);
      doc.line(panelX, py + 7, panelX + panelW, py + 7);
      py += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setRgb(doc, COLOR.muted);
      doc.text(
        score.feeOfferedPct !== null ? `Lowest offered: ${score.feeOfferedPct}%` : "No explicit fee offered",
        panelX,
        py
      );
      py += 6;
      doc.text(`Scenario: ${score.scenarioId.replace(/-/g, " ")}`, panelX, py);
      py += 6;
      doc.text(`Scoring method: ${score.method}`, panelX, py);

      y += gaugeHeight;
    }

    const SHORT_LABEL: Record<string, string> = {
      explored_objection: "Explored objection",
      asked_clarifying_q: "Clarifying Qs",
      anchored_value: "Anchored value",
      held_fee: "Held fee",
      used_approved_play: "Approved play",
      no_early_cave: "No early cave",
    };

    /** Radar chart across all rubric criteria — navy grid, tier-colored vertices. */
    function radarChart() {
      sectionTitle("Skill radar");
      const n = score.criteria.length;
      const R = 30;
      const chartHeight = R * 2 + 24;
      ensureSpace(chartHeight);
      const cx = PAGE_MARGIN + CONTENT_WIDTH / 2;
      const cy = y + R + 6;

      const angleFor = (i: number) => ((-90 + i * (360 / n)) * Math.PI) / 180;
      const pt = (i: number, frac: number): [number, number] => [
        cx + R * frac * Math.cos(angleFor(i)),
        cy + R * frac * Math.sin(angleFor(i)),
      ];

      setDraw(doc, COLOR.hairline);
      doc.setLineWidth(0.25);
      for (const level of [0.25, 0.5, 0.75, 1]) {
        const pts = Array.from({ length: n }, (_, i) => pt(i, level));
        for (let i = 0; i < n; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % n];
          doc.line(a[0], a[1], b[0], b[1]);
        }
      }
      for (let i = 0; i < n; i++) {
        const [x, yy] = pt(i, 1);
        doc.line(cx, cy, x, yy);
      }

      const dataPts = score.criteria.map((c, i) => pt(i, Math.max(c.score, 0.04)));
      doc.setFillColor(230, 236, 242);
      setDraw(doc, COLOR.navy);
      doc.setLineWidth(0.7);
      const first = dataPts[0];
      const deltas = dataPts.slice(1).map((p, idx) => [p[0] - dataPts[idx][0], p[1] - dataPts[idx][1]] as [number, number]);
      deltas.push([first[0] - dataPts[n - 1][0], first[1] - dataPts[n - 1][1]]);
      doc.lines(deltas, first[0], first[1], [1, 1], "FD", true);

      for (let i = 0; i < n; i++) {
        const c = score.criteria[i];
        setFill(doc, tierColor(c.score));
        doc.circle(dataPts[i][0], dataPts[i][1], 1.4, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (let i = 0; i < n; i++) {
        const [x, yy] = pt(i, 1.18);
        const cos = Math.cos(angleFor(i));
        const sin = Math.sin(angleFor(i));
        const align: "left" | "center" | "right" = Math.abs(cos) > 0.2 ? (cos > 0 ? "left" : "right") : "center";
        const dy = sin > 0.5 ? 3 : sin < -0.5 ? -1 : 1.5;
        setRgb(doc, COLOR.ink);
        doc.text(SHORT_LABEL[score.criteria[i].id] ?? score.criteria[i].label, x, yy + dy, { align });
        setRgb(doc, COLOR.muted);
        doc.setFontSize(7.5);
        doc.text(`${Math.round(score.criteria[i].score * 100)}%`, x, yy + dy + 3.6, { align });
        doc.setFontSize(8);
      }

      y += chartHeight;
    }

    /** Rubric bar chart with axis gridlines and tick labels — reads as a real chart. */
    function rubricChart() {
      sectionTitle("Rubric breakdown");
      const labelW = 42;
      const ptsW = 14;
      const barX = PAGE_MARGIN + labelW;
      const barW = CONTENT_WIDTH - labelW - ptsW;
      const barH = 5.5;

      const rowHeights = score.criteria.map(
        (c) => barH + 2 + doc.splitTextToSize(c.notes, barW).length * 3.6 + 4
      );
      const chartTotalHeight = rowHeights.reduce((a, b) => a + b, 0) + 6;
      ensureSpace(Math.min(chartTotalHeight, PAGE_HEIGHT - 60));

      const chartTop = y + 4;
      setDraw(doc, COLOR.hairline);
      doc.setLineWidth(0.2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setRgb(doc, COLOR.muted);
      const rowsHeight = rowHeights.reduce((a, b) => a + b, 0);
      for (const pct of [0, 25, 50, 75, 100]) {
        const gx = barX + barW * (pct / 100);
        doc.line(gx, chartTop - 3, gx, chartTop + rowsHeight);
        doc.text(`${pct}`, gx, chartTop - 5, { align: "center" });
      }

      let yy = chartTop;
      for (const c of score.criteria) {
        const color = tierColor(c.score);
        ensureSpace(barH + 2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setRgb(doc, COLOR.ink);
        doc.text(c.label, PAGE_MARGIN, yy + barH - 1.2, { maxWidth: labelW - 3 });

        setFill(doc, color);
        doc.rect(barX, yy, Math.max(barW * c.score, 1.5), barH, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        setRgb(doc, color);
        doc.text(`${Math.round(c.score * c.max)}/${c.max}`, barX + barW + 2, yy + barH - 1.2);

        yy += barH + 2;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        setRgb(doc, COLOR.muted);
        const noteLines = doc.splitTextToSize(c.notes, barW);
        doc.text(noteLines, barX, yy + 3);
        yy += noteLines.length * 3.6 + 4;
      }
      y = yy + 4;
    }

    function stampFooters() {
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        setDraw(doc, COLOR.hairline);
        doc.setLineWidth(0.3);
        doc.line(PAGE_MARGIN, FOOTER_Y - 4, PAGE_WIDTH - PAGE_MARGIN, FOOTER_Y - 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setRgb(doc, COLOR.muted);
        doc.text("Cornerman · AI-assisted sales practice · fictional demo data", PAGE_MARGIN, FOOTER_Y);
        doc.text(`Page ${i} of ${total}`, PAGE_WIDTH - PAGE_MARGIN, FOOTER_Y, { align: "right" });
      }
    }

    // --- Build the document ---
    drawHeader();
    y = 44;

    scoreSection();
    y += 6;
    radarChart();
    y += 4;

    sectionTitle("What you said");
    bulletList(whatYouSaid.length > 0 ? whatYouSaid.slice(-3) : ["(No transcript captured)"]);
    y += 2;

    sectionTitle("Approved talk-track");
    calloutBox(score.approvedPlayReminder);

    sectionTitle("Feedback");
    bulletList(score.feedback);
    y += 2;

    sectionTitle("Suggested response — rehearse this");
    calloutBox(`“${score.suggestedResponse}”`, { italic: true });

    const went = reflection?.whatWentWrong?.trim() ?? "";
    const next = reflection?.nextTime?.trim() ?? "";
    if (went || next) {
      sectionTitle("Self-reflection");
      const lines: string[] = [];
      if (went) lines.push(`What went wrong: ${went}`);
      if (next) lines.push(`Next time I will: ${next}`);
      bulletList(lines);
      y += 2;
    }

    rubricChart();

    stampFooters();
    doc.save(`cornerman-practice-${score.scenarioId}-${Date.now()}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={busy}
      className="btn-lift inline-flex h-12 shrink-0 items-center justify-center gap-2.5 rounded-full bg-accent px-7 text-base font-semibold text-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <DownloadIcon className="h-5 w-5" />
      {busy ? "Preparing…" : "Download report"}
    </button>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4 17.5v1.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
    </svg>
  );
}
