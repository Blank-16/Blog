import { useId, forwardRef, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: string[];
  label?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, label, className = '', ...props },
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
      <select
        {...props}
        id={id}
        ref={ref}
        className={`w-full px-3.5 py-2.5 text-sm rounded-lg outline-none border
          bg-subtle text-ink border-edge
          focus:border-ink transition-colors duration-200 ${className}`}
      >
        {options?.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
