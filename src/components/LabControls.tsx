import type { OptionType } from '../quant/blackScholes';

interface OptionTypeToggleProps {
  value: OptionType;
  onChange: (value: OptionType) => void;
  legend?: string;
}

export function OptionTypeToggle({
  value,
  onChange,
  legend = 'Option type',
}: OptionTypeToggleProps) {
  return (
    <fieldset className="option-toggle">
      <legend>{legend}</legend>
      <div>
        {(['call', 'put'] as const).map((type) => (
          <button
            key={type}
            type="button"
            className={value === type ? 'active' : ''}
            aria-pressed={value === type}
            onClick={() => onChange(type)}
          >
            {type === 'call' ? 'Call' : 'Put'}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

interface ParameterControlProps {
  id: string;
  label: string;
  symbol: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  scale?: number;
  suffix?: string;
  explanation: string;
  onChange: (value: number) => void;
  showSlider?: boolean;
}

export function ParameterControl({
  id,
  label,
  symbol,
  value,
  min,
  max,
  step = 1,
  scale = 1,
  suffix = '',
  explanation,
  onChange,
  showSlider = true,
}: ParameterControlProps) {
  const displayValue = value * scale;
  const handleValue = (nextValue: number) => onChange(nextValue / scale);

  return (
    <div className="parameter-control">
      <div className="control-heading">
        <label htmlFor={id}>
          <span className="control-symbol">{symbol}</span>
          {label}
        </label>
        <div className="number-wrap">
          <input
            id={id}
            type="number"
            value={Number.isFinite(displayValue) ? displayValue : ''}
            min={min}
            max={max}
            step={step}
            onChange={(event) => handleValue(event.currentTarget.valueAsNumber)}
            aria-describedby={`${id}-help`}
          />
          {suffix ? <span>{suffix}</span> : null}
        </div>
      </div>
      {showSlider && min !== undefined && max !== undefined ? (
        <input
          className="range-input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(displayValue) ? displayValue : min}
          onChange={(event) => handleValue(event.currentTarget.valueAsNumber)}
          aria-label={`${label} slider`}
        />
      ) : null}
      <p id={`${id}-help`}>{explanation}</p>
    </div>
  );
}
