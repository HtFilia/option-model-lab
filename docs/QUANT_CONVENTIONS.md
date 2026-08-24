# Option Model Lab — Quantitative Conventions

## 1. Purpose

This document defines numerical and financial conventions shared by the project.

Any model implementation must either follow these conventions or explicitly document why it differs.

The goal is to prevent silent inconsistencies between pricing, calibration, charts, and tests.

---

## 2. Initial product universe

Milestone 1 supports:

- European call options;
- European put options;
- a single underlying spot;
- deterministic continuously compounded risk-free rate;
- deterministic continuous dividend yield;
- Black-Scholes lognormal dynamics.

No American exercise.

No discrete dividends.

No stochastic rates.

No transaction costs.

No market-data conventions specific to a vendor.

---

## 3. Time

Time to maturity is represented by:

\[
T \ge 0
\]

and measured in years.

The UI may display days, months, or years, but the quant layer receives a year fraction.

For the initial educational application, conversion from days may use:

\[
T = \frac{\text{days}}{365}
\]

unless a scenario explicitly demonstrates another convention.

Do not imply that this simplified convention is universal in production markets.

---

## 4. Spot and strike

\[
S > 0
\]

is the current underlying spot price.

\[
K > 0
\]

is the strike price.

Both use the same currency unit.

---

## 5. Rates

\[
r
\]

is the continuously compounded annualized risk-free rate.

Discount factor:

\[
D_r(T)=e^{-rT}.
\]

\[
q
\]

is the continuously compounded annualized dividend yield.

Dividend discount factor:

\[
D_q(T)=e^{-qT}.
\]

Forward price under these assumptions:

\[
F_0(T)=S_0e^{(r-q)T}.
\]

The UI may accept percentages, but the quant layer uses decimal values.

Example:

```text
5% -> 0.05
```

Rates may be negative.

---

## 6. Black-Scholes volatility

\[
\sigma \ge 0
\]

is annualized volatility expressed as a decimal.

Example:

```text
20% -> 0.20
```

The Black-Scholes model assumes this volatility is constant over the life of the option.

The educational application must distinguish:

- model volatility;
- implied volatility;
- realized volatility.

They are not interchangeable concepts.

---

## 7. Black-Scholes dynamics

Under the risk-neutral measure:

\[
dS_t=(r-q)S_tdt+\sigma S_tdW_t.
\]

Therefore:

\[
\log S_T
\sim
\mathcal{N}
\left(
\log S_0+
\left(r-q-\frac12\sigma^2\right)T,
\sigma^2T
\right).
\]

---

## 8. European payoffs

Call:

\[
(S_T-K)^+.
\]

Put:

\[
(K-S_T)^+.
\]

---

## 9. Black-Scholes formulas

For:

\[
T>0,\quad \sigma>0
\]

define:

\[
d_1=
\frac{
\ln(S/K)+(r-q+\frac12\sigma^2)T
}{
\sigma\sqrt{T}
},
\]

\[
d_2=d_1-\sigma\sqrt{T}.
\]

Call:

\[
C=
Se^{-qT}N(d_1)
-
Ke^{-rT}N(d_2).
\]

Put:

\[
P=
Ke^{-rT}N(-d_2)
-
Se^{-qT}N(-d_1).
\]

---

## 10. Put-call parity

All implementations must satisfy, up to numerical tolerance:

\[
C-P
=
Se^{-qT}
-
Ke^{-rT}.
\]

This is a core regression test.

---

## 11. Greeks

Unless explicitly stated otherwise, Greeks are derivatives of the option price with respect to the following raw quant-layer variables.

### Delta

\[
\Delta
=
\frac{\partial V}{\partial S}.
\]

Unit:

price change per one unit of spot.

### Gamma

\[
\Gamma
=
\frac{\partial^2V}{\partial S^2}.
\]

Unit:

delta change per one unit of spot.

### Vega

Raw quant convention:

\[
\text{Vega}_{raw}
=
\frac{\partial V}{\partial \sigma}
\]

for a volatility change of `1.00`, i.e. 100 volatility points.

UI convention should normally report vega per **1 volatility point**:

\[
\text{Vega}_{1pt}
=
0.01\,
\frac{\partial V}{\partial \sigma}.
\]

The UI must label this convention.

### Theta

Raw quant convention:

\[
\Theta
=
\frac{\partial V}{\partial t}
\]

with calendar time increasing toward maturity in the standard Black-Scholes convention.

For educational display, the project should explicitly state whether theta is reported per year or per day.

