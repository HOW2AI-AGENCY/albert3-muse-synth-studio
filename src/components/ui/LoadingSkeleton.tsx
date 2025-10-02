import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'track-item' | 'player';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-gray-300 dark:bg-gray-700';
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'rectangular':
        return 'rounded-md';
      case 'circular':
        return 'rounded-full';
      case 'track-item':
        return 'h-16 rounded-lg';
      case 'player':
        return 'h-20 rounded-xl';
      default:
        return 'h-4 rounded';
    }
  };

  const style = {
    width: width || (variant === 'circular' ? height : '100%'),
    height: height || undefined
  };

  if (variant === 'track-item') {
    return (
      <div className={`${baseClasses} ${getVariantClasses()} ${className} flex items-center p-4 space-x-4`} style={style}>
        <div className="w-12 h-12 bg-gray-400 dark:bg-gray-600 rounded-md flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-3 bg-gray-400 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
        <div className="w-8 h-8 bg-gray-400 dark:bg-gray-600 rounded-full flex-shrink-0"></div>
      </div>
    );
  }

  if (variant === 'player') {
    return (
      <div className={`${baseClasses} ${getVariantClasses()} ${className} flex items-center p-4 space-x-4`} style={style}>
        <div className="w-16 h-16 bg-gray-400 dark:bg-gray-600 rounded-lg flex-shrink-0"></div>
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-400 dark:bg-gray-600 rounded w-2/3"></div>
          <div className="h-3 bg-gray-400 dark:bg-gray-600 rounded w-1/2"></div>
          <div className="h-2 bg-gray-400 dark:bg-gray-600 rounded w-full"></div>
        </div>
        <div className="flex space-x-2">
          <div className="w-10 h-10 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
          <div className="w-12 h-12 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
          <div className="w-10 h-10 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : style.width
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={style}
    />
  );
};

export default LoadingSkeleton;