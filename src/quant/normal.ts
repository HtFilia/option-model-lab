import normalCdf from '@stdlib/stats-base-dists-normal-cdf';

const INVERSE_SQRT_TWO_PI = 1 / Math.sqrt(2 * Math.PI);

export function standardNormalPdf(value: number): number {
  return INVERSE_SQRT_TWO_PI * Math.exp(-0.5 * value * value);
}

export function standardNormalCdf(value: number): number {
  return normalCdf(value, 0, 1);
}
