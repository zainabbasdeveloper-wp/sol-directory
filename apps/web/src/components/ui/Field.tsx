import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import './Input.css';

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  id?: string;
  className?: string;
  children: ReactNode;
}

function FieldWrapper({ label, hint, error, id, className = '', children }: FieldWrapperProps) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={id ? `${id}-hint` : undefined} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={id ? `${id}-error` : undefined} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} id={id}>
      <input
        id={id}
        className={`field-input ${error ? 'field-input-error' : ''}`}
        aria-invalid={!!error}
        {...props}
      />
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
}

export function Select({ label, hint, id, children, className, ...props }: SelectProps) {
  return (
    <FieldWrapper label={label} hint={hint} id={id} className={className}>
      <select id={id} className="field-select" {...props}>
        {children}
      </select>
    </FieldWrapper>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, id, className, ...props }: TextareaProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} id={id} className={className}>
      <textarea id={id} className={`field-textarea ${error ? 'field-input-error' : ''}`} aria-invalid={!!error} {...props} />
    </FieldWrapper>
  );
}
