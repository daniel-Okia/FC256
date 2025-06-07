import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Option } from '../../types';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  containerClassName?: string;
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
      onChange,
      ...props
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className={twMerge(fullWidth ? 'w-full' : '', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={twMerge(
            'block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-neutral-800 dark:text-white',
            error
              ? 'border-error-300 text-error-900 focus:ring-error-500 focus:border-error-500'
              : '',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
          onChange={handleChange}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p
            className="mt-1 text-sm text-error-600 dark:text-error-400"
            id={`${selectId}-error`}
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            className="mt-1 text-sm text-gray-500 dark:text-gray-400"
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