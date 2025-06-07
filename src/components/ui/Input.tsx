import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      containerClassName,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={twMerge(fullWidth ? 'w-full' : '', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={twMerge(
              'block w-full rounded-lg shadow-sm border transition-colors duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 sm:text-sm',
              'border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
              'hover:border-gray-400 dark:hover:border-gray-500',
              leftIcon ? 'pl-10' : 'px-3',
              rightIcon ? 'pr-10' : 'px-3',
              'py-2.5',
              error
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500/20 focus:border-red-500 dark:border-red-500 dark:text-red-100'
                : '',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p
            className="mt-2 text-sm text-red-600 dark:text-red-400"
            id={`${inputId}-error`}
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            className="mt-2 text-sm text-gray-500 dark:text-gray-400"
            id={`${inputId}-helper`}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;