Recommended UI display:

\[
\Theta_{day}
=
\frac{\Theta_{year}}{365}.
\]

### Rho

Raw quant convention:

\[
\rho_r
=
\frac{\partial V}{\partial r}
\]

for a rate change of `1.00`.

Recommended UI display per 1 percentage point:

\[
\rho_{1pt}
=
0.01\,
\frac{\partial V}{\partial r}.
\]

Do not confuse the Greek rho with correlation parameters later used in Heston or SABR.

---

## 12. Expiry behavior

At:

\[
T=0
\]

price equals intrinsic value.

Call:

\[
C=\max(S-K,0).
\]

Put:

\[
P=\max(K-S,0).
\]

Greeks at exact expiry may be discontinuous or undefined at the strike.

The implementation must handle this explicitly rather than forcing the standard closed-form formulas through division by zero.

---

## 13. Zero-volatility behavior

At:

\[
\sigma=0
\]

the terminal value under the deterministic risk-neutral path is:

\[
S_T=S_0e^{(r-q)T}.
\]

The discounted option value should be obtained from the deterministic payoff.

The implementation must avoid numerical division by zero.

---

## 14. Implied volatility

Given a valid market option price \(V_{mkt}\), implied volatility is a non-negative solution to:

\[
V_{BS}(\sigma)=V_{mkt}.
\]

The initial implementation should use a robust bracketed scalar root-finding method.

Prefer robustness over theoretical iteration speed.

A Brent-style or bisection-compatible algorithm is appropriate.

The solver must expose diagnostics such as:

- converged;
- iteration count;
- residual;
- implied volatility.

---

## 15. No-arbitrage price bounds for implied-vol inversion

Before solving, validate the market price.

For a European call:

\[
\max(Se^{-qT}-Ke^{-rT},0)
\le C
\le Se^{-qT}.
\]

For a European put:

\[
\max(Ke^{-rT}-Se^{-qT},0)
\le P
\le Ke^{-rT}.
\]

Exact treatment of boundary prices should be documented.

An invalid price must produce an explicit domain error.

---

## 16. Numerical tolerances

Numerical tests must use justified tolerances.

Reference analytic Black-Scholes prices should normally admit tight tolerances.

Finite-difference Greek checks require looser tolerances because they introduce truncation and cancellation error.

Every test should choose either:

- absolute tolerance;
- relative tolerance;
- or both.

Do not define one global tolerance for every numerical test.

---

## 17. Finite-difference validation of Greeks

Analytic Greeks should be cross-checked against finite differences.

Examples:

Delta:

\[
\Delta
\approx
\frac{V(S+h)-V(S-h)}{2h}.
\]

Gamma:

\[
\Gamma
\approx
\frac{V(S+h)-2V(S)+V(S-h)}{h^2}.
\]

Vega:

\[
\text{Vega}
\approx
\frac{V(\sigma+h)-V(\sigma-h)}{2h}.
\]

The test step \(h\) must be chosen to balance truncation and floating-point error.

---

## 18. Normal distribution functions

The standard normal CDF and PDF must use a numerically reliable implementation.

Do not implement a low-quality approximation merely to avoid a small dependency unless the approximation is validated.

If a custom implementation is used, add dedicated accuracy tests.

---

## 19. Future model conventions

### 19.1 Heston convention implemented in Milestone 2

The Heston state variables are spot and **variance**:

\[
\frac{dS_t}{S_t}=(r-q)dt+\sqrt{v_t}\,dW_t^S,
\]

\[
dv_t=\kappa(\theta-v_t)dt+\xi\sqrt{v_t}\,dW_t^v,
\qquad
d\langle W^S,W^v\rangle_t=\rho\,dt.
\]

The parameters are:

- \(v_0\): initial variance;
- \(\theta\): long-run variance;
- \(\kappa>0\): mean-reversion speed in inverse years;
- \(\xi>0\): volatility of variance;
- \(\rho\in[-1,1]\): instantaneous spot/variance shock correlation.

UI volatility equivalents such as \(\sqrt{v_0}\) and \(\sqrt{\theta}\) must be labelled as
square roots. Variance and volatility must not be silently interchanged.

The Feller margin is:

\[
2\kappa\theta-\xi^2.
\]

The implementation reports whether this is non-negative but does not require it. A Feller
violation permits the variance process to reach zero; it does not by itself invalidate the Heston
weak solution or the Fourier price.

For complex Fourier argument \(u\), define:

