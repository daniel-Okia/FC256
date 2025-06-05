import React from 'react';
import { twMerge } from 'tailwind-merge';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
}) => {
  const getSizeClass = (): string => {
    switch (size) {
      case 'sm':
        return 'h-5 w-5 border-2';
      case 'md':
        return 'h-8 w-8 border-3';
      case 'lg':
        return 'h-12 w-12 border-4';
      default:
        return 'h-8 w-8 border-3';
    }
  };

  return (
    <div
      className={twMerge(
        'inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] text-primary-600 dark:text-primary-500',
        getSizeClass(),
        className
      )}
      role="status"
    >
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  );
};

export default LoadingSpinner;