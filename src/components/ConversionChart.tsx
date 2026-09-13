"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  label: string;
  /** Single-series charts use `value`; multi-series pass named keys. */
  value?: number;
  [key: string]: string | number | undefined;
};

const SERIES_COLORS = [
  "var(--accent)",
  "var(--ok)",
  "var(--warn)",
  "var(--danger)",
  "#7c3aed",
];

export function ConversionChart({
  data,
  label,
  seriesName = "Score",
  series,
  yDomain = [0, 100] as [number, number],
  unit = "",
}: {
  data: Point[];
  label: string;
  /** Label for the single `value` series (ignored when `series` is set). */
  seriesName?: string;
  /** Multi-line mode: one entry per agent / metric. */
  series?: { key: string; name: string }[];
  yDomain?: [number, number];
  unit?: string;
}) {
  const multi = series && series.length > 0;
  const hasData = multi
    ? data.some((d) => series!.some((s) => typeof d[s.key] === "number"))
    : data.length > 0;

  if (!hasData) {
    return (
      <div className="h-56 w-full">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </p>
        <p className="text-sm text-muted">
          No scored drills yet, finish a practice session to see the trend.
        </p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
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
            formatter={(value, name) => [
              `${value}${unit}`,
              typeof name === "string" ? name : seriesName,
            ]}
          />
          {multi ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {multi ? (
            series!.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: SERIES_COLORS[i % SERIES_COLORS.length] }}
                connectNulls
              />
            ))
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              name={seriesName}
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--accent)" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
