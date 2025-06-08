import React from 'react';
import { twMerge } from 'tailwind-merge';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost' | 'yellow';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const getVariantClasses = (): string => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500';
      case 'secondary':
        return 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500';
      case 'success':
        return 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500';
      case 'danger':
        return 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500';
      case 'warning':
        return 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500';
      case 'yellow':
        return 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 shadow-yellow-glow hover:shadow-lg';
      case 'outline':
        return 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 focus:ring-gray-400';
      case 'ghost':
        return 'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 focus:ring-gray-400';
      default:
        return 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500';
    }
  };

  const getSizeClasses = (): string => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2.5 py-1.5';
      case 'md':
        return 'text-sm px-4 py-2';
      case 'lg':
        return 'text-base px-6 py-3';
      default:
        return 'text-sm px-4 py-2';
    }
  };

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={twMerge(
        baseClasses,
        getVariantClasses(),
        getSizeClasses(),
        widthClass,
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;