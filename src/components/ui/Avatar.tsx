import React from 'react';
import { twMerge } from 'tailwind-merge';
import { User } from 'lucide-react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  className?: string;
  fallback?: React.ReactNode;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  size = 'md',
  className,
  fallback,
}) => {
  const [error, setError] = React.useState(false);

  const handleError = () => {
    setError(true);
  };

  const getSizeClasses = (): string => {
    switch (size) {
      case 'xs':
        return 'h-6 w-6 text-xs';
      case 'sm':
        return 'h-8 w-8 text-sm';
      case 'md':
        return 'h-10 w-10 text-base';
      case 'lg':
        return 'h-12 w-12 text-lg';
      case 'xl':
        return 'h-16 w-16 text-xl';
      default:
        return 'h-10 w-10 text-base';
    }
  };

  return (
    <div
      className={twMerge(
        'relative inline-flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-600 rounded-full',
        getSizeClasses(),
        className
      )}
    >
      {src && !error ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={handleError}
        />
      ) : fallback ? (
        fallback
      ) : (
        <div className="flex items-center justify-center h-full w-full text-gray-400 dark:text-gray-300">
          <User className="h-1/2 w-1/2" />
        </div>
      )}
    </div>
  );
};

export default Avatar;