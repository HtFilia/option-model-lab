export const blackScholesContent = {
  navigation: [
    { id: 'overview', label: 'Overview', index: '00' },
    { id: 'motivation', label: 'Why it exists', index: '01' },
    { id: 'dynamics', label: 'Risk-neutral idea', index: '02' },
    { id: 'intuition', label: 'Visual intuition', index: '03' },
    { id: 'equations', label: 'Core equations', index: '04' },
    { id: 'inversion', label: 'Implied volatility', index: '05' },
    { id: 'limitations', label: 'Model risk', index: '06' },
    { id: 'remember', label: 'Remember', index: '07' },
  ],
  visualIntuition: {
    title: 'See what the assumptions do',
    intro:
      'A formula becomes useful when its shape tells a financial story. These deterministic views connect volatility, time value, hedging, and the model’s most visible market failure.',
    smileScenario: [
      { strike: 70, modelVolatility: 20, syntheticMarketVolatility: 34 },
      { strike: 80, modelVolatility: 20, syntheticMarketVolatility: 29 },
      { strike: 90, modelVolatility: 20, syntheticMarketVolatility: 24.5 },
      { strike: 100, modelVolatility: 20, syntheticMarketVolatility: 21 },
      { strike: 110, modelVolatility: 20, syntheticMarketVolatility: 19 },
      { strike: 120, modelVolatility: 20, syntheticMarketVolatility: 18 },
      { strike: 130, modelVolatility: 20, syntheticMarketVolatility: 18.5 },
    ],
  },
  eyebrow: 'Model 01 · Constant volatility',
  title: 'Black–Scholes',
  intuition:
    'Turn an uncertain future payoff into a present value by continuously hedging away the underlying price risk.',
  motivation: {
    title: 'Why this model exists',
    body: [
      'Before Black–Scholes, option valuation lacked a common, internally consistent link between an option and a dynamic hedge in the underlying. The 1973 framework made the hedge—not an investor’s forecast of the stock’s expected return—the center of the argument.',
      'Its breakthrough was to show that, under a strict set of assumptions, an option can be replicated and therefore priced without choosing a subjective risk premium for the stock.',
    ],
  },
  assumptions: [
    'The underlying follows a continuous lognormal diffusion; there are no jumps.',
    'Volatility and the continuously compounded risk-free rate are constant.',
    'Trading is continuous, frictionless, and permits short selling.',
    'The option is European, so it can be exercised only at maturity.',
    'A continuous dividend yield represents payouts from the underlying.',
  ],
  parameters: [
    ['S', 'spot today'],
    ['K', 'strike paid or received at exercise'],
    ['T', 'remaining time in years'],
    ['σ', 'annualized model volatility'],
    ['r', 'continuously compounded risk-free rate'],
    ['q', 'continuous dividend yield'],
  ],
  derivation: [
    'Assume the risk-neutral stock dynamics shown above and apply Itô’s lemma to the option value V(S,t).',
    'Hold one option and −Δ shares, choosing Δ = ∂V/∂S so the instantaneous random term cancels.',
    'A locally riskless portfolio must earn the risk-free rate; this gives the Black–Scholes PDE.',
    'Solve the PDE with the terminal call or put payoff to obtain the closed-form formulas.',
  ],
  impliedVolatility: [
    'Market participants often observe an option price first and ask which σ makes the Black–Scholes formula reproduce it. That inverse solution is implied volatility.',
    'It is not a forecast mechanically extracted from nature. It is the constant volatility number that translates one market price through this model’s assumptions.',
  ],
  limitations: [
    'A single constant volatility cannot reproduce the strike and maturity patterns seen in market implied volatilities.',
    'Continuous paths exclude sudden jumps and gap risk.',
    'Continuous hedging, frictionless markets, and constant rates are idealizations.',
    'Lognormal returns understate several observed tail and skew effects.',
  ],
  relatedModels: [
    {
      name: 'Local Vol',
      relation: 'lets volatility vary with spot and time to fit today’s surface',
    },
    {
      name: 'Heston',
      relation: 'makes variance stochastic to create skew and evolving volatility',
      href: '#/heston/learn',
      status: 'Open model',
    },
    {
      name: 'Merton Jump Diffusion',
      relation: 'add discontinuous moves to represent gap and event risk',
      href: '#/merton-jump-diffusion/learn',
      status: 'Open model',
    },
  ],
  takeaways: [
    'Replication and no-arbitrage—not a directional forecast—drive the price.',
    'One constant σ makes the model elegant, fast, and systematically incomplete.',
    'Implied volatility is the parameter that inverts a market price through the model.',
  ],
} as const;
