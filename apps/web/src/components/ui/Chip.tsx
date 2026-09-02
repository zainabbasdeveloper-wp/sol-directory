import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Chip.css';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ selected = false, className = '', children, ...props }: ChipProps) {
  return (
    <button type="button" className={`chip ${selected ? 'chip-selected' : ''} ${className}`} aria-pressed={selected} {...props}>
      {children}
    </button>
  );
}

export type Tone = 'ok' | 'warn' | 'bad' | 'flat';

interface PillProps {
  tone?: Tone;
  children: ReactNode;
  showDot?: boolean;
}

export function Pill({ tone = 'flat', children, showDot = true }: PillProps) {
  return (
    <span className={`pill pill-${tone}`}>
      {showDot && <span className="pill-dot" />}
      {children}
    </span>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  id?: string;
}

export function Checkbox({ checked, onChange, label, id }: CheckboxProps) {
  return (
    <div className="checkbox-row">
      <button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        className={`checkbox-box ${checked ? 'checkbox-box-checked' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <svg className="checkbox-tick" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {label && (
        <label htmlFor={id} className="checkbox-label" onClick={() => onChange(!checked)}>
          {label}
        </label>
      )}
    </div>
  );
}
