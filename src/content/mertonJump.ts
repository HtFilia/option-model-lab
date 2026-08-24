export const mertonJumpContent = {
  navigation: [
    { id: 'overview', label: 'Overview', index: '00' },
    { id: 'motivation', label: 'Why jumps', index: '01' },
    { id: 'dynamics', label: 'Jump dynamics', index: '02' },
    { id: 'parameters', label: 'Four parameters', index: '03' },
    { id: 'intuition', label: 'Visual intuition', index: '04' },
    { id: 'pricing', label: 'Poisson mixture', index: '05' },
    { id: 'calibration', label: 'Smile calibration', index: '06' },
    { id: 'limitations', label: 'Model risk', index: '07' },
    { id: 'remember', label: 'Remember', index: '08' },
  ],
  eyebrow: 'Model 03 · Discontinuous returns',
  title: 'Merton Jump Diffusion',
  intuition:
    'Keep ordinary diffusion most of the time, but allow price to jump at random event times so gaps and fat short-horizon tails become possible.',
  motivation: {
    title: 'Continuous paths cannot cross a gap instantly',
    body: [
      'Black–Scholes and Heston both move through every intermediate price. Real assets can open far from the previous close after earnings, policy decisions, defaults, or market-wide shocks.',
      'Merton adds a compound Poisson jump process to geometric Brownian motion. The diffusion describes routine movement; random jump times and lognormal jump sizes describe discontinuous event risk.',
    ],
  },
  assumptions: [
    'The diffusion volatility and jump parameters are constant through time.',
    'Jump arrivals follow an independent Poisson process with constant intensity λ.',
    'Each log jump is independent and normally distributed with mean μJ and standard deviation δJ.',
    'Rates and continuous dividend yield are deterministic and constant.',
    'The risk-neutral drift includes a compensator so the discounted asset remains a martingale.',
    'European exercise and frictionless-market assumptions remain.',
  ],
  parameters: [
    ['σ', 'diffusion volatility for ordinary continuous price movement'],
    ['λ', 'expected number of jumps per year'],
    ['μJ', 'mean of the log jump multiplier; negative values bias jumps downward'],
    ['δJ', 'standard deviation of log jump size; larger values widen event outcomes'],
  ],
  parameterLessons: [
    ['σ', 'sets the smooth background width and the smile floor'],
    ['λ', 'changes how much probability leaves the no-jump state'],
    ['μJ', 'controls jump direction and creates asymmetry'],
    ['δJ', 'fattens both tails and adds smile curvature'],
  ],
  pricing: {
    intro:
      'Conditional on exactly n jumps, terminal log-price is normal. Each conditional option value is therefore a lognormal expectation, and the final price is a Poisson-weighted sum.',
    convention:
      'The engine evaluates conditional lognormal call values directly, accumulates Poisson probabilities until the omitted mass is at most 10⁻¹³, and caps the safety loop at 200 terms. Puts use put–call parity.',
    compensator:
      'The expected jump multiplier is exp(μJ + δJ²/2). Subtracting λ times its excess over one from the drift prevents the jump specification from accidentally changing the risk-neutral expected return.',
  },
  calibration: [
    'The lab keeps diffusion volatility fixed and fits λ, μJ, and δJ to one deterministic short-maturity synthetic smile. This isolates the jump story without pretending all four parameters are always separately identified.',
    'The objective is equal-weight normalized price RMSE with explicit bounds. A bounded coordinate search is sufficient for this small educational fixture and remains model-specific.',
  ],
  limitations: [
    'Constant jump intensity cannot represent clustered crises or changing event risk.',
    'Normally distributed log jumps impose one particular tail shape and may fit asymmetric markets poorly.',
    'Jump risk is not perfectly hedgeable with continuous trading, so the risk-neutral jump law is an additional modelling choice.',
    'Constant diffusion volatility still misses stochastic volatility and evolving smile dynamics.',
  ],
  relatedModels: [
    {
      name: 'Heston',
      relation: 'makes variance stochastic but retains continuous spot paths',
      href: '#/heston/learn',
      status: 'Open model',
    },
    {
      name: 'Bates',
      relation: 'combines Heston stochastic variance with price jumps',
      status: 'Future extension',
    },
    {
      name: 'Local Vol with jumps',
      relation: 'adds state-dependent diffusion while retaining discontinuities',
      status: 'Future extension',
    },
  ],
  takeaways: [
    'Diffusion describes routine movement; a Poisson process creates discrete event times.',
    'Jump intensity controls frequency, while mean and dispersion control jump-size shape.',
    'A Poisson mixture preserves tractable vanilla pricing but introduces unhedgeable jump-law risk.',
  ],
} as const;
