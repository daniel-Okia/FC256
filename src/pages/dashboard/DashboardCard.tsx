import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Card from '../../components/ui/Card';

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  link?: {
    text: string;
    to: string;
  };
  className?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  link,
  className,
}) => {
  return (
    <Card
      className={twMerge('hover:shadow-card-hover transition-all duration-300', className)}
      hover
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
          {trend && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center text-sm font-medium ${
                  trend.isPositive
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-error-600 dark:text-error-400'
                }`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                vs last month
              </span>
            </div>
          )}
          {link && (
            <Link
              to={link.to}
              className="mt-4 inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              {link.text}
              <ArrowRight size={16} className="ml-1" />
            </Link>
          )}
        </div>
        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default DashboardCard;