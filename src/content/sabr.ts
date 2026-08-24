export const sabrContent = {
  navigation: [
    { id: 'overview', label: 'Overview', index: '00' },
    { id: 'motivation', label: 'Why SABR', index: '01' },
    { id: 'dynamics', label: 'Forward dynamics', index: '02' },
    { id: 'parameters', label: 'α β ρ ν', index: '03' },
    { id: 'intuition', label: 'Shape the smile', index: '04' },
    { id: 'approximation', label: 'Hagan formula', index: '05' },
    { id: 'calibration', label: 'Smile fitting', index: '06' },
    { id: 'limitations', label: 'Model risk', index: '07' },
    { id: 'remember', label: 'Remember', index: '08' },
  ],
  eyebrow: 'Model 04 · Forward volatility smile',
  title: 'SABR',
  intuition:
    'Let a forward move with constant elasticity while its volatility level moves randomly too; four parameters then turn one flat Black volatility into a flexible smile.',
  motivation: {
    title: 'Rates and FX desks needed a smile that moved plausibly',
    body: [
      'A single Black volatility cannot match prices across strikes. Local-volatility models can fit today’s smile, but their predicted smile dynamics can produce unstable hedges.',
      'SABR was designed around a forward rather than an equity spot. Its compact approximation maps α, β, ρ, and ν directly into Black implied volatility, which made smile construction and risk communication practical.',
    ],
  },
  assumptions: [
    'The modeled state is a positive forward F, not a dividend-paying spot.',
    'The forward has no drift under its associated pricing measure.',
    'The volatility level αt is lognormal and has no mean reversion.',
    'β, ρ, and ν are constant for the fitted expiry slice.',
    'This lab quotes unshifted Black lognormal implied volatility only.',
    'European exercise and deterministic discounting are assumed.',
  ],
  parameters: [
    ['α', 'current volatility level; its units depend on β'],
    ['β', 'elasticity of forward volatility, constrained to [0, 1]'],
    ['ρ', 'correlation between forward and volatility shocks'],
    ['ν', 'volatility of the volatility level, constrained to be non-negative'],
  ],
  parameterLessons: [
    ['α', 'anchors the overall level, especially near the forward'],
    ['β', 'controls how the diffusion scales with the forward level'],
    ['ρ', 'tilts the smile and sets much of its skew direction'],
    ['ν', 'raises wing curvature by making volatility itself uncertain'],
  ],
  approximation: {
    intro:
      'The Hagan expansion returns a Black lognormal implied volatility directly. That is an approximation to SABR dynamics, not an exact transition-density solution.',
    atm: 'At K = F, both z and x(z) vanish. The engine evaluates their analytic limit with a local series, so the displayed smile remains continuous instead of dividing 0 by 0.',
    convention:
      'The same implied volatility is inserted into Black-76 with an explicit discount factor. This keeps forward modeling, volatility quoting, and present-value discounting separate.',
  },
  calibration: [
    'Market inputs are implied-volatility quotes across strikes for one expiry. The lab fixes β and fits α, ρ, and ν by equal-weight volatility RMSE with explicit bounds.',
    'Fixing β is common because α and β can trade off strongly in a single smile. A production surface usually calibrates many expiry slices and then regularizes or interpolates parameters across time.',
  ],
  limitations: [
    'The Hagan expansion can become inaccurate at long maturities, extreme strikes, or extreme parameters.',
    'A fitted smile is not automatically free of butterfly or calendar arbitrage.',
    'Unshifted lognormal volatility requires positive forwards and strikes; negative rates need a shifted or normal convention.',
    'Parameters fitted independently by expiry can jump through time unless the surface construction adds discipline.',
  ],
  relatedModels: [
    {
      name: 'Black–Scholes',
      relation: 'uses one flat lognormal volatility instead of a strike-dependent smile',
      href: '#/black-scholes/learn',
      status: 'Open model',
    },
    {
      name: 'Heston',
      relation: 'models stochastic equity variance and prices through a characteristic function',
      href: '#/heston/learn',
      status: 'Open model',
    },
    {
      name: 'Local Vol',
      relation: 'fits a full arbitrage-clean surface through state-dependent volatility',
      status: 'Planned model',
    },
  ],
  takeaways: [
    'SABR models a forward and produces a strike-dependent implied-volatility smile.',
    'α sets level, β sets elasticity, ρ sets skew, and ν sets much of the curvature.',
    'The Hagan formula is a useful approximation whose ATM limit and quote convention must be explicit.',
  ],
} as const;
