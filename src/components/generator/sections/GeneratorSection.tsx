/**
 * Generator Section Component
 * Reusable section wrapper for generator forms
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GeneratorSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export const GeneratorSection: React.FC<GeneratorSectionProps> = ({
  title,
  description,
  children,
  className,
  headerAction,
}) => {
  if (!title) {
    return (
      <div className={cn('space-y-4', className)}>
        {children}
      </div>
    );
  }

  return (
    <Card className={cn('border-none shadow-none bg-transparent', className)}>
      {(title || headerAction) && (
        <CardHeader className="px-0 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1">
              {title && <CardTitle className="text-base">{title}</CardTitle>}
              {description && (
                <CardDescription className="text-xs">
                  {description}
                </CardDescription>
              )}
            </div>
            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className="px-0 space-y-4">
        {children}
      </CardContent>
    </Card>
  );
};