\[
b=\kappa-\rho\xi iu,
\qquad
d=\sqrt{b^2+\xi^2(u^2+iu)},
\qquad
g=\frac{b-d}{b+d}.
\]

The characteristic function of \(\log S_T\) uses the principal complex square-root branch and the
little-Heston-trap ratio \(g\). European calls are evaluated as:

\[
C=S_0e^{-qT}P_1-Ke^{-rT}P_2,
\]

where \(P_1\) and \(P_2\) are recovered from the characteristic function by Fourier inversion.
Puts use put-call parity. Numerical integration uses fixed 96-point Gauss-Legendre quadrature on:

\[
u\in[0,150].
\]

This finite bound and order are implementation conventions validated against cached analytic Heston
prices. They are not universal market standards.

For \(\xi\le 10^{-3}\), direct evaluation of the characteristic function suffers cancellation in
terms proportional to \(\xi^{-2}\). The implementation uses the exact deterministic
mean-reverting-variance limit:

\[
\bar v_T=\theta+(v_0-\theta)\frac{1-e^{-\kappa T}}{\kappa T},
\]

and prices with Black-Scholes volatility \(\sqrt{\bar v_T}\).

Seeded variance-path illustrations use full-truncation Euler. They are educational visualizations
and are not used by the Fourier pricer. The displayed Heston calibration minimizes equal-weight
normalized price RMSE over a deterministic synthetic surface. The bounded deterministic simplex
search runs in a Heston-specific Web Worker because profiling showed a visible main-thread pause.

### 19.2 Merton Jump Diffusion convention implemented in Milestone 3A

Under the risk-neutral measure, spot follows:

\[
\frac{dS_t}{S_{t^-}}=(r-q-\lambda\kappa_J)dt+\sigma dW_t+(J-1)dN_t,
\]

where (N_t) is a Poisson process with intensity (lambda\geq0) and:

\[
\log J\sim\mathcal N(\mu_J,\delta_J^2),
\qquad
\kappa_J=\mathbb E[J-1]=e^{\mu_J+\delta_J^2/2}-1.
\]

The parameters are:

- \(\sigma\geq0\): annualized diffusion volatility;
- \(\lambda\geq0\): expected jump count per year;
- \(\mu_J\): mean log jump multiplier;
- \(\delta_J\geq0\): log jump-size standard deviation.

The drift compensator \(-\lambda\kappa_J\) is included so the discounted asset, after continuous dividends, has the required risk-neutral expectation. Mean log jump and expected percentage jump are not interchangeable; the UI reports \(\mathbb E[J]\) separately.

Conditional on (N_T=n), log terminal spot is normal with variance:

\[
\sigma^2T+n\delta_J^2.
\]

The European call price is evaluated as a Poisson-weighted sum of direct conditional lognormal expectations. Probabilities are accumulated until the omitted Poisson mass is no more than (10^{-13}), with a 200-term safety cap. Puts use put–call parity. When \(\lambda=0\), pricing delegates exactly to the Black–Scholes implementation at diffusion volatility \(\sigma\).

Terminal-density charts evaluate the same Poisson mixture in log-return space and transform it to a spot density. They are risk-neutral terminal distributions, not forecasts of realized returns.

The deterministic calibration fixture contains nine three-month call quotes. Diffusion volatility is fixed; \(\lambda,\mu_J,\delta_J\) are fitted within explicit bounds by minimizing equal-weight normalized price RMSE with a bounded coordinate search. The search stays on the main thread because its measured runtime is not visibly blocking.

### 19.3 SABR convention implemented in Milestone 3B

SABR is modeled on a positive forward rather than spot:

\[
dF_t=\alpha_t F_t^\beta dW_t^F,
\qquad
d\alpha_t=\nu\alpha_t dW_t^\alpha,
\qquad
d\langle W^F,W^\alpha\rangle_t=\rho\,dt.
\]

The parameters satisfy \(\alpha>0\), \(\beta\in[0,1]\), \(\rho\in(-1,1)\), and \(\nu\ge0\). The lab implements the Hagan first-order asymptotic **Black lognormal implied volatility** only. It does not implement normal volatility or a displacement, so forward and strike must both be strictly positive.

For \(z=(\nu/\alpha)(FK)^{(1-\beta)/2}\log(F/K)\), the approximation uses:

\[
x(z)=\log\left(\frac{\sqrt{1-2\rho z+z^2}+z-\rho}{1-\rho}\right).
\]

Near ATM, direct \(z/x(z)\) evaluation loses precision because both numerator and denominator vanish. The implementation uses:

