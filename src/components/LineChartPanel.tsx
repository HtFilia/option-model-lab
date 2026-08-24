import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartPoint {
  spot: number;
  value: number;
}

interface LineChartPanelProps {
  title: string;
  description: string;
  data: ChartPoint[];
  currentSpot: number;
  valueLabel: string;
  valueFormatter?: (value: number) => string;
}

export function LineChartPanel({
  title,
  description,
  data,
  currentSpot,
  valueLabel,
  valueFormatter = (value) => value.toFixed(2),
}: LineChartPanelProps) {
  const spotFormatter = (value: number) => value.toFixed(0);

  return (
    <figure className="chart-panel" aria-label={`${title}. ${description}`}>
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="chart-legend">
          <i aria-hidden="true" /> {valueLabel}
        </span>
      </div>
      <div className="chart-canvas" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="2 5" />
            <XAxis
              dataKey="spot"
              tickFormatter={spotFormatter}
              stroke="var(--chart-axis)"
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              minTickGap={34}
              tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
            />
            <YAxis
              tickFormatter={valueFormatter}
              stroke="var(--chart-axis)"
              tickLine={false}
              axisLine={false}
              width={58}
              tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
            />
            <Tooltip
              formatter={(value) => [valueFormatter(Number(value)), valueLabel]}
              labelFormatter={(value) => `Spot ${Number(value).toFixed(2)}`}
              contentStyle={{
                border: '1px solid var(--strong-line)',
                borderRadius: 2,
                background: 'var(--chart-surface)',
                color: 'var(--ink)',
                fontSize: 13,
              }}
            />
            <ReferenceLine x={currentSpot} stroke="var(--warm)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2.25}
              dot={false}
              activeDot={{ r: 3, fill: 'var(--accent)' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption>{description}</figcaption>
    </figure>
  );
}
