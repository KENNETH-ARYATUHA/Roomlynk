
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  isLoading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={`btn btn--${variant}`} disabled={disabled || isLoading} {...rest}>
      {isLoading ? 'Please wait…' : children}
    </button>
  );
}