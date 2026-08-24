export const comparisonContent = {
  eyebrow: 'Model risk · Compare',
  title: 'Same quote. Different world.',
  introduction:
    'Black–Scholes is matched to one Heston at-the-money option. That makes the starting price agree by construction, then exposes what a single fitted quote does not determine.',
  heldConstant: [
    'The same spot, rates, dividend yield, option type, and maturity.',
    'One Black–Scholes volatility implied by the Heston at-the-money call.',
    'The calibrated Black–Scholes volatility is held fixed during spot scenarios.',
  ],
  differences: [
    'Black–Scholes keeps volatility constant across strikes and future states.',
    'Heston lets variance move, mean-revert, and co-move with spot.',
    'The two models therefore disagree away from the fitted quote and under scenarios.',
  ],
  lessons: [
    {
      title: 'A calibration target is local',
      body: 'Matching one vanilla price identifies one Black–Scholes implied volatility. It does not identify an entire stochastic process.',
    },
    {
      title: 'The smile reveals missing structure',
      body: 'Heston correlation and volatility of variance create strike-dependent implied volatility that a flat Black–Scholes input cannot reproduce.',
    },
    {
      title: 'Dynamics are model assumptions',
      body: 'Once spot moves, the models respond according to their own dynamics. Recalibrating after every scenario would hide that disagreement.',
    },
  ],
} as const;
