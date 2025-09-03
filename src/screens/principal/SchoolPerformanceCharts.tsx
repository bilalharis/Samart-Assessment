import React, { useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Cell,
} from "recharts";

/* ---------------------------
   Donut: full round, hover-only
---------------------------- */
type DonutProps = {
  mastered: number;
  developing: number;
  support: number;
  size?: number;
  thickness?: number;
};

const COLORS = ["#15803d", "#f59e0b", "#dc2626"]; // mastered, developing, support

const Donut: React.FC<DonutProps> = ({
  mastered,
  developing,
  support,
  size = 176,
  thickness = 24,
}) => {
  const items = useMemo(
    () => [
      { key: "Mastered", value: mastered, color: COLORS[0] },
      { key: "Developing", value: developing, color: COLORS[1] },
      { key: "Needs Support", value: support, color: COLORS[2] },
    ],
    [mastered, developing, support]
  );

  const total = Math.max(0, items.reduce((s, i) => s + i.value, 0));
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;

  // full ring (no gaps)
  const lengths = total
    ? items.map(i => (i.value / total) * C)
    : items.map(() => 0);

  const offsets: number[] = [];
  lengths.reduce((acc, len, idx) => {
    offsets[idx] = acc;
    return acc + len;
  }, 0);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const active = hoverIdx;
  const activeItem = active != null ? items[active] : null;
  const activePct =
    activeItem && total ? Math.round((activeItem.value / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Performance distribution"
      >
        {/* base ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={thickness}
        />

        {/* slices (hover to highlight) */}
        {items.map((s, i) => {
          const isActive = active === i;
          const sw = thickness + (isActive ? 2 : 0);
          const dim = active != null && !isActive;
          return (
            <circle
              key={s.key}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={sw}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeDasharray={`${lengths[i]} ${C - lengths[i]}`}
              strokeDashoffset={-offsets[i]}
              opacity={dim ? 0.5 : 1}
              style={{ transition: "opacity 140ms, stroke-width 140ms" }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}

        {/* center text */}
        <g pointerEvents="none">
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="fill-royal-blue"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            {activeItem ? activeItem.key : "Total"}
          </text>
          <text
            x={cx}
            y={cy + 20}
            textAnchor="middle"
            className="fill-gray-900"
            style={{ fontSize: 24, fontWeight: 700 }}
          >
            {activeItem ? activeItem.value : total}
            {activeItem && total ? ` (${activePct}%)` : ""}
          </text>
        </g>
      </svg>

      {/* legend (hover sync only) */}
      <div className="text-sm leading-7">
        {items.map((s, i) => {
          const pct = total ? Math.round((s.value / total) * 100) : 0;
          const isActive = active === i;
          return (
            <div
              key={s.key}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className="flex items-center gap-2 mb-1 select-none"
            >
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: s.color }}
              />
              <span className={`${isActive ? "text-royal-blue font-semibold" : "text-gray-800 font-medium"}`}>
                {s.key}
              </span>
              <span className="text-gray-900 font-semibold">— {s.value}</span>
              <span className="text-gray-500 ml-1">({pct}%)</span>
            </div>
          );
        })}
        <div className="text-xs text-gray-600 mt-2">Total students: {total}</div>
      </div>
    </div>
  );
};

/* ---------------------------
   Types
---------------------------- */
type TierCounts = {
  mastered: number;
  developing: number;
  support: number;
};

type Props = {
  subjectData: { name: string; average: number }[];
  scienceSeries: { name: string; score: number }[];
  mathSeries: { name: string; score: number }[];
  pies: {
    overall: TierCounts;
    science: TierCounts;
    math: TierCounts;
  };
};

/* ---------------------------
   Layout
---------------------------- */
const SchoolPerformanceCharts: React.FC<Props> = ({
  subjectData,
  scienceSeries,
  mathSeries,
  pies,
}) => {
  return (
    <div className="space-y-6">
      {/* Average by Subject */}
      <Card>
        <h3 className="text-xl font-bold text-royal-blue mb-4">Average Scores by Subject</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectData} margin={{ top: 8, left: 8, right: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="average" barSize={60}>
                  {subjectData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.name.toLowerCase().includes("math") ? "#D4AF37" : "#143F8C"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex h-full items-center justify-start">
            <Donut
              mastered={pies.overall.mastered}
              developing={pies.overall.developing}
              support={pies.overall.support}
              size={176}
              thickness={24}
            />
          </div>
        </div>
      </Card>

      {/* Science Progress */}
      <Card>
        <h3 className="text-xl font-bold text-royal-blue mb-4">Science Progress</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scienceSeries} margin={{ top: 8, left: 8, right: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#143F8C" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex h-full items-center justify-start">
            <Donut
              mastered={pies.science.mastered}
              developing={pies.science.developing}
              support={pies.science.support}
              size={176}
              thickness={24}
            />
          </div>
        </div>
      </Card>

      {/* Math Progress */}
      <Card>
        <h3 className="text-xl font-bold text-royal-blue mb-4">Math Progress</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mathSeries} margin={{ top: 8, left: 8, right: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#D4AF37" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex h-full items-center justify-start">
            <Donut
              mastered={pies.math.mastered}
              developing={pies.math.developing}
              support={pies.math.support}
              size={176}
              thickness={24}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SchoolPerformanceCharts;



