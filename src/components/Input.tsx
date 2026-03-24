import { useId, forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, type = 'text', className = '', ...props },
  ref
) {
  const id = useId();

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block mb-1.5 text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        ref={ref}
        {...props}
        className={`w-full px-3.5 py-2.5 text-sm rounded-lg outline-none border
          bg-subtle text-ink border-edge
          focus:border-ink transition-colors duration-200 ${className}`}
      />
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
