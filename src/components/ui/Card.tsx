import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  footer?: React.ReactNode;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
  footer,
  hover = false,
}) => {
  return (
    <div
      className={twMerge(
        'bg-white dark:bg-neutral-800 rounded-lg shadow overflow-hidden transition-all w-full',
        hover && 'hover:shadow-card-hover transform hover:-translate-y-1',
        className
      )}
    >
      {(title || subtitle) && (
        <div
          className={twMerge(
            'px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700',
            headerClassName
          )}
        >
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-words">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className={twMerge('p-4 sm:p-6 w-full overflow-hidden', bodyClassName)}>
        {children}
      </div>
      {footer && (
        <div
          className={twMerge(
            'px-4 sm:px-6 py-4 bg-gray-50 dark:bg-neutral-700 border-t border-gray-200 dark:border-gray-700',
            footerClassName
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;