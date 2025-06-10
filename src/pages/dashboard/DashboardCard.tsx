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
  link,
  className,
}) => {
  return (
    <Card
      className={twMerge(
        'hover:shadow-card-hover transition-all duration-300 border border-yellow-100 dark:border-yellow-900/20 hover:border-yellow-200 dark:hover:border-yellow-800/30', 
        className
      )}
      hover
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
          {link && (
            <Link
              to={link.to}
              className="mt-4 inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
            >
              {link.text}
              <ArrowRight size={16} className="ml-1" />
            </Link>
          )}
        </div>
        <div className="p-3 bg-gradient-to-br from-primary-100 via-yellow-50 to-secondary-100 dark:from-primary-900/30 dark:via-yellow-900/20 dark:to-secondary-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default DashboardCard;