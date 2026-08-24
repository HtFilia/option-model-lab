export const localVolContent = {
  navigation: [
    { id: 'overview', label: 'Overview', index: '00' },
    { id: 'motivation', label: 'Why Local Vol', index: '01' },
    { id: 'dynamics', label: 'State dynamics', index: '02' },
    { id: 'surface', label: 'Surface first', index: '03' },
    { id: 'intuition', label: 'Implied vs local', index: '04' },
    { id: 'dupire', label: 'Dupire', index: '05' },
    { id: 'calibration', label: 'Reconstruction', index: '06' },
    { id: 'limitations', label: 'Model risk', index: '07' },
    { id: 'remember', label: 'Remember', index: '08' },
  ],
  eyebrow: 'Model 05 · Surface-consistent diffusion',
  title: 'Local Vol',
  intuition:
    'Replace one constant volatility with a deterministic function of time and spot, chosen so the diffusion reproduces today’s entire arbitrage-free vanilla surface.',
  motivation: {
    title: 'Fit every vanilla quote without adding hidden randomness',
    body: [
      'Black–Scholes misses the smile because one volatility must serve every strike and maturity. Local Vol asks a different question: which state-dependent diffusion is consistent with all observed European option prices today?',
      'Dupire showed that an arbitrage-free call surface determines that diffusion coefficient. Calibration becomes a differentiation problem: smooth the market surface first, then extract local variance from its slopes and curvature.',
    ],
  },
  assumptions: [
    'Spot follows a continuous diffusion with deterministic local volatility σloc(S,t).',
    'Rates and continuous dividend yield are deterministic.',
    'The input vanilla surface is smooth and free of calendar and butterfly arbitrage.',
    'European call prices are available across a continuum of strikes and maturities in theory.',
    'The market is frictionless and the diffusion is evaluated under the risk-neutral measure.',
    'This lab uses forward log-moneyness and an SSVI synthetic surface over a controlled domain.',
  ],
  surfaceLessons: [
    ['Implied σ', 'one Black volatility quote attached to an entire option lifetime'],
    ['Total variance', 'w(k,T)=σimp²(k,T)T; the stable object interpolated by this lab'],
    ['Local σ', 'instantaneous diffusion coefficient at a particular future state and time'],
    ['Density', 'strike curvature of call prices; it must remain non-negative'],
  ],
  dupire: {
    intro:
      'Dupire links time change in option value to strike curvature. In total-variance coordinates, local variance is the maturity slope divided by a density term built from first and second log-moneyness derivatives.',
    numerical:
      'Second derivatives amplify quote noise. The lab interpolates sparse total-variance nodes with a four-point tensor polynomial in log-moneyness and square-root time, then applies centered finite differences. The analytic SSVI result remains visible as a reference.',
    honesty:
      'A negative calendar derivative or density denominator is rejected as an invalid reconstruction. The engine does not replace it with zero or an arbitrary volatility floor.',
  },
  calibration: [
    'Local Vol calibration is surface-to-function reconstruction, not a search over a few model parameters. First build an arbitrage-clean implied surface; then differentiate it into σloc(S,t).',
    'The synthetic source uses SSVI with explicit sufficient static-arbitrage margins. Sparse interpolation, stencil choice, and deterministic quote perturbations are exposed separately so numerical artifacts are not mistaken for model behavior.',
  ],
  limitations: [
    'Exact fit to today’s vanillas does not guarantee realistic future smile dynamics.',
    'Differentiation makes local volatility highly sensitive to sparse, noisy, or arbitrageable quotes.',
    'Continuous diffusion cannot represent jumps or event gaps.',
    'A deterministic local-volatility path may understate uncertainty in future variance and forward skew.',
  ],
  relatedModels: [
    {
      name: 'Black–Scholes',
      relation: 'is the flat-surface special case where local volatility is constant',
      href: '#/black-scholes/learn',
      status: 'Open model',
    },
    {
      name: 'Heston',
      relation: 'makes variance stochastic instead of a deterministic state function',
      href: '#/heston/learn',
      status: 'Open model',
    },
    {
      name: 'Stochastic Local Vol',
      relation: 'combines exact vanilla calibration with stochastic variance dynamics',
      status: 'Future extension',
    },
  ],
  takeaways: [
    'Local Vol is determined from an entire arbitrage-free vanilla surface, not one option quote.',
    'Implied volatility is a lifetime quote; local volatility is an instantaneous state-dependent diffusion coefficient.',
    'Exact static fit does not imply realistic future smile dynamics, and differentiation amplifies data errors.',
  ],
} as const;
