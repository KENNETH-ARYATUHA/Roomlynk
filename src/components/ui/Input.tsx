
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...rest }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="field">
      <label htmlFor={inputId} className="field__label">{label}</label>
      <input id={inputId} className={`field__input ${error ? 'field__input--error' : ''}`} {...rest} />
      {/* Reserve space for the error even when absent, so the form doesn't
          jump around as validation messages appear/disappear. */}
      <p className="field__error">{error ?? ''}</p>
    </div>
  );
}