\[
\frac{z}{x(z)}
\approx
1-\frac{\rho z}{2}+\frac{2-3\rho^2}{12}z^2.
\]

The resulting volatility is inserted into Black-76 with an explicit discount factor. At expiry or zero Black volatility, Black-76 returns discounted forward intrinsic value directly.

The deterministic calibration fixture contains nine two-year Black implied-volatility quotes at a 3% forward. β is fixed at 0.5; α, ρ, and ν are fitted within explicit bounds by minimizing equal-weight volatility RMSE with a SABR-specific bounded coordinate search. This calibrates one maturity smile, not an arbitrage-clean full surface.

### 19.4 Local Vol convention implemented in Milestone 3C

The Local Vol diffusion is:

\[
\frac{dS_t}{S_t}=(r-q)dt+\sigma_{loc}(S_t,t)dW_t.
\]

The controlled input surface is parameterized in forward log-moneyness \(k=\log(K/F_T)\) and total implied variance \(w(k,T)=\sigma_{imp}^2(k,T)T\) using SSVI:

\[
w(k,T)=\frac{\theta_T}{2}\left[1+\rho\phi(\theta_T)k+\sqrt{(\phi(\theta_T)k+\rho)^2+1-\rho^2}\right],
\]

with \(\theta_T=\sigma_{ATM}^2T\) and \(\phi(\theta)=\eta/\sqrt{\theta}\). Parameters must satisfy \(\sigma_{ATM}>0\), \(|\rho|<1\), and \(\eta\ge0\). Over the configured five-year domain, the implementation requires:

\[
\eta^2(1+|\rho|)\le4,
\qquad
\eta\sqrt{\theta_{max}}(1+|\rho|)<4.
\]

In total-variance coordinates, Dupire local variance is evaluated as:

\[
\sigma_{loc}^2(k,T)=
\frac{\partial_Tw}
{\left(1-\frac{k\partial_kw}{2w}\right)^2-
\frac{(\partial_kw)^2}{4}\left(\frac1w+\frac14\right)+
\frac12\partial_{kk}w}.
\]

The analytic source uses closed-form SSVI derivatives. The reconstruction fixture samples 17 log-moneyness nodes and 10 maturity nodes. It interpolates total variance with a four-point tensor Lagrange polynomial in log-moneyness and square-root time, then uses centered finite differences. The default steps are 0.025 in both log-moneyness and years.

Quote perturbations are deterministic and expressed in implied-volatility basis points. Non-positive calendar derivatives or density denominators produce explicit domain errors. They are not silently floored or clamped. The source surface and reconstructed surface are displayed separately so interpolation and differentiation error are not attributed to Dupire theory.

### 19.5 Conventions required for later models

When another stochastic-volatility implementation is introduced, document at minimum:

- variance versus volatility parameterization;
- meaning of \(v_0,\theta,\kappa,\xi,\rho\);
- Feller condition and whether the implementation requires it;
- risk-neutral dynamics;
- Fourier-transform convention;
- integration convention.

When rough models are introduced, document:

- kernel normalization;
- Hurst parameter convention;
- forward variance curve;
- Monte Carlo discretization;
- random-number reproducibility;
- variance reduction;
- calibration objective.

---

## 20. Reproducibility

Any stochastic simulation later added to the project must support deterministic seeded runs for tests and educational comparisons.

Calibration scenarios should use deterministic fixture data.

A user should be able to reset a model or scenario to a documented default state.

---

## 21. Educational honesty

Whenever the application uses a simplified convention for pedagogy, say so.

The project should distinguish:

- mathematical model assumptions;
- implementation approximations;
- real-market conventions.

Do not present pedagogical simplifications as universal industry standards.

---

## 22. Black–Scholes versus Heston comparison convention

The initial comparison uses the Heston price of a call with (K=S_0) at the selected maturity as a single calibration target. Black–Scholes implied volatility is solved from that price using the existing bracketed inversion. This gives exact agreement at the displayed at-the-money anchor up to solver tolerance.

That one Black–Scholes volatility is then held fixed while strikes or spot are varied. Heston parameters are also held fixed. The comparison does not recalibrate either model at every point, because doing so would hide the scenario disagreement the experiment is designed to teach.

The strike chart reports Black–Scholes implied volatility as the fitted constant and obtains Heston implied volatility by inverting each Heston price through Black–Scholes. Spot scenarios are static repricings, not simulated future conditional distributions, and the UI must not describe them as realized paths.
