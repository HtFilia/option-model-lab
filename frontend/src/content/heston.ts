export const hestonContent = {
  navigation: [
    { id: 'overview', label: 'Overview', index: '00' },
    { id: 'motivation', label: 'Why it exists', index: '01' },
    { id: 'variance', label: 'Stochastic variance', index: '02' },
    { id: 'parameters', label: 'Five parameters', index: '03' },
    { id: 'intuition', label: 'Visual intuition', index: '04' },
    { id: 'pricing', label: 'Fourier pricing', index: '05' },
    { id: 'calibration', label: 'Surface calibration', index: '06' },
    { id: 'limitations', label: 'Model risk', index: '07' },
    { id: 'remember', label: 'Remember', index: '08' },
  ],
  eyebrow: 'Model 02 · Stochastic variance',
  title: 'Heston',
  intuition:
    'Let variance move randomly, pull back toward a long-run level, and co-move with spot so one model can create a volatility skew.',
  motivation: {
    title: 'Black–Scholes leaves a visible pattern unexplained',
    body: [
      'Market prices imply different Black–Scholes volatilities at different strikes and maturities. A single constant σ cannot reproduce that surface, so its pricing errors are systematic rather than random.',
      'Heston keeps continuous equity paths but makes variance a second stochastic state variable. Correlated spot and variance shocks create asymmetry, while mean reversion produces a time scale for volatility.',
    ],
  },
  assumptions: [
    'The asset and its variance follow continuous diffusions under the risk-neutral measure; there are no price jumps.',
    'Variance follows a square-root process, which keeps the theoretical process non-negative.',
    'The risk-free rate, dividend yield, and five Heston parameters are constant through time.',
    'The two Brownian shocks have constant instantaneous correlation ρ.',
    'European exercise and frictionless-market assumptions remain.',
  ],
  parameters: [
    ['v₀', 'initial variance; its square root is today’s instantaneous volatility'],
    ['θ', 'long-run variance level toward which the process reverts'],
    ['κ', 'mean-reversion speed, in inverse years'],
    ['ξ', 'volatility of variance, controlling how violently variance moves'],
    ['ρ', 'instantaneous correlation between spot and variance shocks'],
  ],
  parameterLessons: [
    ['v₀', 'mostly anchors short-maturity volatility'],
    ['θ', 'mostly anchors the long-maturity volatility level'],
    ['κ', 'controls how quickly the influence of v₀ fades toward θ'],
    ['ξ', 'adds smile curvature and fattens the range of variance outcomes'],
    ['ρ', 'tilts the smile; negative equity correlation creates downside skew'],
  ],
  pricing: {
    intro:
      'There is no Black–Scholes-style elementary formula. Heston derives the characteristic function of log-price and recovers two exercise probabilities by numerical Fourier inversion.',
    convention:
      'The implementation prices P₁ and P₂ with 96-point Gauss–Legendre quadrature on u ∈ [0,150], uses the little-Heston-trap characteristic-function form, and applies put–call parity for puts.',
    approximation:
      'When ξ is at or below 0.001, the general formula becomes cancellation-prone. The engine switches to the exact deterministic mean-reverting variance limit and prices its time-averaged variance with Black–Scholes.',
  },
  feller: {
    title: 'The Feller condition is a diagnostic, not an admission ticket',
    body: 'When 2κθ ≥ ξ², the continuous-time variance process stays strictly away from zero under standard conditions. The Heston model still has a non-negative weak solution when this inequality fails, so this lab reports the margin but does not reject the parameters.',
  },
  calibration: [
    'Heston calibration chooses five parameters jointly so model prices or implied volatilities fit many market quotes. Unlike one-dimensional implied-volatility inversion, parameters can compensate for one another.',
    'The lab uses a deterministic synthetic surface, explicit bounds, an equal-weight normalized price RMSE objective, and a bounded deterministic simplex search. A good fit does not mean the parameters are uniquely identified.',
  ],
  limitations: [
    'Continuous paths still cannot represent overnight gaps, earnings jumps, or crash discontinuities.',
    'Five parameters may be weakly identified: different combinations can produce similar vanilla surfaces.',
    'Constant parameters struggle with very short-dated skew and the full dynamics of the volatility surface.',
    'Fourier pricing is fast for vanillas but path-dependent claims need another numerical method.',
  ],
  relatedModels: [
    {
      name: 'Rough Heston',
      relation: 'changes the variance memory to address steep short-maturity skew',
    },
    {
      name: 'Stochastic Local Vol',
      relation: 'adds a local-volatility leverage function for a tighter surface fit',
    },
    {
      name: 'Merton Jump Diffusion',
      relation: 'adds discontinuous price moves that Heston still excludes',
      href: '#/merton-jump-diffusion/learn',
      status: 'Open model',
    },
  ],
  takeaways: [
    'Variance is a stochastic, mean-reverting state variable—not one constant input.',
    'Correlation creates skew; vol-of-vol creates curvature and richer tails.',
    'Surface calibration is a joint optimization, and a close fit does not guarantee unique parameters.',
  ],
} as const;
