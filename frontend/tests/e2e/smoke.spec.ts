import { expect, test } from '@playwright/test';
import {
  buildHestonCalibrationFixture,
  calibrateHestonFixture,
} from '../../src/features/hestonLab';

const hestonMarket = { spot: 100, riskFreeRate: 0.03, dividendYield: 0.01 };
const remoteHestonResult = calibrateHestonFixture(
  hestonMarket,
  buildHestonCalibrationFixture(hestonMarket),
);

test('explores price sensitivity and solves an implied volatility', async ({ page }) => {
  let hestonApiAvailable = false;
  await page.route('http://127.0.0.1:8000/**', (route) =>
    hestonApiAvailable
      ? route.fulfill({ status: 200, json: remoteHestonResult })
      : route.abort('connectionrefused'),
  );
  await page.goto('/#/learn');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();

  const sectionNavigation = page.getByRole('navigation', {
    name: 'Black–Scholes explanation sections',
  });
  await expect(sectionNavigation).toBeVisible();
  await sectionNavigation.getByRole('link', { name: /Visual intuition/ }).click();
  await expect(page).toHaveURL(/#\/black-scholes\/learn\/intuition$/);
  await expect(page.getByRole('heading', { name: 'See what the assumptions do' })).toBeVisible();
  await page.getByRole('button', { name: '40%' }).click();
  await expect(page.getByText('40%', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Explore' }).click();

  const firstChart = page.locator('.chart-canvas').first();
  await expect
    .poll(() =>
      firstChart
        .locator('.recharts-wrapper')
        .evaluate((element) => Math.round(element.getBoundingClientRect().width)),
    )
    .toBeGreaterThan(100);
  await expect(firstChart.locator('path.recharts-curve')).toHaveCount(1);

  const initialPrice = await page.getByTestId('option-price').textContent();
  await page.getByRole('spinbutton', { name: /Annualized volatility/ }).fill('40');
  await expect(page.getByTestId('option-price')).not.toHaveText(initialPrice ?? '');
  await page.getByRole('button', { name: 'Put', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Put value/ })).toBeVisible();

  await page.getByRole('button', { name: 'Calibrate' }).click();
  await expect(page.getByTestId('solver-result')).toBeVisible();
  await page.getByRole('spinbutton', { name: /Dividend yield/ }).fill('0');
  await page.getByRole('spinbutton', { name: /Market option price/ }).fill('10.450583572185565');

  await expect(page.getByTestId('solver-result')).toBeVisible();
  await expect(page.getByTestId('implied-volatility')).toHaveText('20.000000%');
  await expect(page.getByText('Converged', { exact: true })).toBeVisible();

  const surface = page.getByTestId('iv-surface');
  await expect(
    surface.getByRole('heading', { name: 'Implied volatility across K and T' }),
  ).toBeVisible();
  await surface.getByRole('slider', { name: 'ATM level slider' }).fill('25');
  const atTheMoneyQuote = surface.getByRole('button', {
    name: /Strike 100.00, maturity 1.00 years, implied volatility 25.00 percent/,
  });
  await expect(atTheMoneyQuote).toBeVisible();
  await atTheMoneyQuote.click();
  await expect(page.getByTestId('implied-volatility')).toHaveText('25.000000%');

  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: 'Heston', exact: true }).click();
  await expect(page).toHaveURL(/#\/heston\/learn$/);
  await expect(page.getByRole('navigation', { name: 'Heston explanation sections' })).toBeVisible();

  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  const initialHestonPrice = await page.getByTestId('heston-price').textContent();
  await page.getByRole('slider', { name: 'Spot/variance correlation slider' }).fill('-0.2');
  await expect(page.getByTestId('heston-price')).not.toHaveText(initialHestonPrice ?? '');

  await page.getByRole('button', { name: 'Calibrate', exact: true }).click();
  await page.getByRole('button', { name: 'Run bounded calibration' }).click();
  await expect(page.getByTestId('heston-calibration-result')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Converged', { exact: true })).toBeVisible();
  await expect(page.getByTestId('heston-execution-source')).toHaveText('Local browser fallback');

  hestonApiAvailable = true;
  await page.getByRole('button', { name: 'Run bounded calibration' }).click();
  await expect(page.getByTestId('heston-execution-source')).toHaveText('Remote API');

  await page.getByRole('button', { name: 'Compare Black–Scholes and Heston' }).click();
  await expect(page).toHaveURL(/#\/compare$/);
  await expect(page.getByRole('heading', { name: 'Same quote. Different world.' })).toBeVisible();
  const initialDifference = await page.getByTestId('comparison-price-difference').textContent();
  await page.getByRole('slider', { name: 'Heston correlation slider' }).fill('-0.2');
  await expect(page.getByTestId('comparison-price-difference')).not.toHaveText(
    initialDifference ?? '',
  );

  await page.getByRole('button', { name: 'Merton Jump Diffusion', exact: true }).click();
  await expect(page).toHaveURL(/#\/merton-jump-diffusion\/learn$/);
  await expect(
    page.getByRole('navigation', { name: 'Merton Jump Diffusion explanation sections' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  const initialMertonPrice = await page.getByTestId('merton-price').textContent();
  await page.getByRole('slider', { name: 'Jump intensity slider' }).fill('2');
  await expect(page.getByTestId('merton-price')).not.toHaveText(initialMertonPrice ?? '');

  await page.getByRole('button', { name: 'Calibrate', exact: true }).click();
  await page.getByRole('button', { name: 'Run bounded smile calibration' }).click();
  await expect(page.getByTestId('merton-calibration-result')).toBeVisible();
  await expect(page.getByText('Converged', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: 'SABR', exact: true }).click();
  await expect(page).toHaveURL(/#\/sabr\/learn$/);
  await expect(page.getByRole('navigation', { name: 'SABR explanation sections' })).toBeVisible();

  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  const initialSabrVolatility = await page.getByTestId('sabr-volatility').textContent();
  await page.getByRole('slider', { name: 'Correlation slider' }).fill('0.4');
  await expect(page.getByTestId('sabr-volatility')).not.toHaveText(initialSabrVolatility ?? '');

  await page.getByRole('button', { name: 'Calibrate', exact: true }).click();
  await expect(page.getByTestId('sabr-calibration-result')).toBeVisible();
  await expect(page.getByText('Converged', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: 'Local Vol', exact: true }).click();
  await expect(page).toHaveURL(/#\/local-vol\/learn$/);
  await expect(
    page.getByRole('navigation', { name: 'Local Vol explanation sections' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  const initialLocalVolatility = await page.getByTestId('local-volatility').textContent();
  await page.getByRole('slider', { name: 'Surface skew slider' }).fill('-0.2');
  await expect(page.getByTestId('local-volatility')).not.toHaveText(initialLocalVolatility ?? '');

  await page.getByRole('button', { name: 'Calibrate', exact: true }).click();
  const initialRmse = await page.getByTestId('local-vol-rmse').textContent();
  await page.getByRole('slider', { name: 'Quote perturbation slider' }).fill('20');
  await expect(page.getByTestId('local-vol-rmse')).not.toHaveText(initialRmse ?? '');
  await expect(page.getByTestId('local-vol-reconstruction-result')).toBeVisible();
});

test('keeps navigation context and remains usable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/black-scholes/learn');

  const modelNavigation = page.getByRole('navigation', { name: 'Pricing model' });
  for (const model of ['Black–Scholes', 'Heston', 'Merton Jump Diffusion', 'SABR', 'Local Vol']) {
    await expect(modelNavigation.getByRole('button', { name: model, exact: true })).toBeVisible();
  }

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await modelNavigation.getByRole('button', { name: 'Heston', exact: true }).click();
  await expect(page).toHaveURL(/#\/heston\/learn$/);
  await expect(page.getByRole('heading', { name: 'Heston', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(20);

  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await modelNavigation.getByRole('button', { name: 'SABR', exact: true }).click();
  await expect(page).toHaveURL(/#\/sabr\/explore$/);
  await expect(page).toHaveTitle(/SABR · Explore — Option Model Lab/);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(20);

  const labModes = page.getByRole('navigation', { name: 'Lab mode' });
  await expect(labModes.getByRole('button', { name: /Compare/ })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Compare Black–Scholes and Heston' }),
  ).toBeVisible();
  await expect(page.getByText('View representative chart values').first()).toBeVisible();

  for (const route of [
    '#/black-scholes/calibrate',
    '#/heston/calibrate',
    '#/local-vol/learn',
    '#/local-vol/calibrate',
  ]) {
    await page.goto(`/${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      )
      .toBeLessThanOrEqual(1);
  }
});
