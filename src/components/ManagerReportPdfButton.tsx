"use client";

import { useState } from "react";
import type { TeamMember } from "@/data/team";

export type ManagerPdfPractice = {
  attempts: number;
  lastScore: number | null;
  feeHoldRate: number | null;
  trendLabel: string;
};

export type ManagerPdfShare = {
  shareProgressWithManager: boolean;
  updatedAt: string;
};

type ManagerReportPdfButtonProps = {
  managerName: string;
  firmLabel: string;
  teamAverageConversion: number;
  team: TeamMember[];
  focusRepName: string;
  share: ManagerPdfShare;
  practice: ManagerPdfPractice;
};

type RGB = readonly [number, number, number];

const COLOR = {
  navy: [27, 58, 92] as RGB,
  gold: [191, 149, 33] as RGB,
  teal: [26, 122, 109] as RGB,
  burgundy: [163, 52, 68] as RGB,
  ink: [30, 34, 40] as RGB,
  muted: [108, 117, 128] as RGB,
  hairline: [222, 227, 232] as RGB,
};

function setRgb(doc: { setTextColor: (...c: number[]) => void }, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function setFill(doc: { setFillColor: (...c: number[]) => void }, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setDraw(doc: { setDrawColor: (...c: number[]) => void }, c: RGB) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

const PAGE_MARGIN = 18;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

/**
 * Manager progress PDF ,  Huey-inspired navy/gold report.
 * Summaries only; never embeds transcripts.
 */
export function ManagerReportPdfButton({
  managerName,
  firmLabel,
  teamAverageConversion,
  team,
  focusRepName,
  share,
  practice,
}: ManagerReportPdfButtonProps) {
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
        doc.setTextColor(220, 226, 232);
        doc.text("MANAGER PROGRESS REPORT", PAGE_MARGIN, 21.5);
        doc.text(managerName, PAGE_WIDTH - PAGE_MARGIN, 13, { align: "right" });
        doc.text(
          new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          PAGE_WIDTH - PAGE_MARGIN,
          19,
          { align: "right" },
        );
      }

      function sectionTitle(text: string) {
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

      drawHeader();
      y = 42;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setRgb(doc, COLOR.ink);
      doc.text(firmLabel, PAGE_MARGIN, y);
      y += 6;
      setRgb(doc, COLOR.muted);
      doc.setFontSize(9);
      const honesty = doc.splitTextToSize(
        "Practice summaries appear only when the agent opts in to share ,  transcripts are never included.",
        CONTENT_WIDTH,
      );
      doc.text(honesty, PAGE_MARGIN, y);
      y += honesty.length * 4.5 + 8;

      sectionTitle("Team snapshot");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setRgb(doc, COLOR.muted);
      const cols = [0, 52, 78, 128, 168];
      const headers = ["Employee", "Conv.", "Weakest skill", "Status", "Sessions"];
      headers.forEach((h, i) => doc.text(h, PAGE_MARGIN + cols[i], y));
      y += 3;
      setDraw(doc, COLOR.hairline);
      doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const row of team) {
        setRgb(doc, COLOR.ink);
        doc.text(row.name, PAGE_MARGIN + cols[0], y);
        doc.text(`${row.conversionRate}%`, PAGE_MARGIN + cols[1], y);
        const skill = doc.splitTextToSize(row.weakestSkill, 46);
        setRgb(doc, COLOR.muted);
        doc.text(skill[0] ?? "", PAGE_MARGIN + cols[2], y);
        const statusColor: RGB = row.flagged ? COLOR.burgundy : COLOR.teal;
        setRgb(doc, statusColor);
        doc.text(row.flagged ? "Train" : "On track", PAGE_MARGIN + cols[3], y);
        setRgb(doc, COLOR.ink);
        doc.text(String(row.sessionsCompleted), PAGE_MARGIN + cols[4], y);
        y += 7;
      }
      y += 2;
      doc.setFontSize(8);
      setRgb(doc, COLOR.muted);
      doc.text(`Team listing conversion: ${teamAverageConversion}%`, PAGE_MARGIN, y);
      y += 10;

      sectionTitle(`${focusRepName} ,  practice summary`);
      if (!share.shareProgressWithManager) {
        setDraw(doc, COLOR.hairline);
        doc.setLineWidth(0.3);
        doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 28, 1.5, 1.5, "S");
        setFill(doc, COLOR.navy);
        doc.rect(PAGE_MARGIN, y, 1, 28, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        setRgb(doc, COLOR.navy);
        doc.text("Access blocked", PAGE_MARGIN + 7, y + 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setRgb(doc, COLOR.muted);
        const blocked = doc.splitTextToSize(
          "Agent has not shared progress. Practice stays private until they toggle sharing on their coach page.",
          CONTENT_WIDTH - 14,
        );
        doc.text(blocked, PAGE_MARGIN + 7, y + 17);
        y += 36;
      } else {
        const metrics: [string, string][] = [
          ["Attempts", String(practice.attempts)],
          [
            "Last score",
            practice.lastScore === null ? ", " : String(practice.lastScore),
          ],
          [
            "Price hold",
            practice.feeHoldRate === null ? ", " : `${practice.feeHoldRate}%`,
          ],
        ];
        const boxW = (CONTENT_WIDTH - 8) / 3;
        metrics.forEach(([label, value], i) => {
          const x = PAGE_MARGIN + i * (boxW + 4);
          setDraw(doc, COLOR.hairline);
          doc.roundedRect(x, y, boxW, 22, 1.2, 1.2, "S");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          setRgb(doc, COLOR.muted);
          doc.text(label, x + 4, y + 7);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          setRgb(doc, COLOR.navy);
          doc.text(value, x + 4, y + 16);
        });
        y += 28;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setRgb(doc, COLOR.ink);
        const trend = doc.splitTextToSize(practice.trendLabel, CONTENT_WIDTH);
        doc.text(trend, PAGE_MARGIN, y);
        y += trend.length * 4.5 + 4;
        doc.setFontSize(8);
        setRgb(doc, COLOR.muted);
        doc.text(
          `Transcripts omitted. Shared ${new Date(share.updatedAt).toLocaleString()}.`,
          PAGE_MARGIN,
          y,
        );
        y += 10;
      }

      doc.setFontSize(8);
      setRgb(doc, COLOR.muted);
      doc.text(
        "Cornerman · rep-owned coaching · manager sees progress, not raw calls",
        PAGE_MARGIN,
        285,
      );

      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`cornerman-manager-report-${stamp}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={busy}
      className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent disabled:opacity-50"
    >
      {busy ? "Preparing PDF…" : "Download progress PDF"}
    </button>
  );
}
