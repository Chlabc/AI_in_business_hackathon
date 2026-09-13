"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  label: string;
  /** Primary series (e.g. drill score 0–100). */
  value: number;
};

export function ConversionChart({
  data,
  label,
  seriesName = "Score",
  yDomain = [0, 100] as [number, number],
  unit = "",
}: {
  data: Point[];
  label: string;
  seriesName?: string;
  yDomain?: [number, number];
  unit?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="h-56 w-full">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </p>
        <p className="text-sm text-muted">
          No scored drills yet — finish a practice session to see the trend.
        </p>
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
          <YAxis
            stroke="var(--muted)"
            fontSize={12}
            domain={yDomain}
            tickFormatter={(v) => `${v}${unit}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
            formatter={(value) => [`${value}${unit}`, seriesName]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
