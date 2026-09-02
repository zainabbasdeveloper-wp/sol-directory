import type { ButtonHTMLAttributes } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'cta' | 'decision';
}

export default function Button({ variant = 'primary', size = 'default', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} btn-size-${size} ${className}`} {...props}>
      {children}
    </button>
  );
}
