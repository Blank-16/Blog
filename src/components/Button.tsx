import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
}

const variantClass: Record<string, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-80',
  outline: 'bg-transparent border border-edge text-ink hover:opacity-60',
  ghost:   'bg-transparent text-muted hover:text-ink',
};

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
