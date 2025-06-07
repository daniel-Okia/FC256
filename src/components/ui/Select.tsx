import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';
import { Option } from '../../types';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  containerClassName?: string;
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      fullWidth = false,
      containerClassName,
      className,
      id,
      placeholder,
      ...props
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={twMerge(fullWidth ? 'w-full' : '', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={twMerge(
              'block w-full rounded-lg shadow-sm border transition-colors duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 sm:text-sm appearance-none',
              'border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-white',
              'hover:border-gray-400 dark:hover:border-gray-500',
              'px-3 py-2.5 pr-10',
              error
                ? 'border-red-300 text-red-900 focus:ring-red-500/20 focus:border-red-500 dark:border-red-500 dark:text-red-100'
                : '',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        {error && (
          <p
            className="mt-2 text-sm text-red-600 dark:text-red-400"
            id={`${selectId}-error`}
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            className="mt-2 text-sm text-gray-500 dark:text-gray-400"
            id={`${selectId}-helper`}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;