# Computation placement audit

Status: accepted for the first hybrid architecture slice, 2026-08-24.

## Decision rule

Placement is based on measured user-facing work, not mathematical sophistication. Browser execution is
preferred when it keeps direct manipulation responsive, avoids a network round trip, and has a small,
bounded memory footprint. A Web Worker is appropriate when work is local and deterministic but can block
the main thread. Remote execution is reserved for bounded, user-triggered work whose runtime or resource
cost is material enough to justify network latency and a public API boundary.

The current browser implementation remains the numerical reference and availability fallback during the
first migration. A future increase in quote counts, paths, or grid sizes requires a fresh benchmark rather
than inheriting the placement decision below.

## Measurements

The measurements use the existing deterministic fixtures, Node 20.19.2, one warm-up invocation, and the
median wall-clock duration over repeated invocations. They are comparative development measurements, not
service-level guarantees.

| Workflow | Representative work | Median |
| --- | --- | ---: |
| Black–Scholes price and all analytic Greeks | One contract | 0.002 ms |
| Black–Scholes implied-volatility inversion | One generated market price | 0.026 ms |
| Heston pricing | One contract | 0.087 ms |
| Heston smile | 17 prices and implied volatilities | 2.142 ms |
| Heston path illustration | 4 paths × 80 time steps | 0.048 ms |
| Heston calibration | 15 quotes, five parameters, bounded simplex | 174.227 ms |
| Merton pricing | One contract | 0.006 ms |
| Merton smile | 17 prices and implied volatilities | 0.620 ms |
| Merton calibration | 9 quotes, three fitted parameters | 23.592 ms |
| SABR smile | 25 points | 0.019 ms |
| SABR calibration | 9 quotes, three fitted parameters | 1.336 ms |
| Local Vol reconstruction | One 29-point reconstructed slice | 0.501 ms |
| Local Vol surface | 42 analytic SSVI/Dupire points | 0.011 ms |
| Compare | 40 Heston prices plus Black–Scholes inversions | 4.345 ms |

## Classification

| Workflow | Current placement | Target placement | Reasoning |
| --- | --- | --- | --- |
| Black–Scholes pricing | LOCAL | LOCAL | It is called during direct manipulation and is several orders of magnitude cheaper than a network round trip. |
| Black–Scholes Greeks | LOCAL | LOCAL | The analytic Greeks are returned by the same bounded calculation as price. |
| Implied-volatility inversion | LOCAL | LOCAL | The bracketed scalar solve is fast, deterministic, and used by interactive charts. |
| Heston pricing | LOCAL | LOCAL | A single price and the complete displayed smile remain comfortably interactive; remote latency would make sliders worse. |
| Heston simulation | LOCAL | LOCAL | The present illustration is a tiny seeded path set, not a large Monte Carlo pricing workload. Larger path workloads are **BENCHMARK FIRST**. |
| Heston calibration | LOCAL + WEB WORKER | REMOTE, with explicit LOCAL + WEB WORKER fallback | It is user-triggered, has a small payload, is the slowest current workflow, and already required isolation from the main thread. It is the justified first API slice. |
| Merton pricing | LOCAL | LOCAL | The bounded Poisson mixture is fast enough for slider-driven recalculation. |
| Merton calibration | LOCAL | LOCAL | The current nine-quote fixture completes below typical network latency. Larger quote sets are **BENCHMARK FIRST**. |
| SABR | LOCAL | LOCAL | Pricing, smile generation, and the current calibration are all inexpensive and frequently react to controls. |
| Local Vol | LOCAL | LOCAL | The current analytic surface and small reconstructed slice are inexpensive. Market-scale reconstruction, smoothing, or PDE grids are **BENCHMARK FIRST**. |
| Compare | LOCAL | LOCAL | The current two-model comparison is interactive and completes within a frame on the reference run. Comparisons that add calibrated remote models must be reassessed. |

## First remote slice

Heston calibration is the only current calculation selected for remote execution. Its request must be
bounded by quote count and optimizer iterations, and its Python result must be checked against documented
TypeScript reference tolerances. The frontend must distinguish a remote result from a local Worker fallback
and must not fail globally when the API is unavailable.

No other workflow should be moved merely because the backend now exists.
