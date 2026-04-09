import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-80',
  outline: 'bg-transparent border border-edge text-ink hover:opacity-60',
  ghost:   'bg-transparent text-muted hover:text-ink',
};

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium
        rounded-lg transition-all duration-200 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
