import { useId } from 'react';

interface ChartSeries<T extends object> {
  key: keyof T;
  label: string;
  format?: (value: number) => string;
}

interface ChartAccessibleSummaryProps<T extends object> {
  title: string;
  data: readonly T[];
  xKey: keyof T;
  xLabel: string;
  series: readonly ChartSeries<T>[];
  xFormat?: (value: number) => string;
  showTable?: boolean;
}

function numericValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function representativeRows<T>(data: readonly T[]): readonly T[] {
  if (data.length <= 7) return data;
  const indexes = [0, 0.25, 0.5, 0.75, 1].map((fraction) =>
    Math.round((data.length - 1) * fraction),
  );
  return [...new Set(indexes)].map((index) => data[index]!).filter(Boolean);
}

export function ChartAccessibleSummary<T extends object>({
  title,
  data,
  xKey,
  xLabel,
  series,
  xFormat = (value) => value.toFixed(2),
  showTable = true,
}: ChartAccessibleSummaryProps<T>) {
  const captionId = useId();
  const xValues = data
    .map((point) => numericValue(point[xKey]))
    .filter((v): v is number => v !== null);
  const xStart = xValues[0];
  const xEnd = xValues.at(-1);
  const seriesDescriptions = series.map(({ key, label, format = (value) => value.toFixed(4) }) => {
    const values = data
      .map((point) => numericValue(point[key]))
      .filter((value): value is number => value !== null);
    if (values.length === 0) return `${label} has no valid displayed values`;
    return `${label} ranges from ${format(Math.min(...values))} to ${format(Math.max(...values))}`;
  });
  const summary = [
    `${title}. ${data.length} plotted points.`,
    xStart !== undefined && xEnd !== undefined
      ? `${xLabel} runs from ${xFormat(xStart)} to ${xFormat(xEnd)}.`
      : null,
    ...seriesDescriptions.map((description) => `${description}.`),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="chart-accessible-summary">
      <p id={captionId} className="visually-hidden" aria-live="polite" aria-atomic="true">
        {summary}
      </p>
      {showTable ? (
        <details className="chart-data-disclosure">
          <summary>View representative chart values</summary>
          <div className="chart-data-table-scroll">
            <table aria-describedby={captionId}>
              <caption>{title}</caption>
              <thead>
                <tr>
                  <th scope="col">{xLabel}</th>
                  {series.map(({ key, label }) => (
                    <th scope="col" key={String(key)}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {representativeRows(data).map((point, index) => {
                  const x = numericValue(point[xKey]);
                  return (
                    <tr key={`${x ?? 'row'}-${index}`}>
                      <th scope="row">{x === null ? '—' : xFormat(x)}</th>
                      {series.map(({ key, format = (value) => value.toFixed(4) }) => {
                        const value = numericValue(point[key]);
                        return <td key={String(key)}>{value === null ? '—' : format(value)}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}
