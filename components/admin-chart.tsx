/**
 * Lightweight line/bar chart — pure SVG, zero dependencies.
 * Designed for admin analytics with revenue/expense series.
 */
type Series = { label: string; color: string; points: { date: string; value: number }[] };

export function AdminChart({
  series,
  height = 220,
  formatTooltip,
}: {
  series: Series[];
  height?: number;
  formatTooltip?: (v: number) => string;
}) {
  if (series.length === 0 || series[0].points.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-ink-mute text-sm"
        style={{ height }}
      >
        Нет данных за период
      </div>
    );
  }

  const points = series[0].points;
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const max = Math.max(...allValues, 1);
  const min = 0;
  const w = 1000; // viewBox width — scales responsively
  const h = height;
  const padL = 50;
  const padR = 16;
  const padT = 12;
  const padB = 30;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const xFor = (i: number) =>
    padL + (i / Math.max(1, points.length - 1)) * innerW;
  const yFor = (v: number) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;

  // Y-axis ticks (4 intervals)
  const ticks: number[] = [];
  for (let i = 0; i <= 4; i += 1) {
    ticks.push(Math.round(min + ((max - min) * i) / 4));
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height }}
      >
        {/* Y grid + labels */}
        {ticks.map((t) => {
          const y = yFor(t);
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={w - padR}
                y1={y}
                y2={y}
                stroke="var(--line)"
                strokeDasharray="2 4"
              />
              <text
                x={padL - 6}
                y={y + 4}
                fontSize="10"
                fontFamily="monospace"
                fill="var(--ink-mute)"
                textAnchor="end"
              >
                {formatTooltip ? formatTooltip(t) : t.toLocaleString("ru-RU")}
              </text>
            </g>
          );
        })}

        {/* X-axis date labels — first, middle, last */}
        {(() => {
          const idxs = [0, Math.floor(points.length / 2), points.length - 1];
          return idxs.map((i) => {
            const p = points[i];
            if (!p) return null;
            const d = p.date.slice(5); // MM-DD
            return (
              <text
                key={i}
                x={xFor(i)}
                y={h - 8}
                fontSize="10"
                fontFamily="monospace"
                fill="var(--ink-mute)"
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              >
                {d}
              </text>
            );
          });
        })()}

        {/* Series lines + filled area */}
        {series.map((s, sIdx) => {
          const path = s.points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.value)}`)
            .join(" ");
          const areaPath =
            `M ${xFor(0)} ${yFor(0)} ` +
            s.points.map((p, i) => `L ${xFor(i)} ${yFor(p.value)}`).join(" ") +
            ` L ${xFor(s.points.length - 1)} ${yFor(0)} Z`;
          return (
            <g key={sIdx}>
              <path d={areaPath} fill={s.color} fillOpacity="0.12" />
              <path d={path} stroke={s.color} strokeWidth="2" fill="none" />
              {/* Last point dot */}
              {s.points.length > 0 ? (
                <circle
                  cx={xFor(s.points.length - 1)}
                  cy={yFor(s.points[s.points.length - 1].value)}
                  r="3"
                  fill={s.color}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-2 text-[12px] text-ink-soft">
        {series.map((s, i) => (
          <div key={i} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ background: s.color }}
            />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
