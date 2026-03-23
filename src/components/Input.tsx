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
        <label htmlFor={id} className="inline-block mb-1 pl-1 text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        ref={ref}
        {...props}
        className={`px-3 py-2 rounded-lg w-full outline-none duration-200 border
          bg-white text-gray-900 border-gray-300 placeholder-gray-400
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-500
          dark:focus:border-blue-400 dark:focus:ring-blue-400
          ${className}`}
      />
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
