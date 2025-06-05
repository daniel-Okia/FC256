import React from 'react';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'default';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const getVariantClasses = (): string => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100';
      case 'secondary':
        return 'bg-secondary-100 text-secondary-800 dark:bg-secondary-800 dark:text-secondary-100';
      case 'success':
        return 'bg-success-100 text-success-800 dark:bg-success-800 dark:text-success-100';
      case 'danger':
        return 'bg-error-100 text-error-800 dark:bg-error-800 dark:text-error-100';
      case 'warning':
        return 'bg-warning-100 text-warning-800 dark:bg-warning-800 dark:text-warning-100';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'default':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getSizeClasses = (): string => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'md':
        return 'text-xs px-2.5 py-1';
      case 'lg':
        return 'text-sm px-3 py-1';
      default:
        return 'text-xs px-2.5 py-1';
    }
  };

  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-full font-medium',
        getVariantClasses(),
        getSizeClasses(),
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;