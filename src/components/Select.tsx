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
        <label htmlFor={id} className="inline-block mb-1 pl-1 text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}
      <select
        {...props}
        id={id}
        ref={ref}
        className={`px-3 py-2 rounded-lg w-full outline-none duration-200 border
          bg-white text-gray-900 border-gray-300
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600
          dark:focus:border-blue-400
          ${className}`}
      >
        {options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
