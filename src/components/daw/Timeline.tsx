import React from 'react';

export const Timeline: React.FC = () => {
  return (
    <div className="relative h-12 bg-surface border-b border-border">
      {/* Ruler */}
      <div className="absolute top-0 left-0 w-full h-full flex items-end">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="h-4 border-l border-muted-foreground"
            style={{ width: '60px' }}
          >
            <span className="text-xs text-muted-foreground pl-1">{i}s</span>
          </div>
        ))}
      </div>
    </div>
  );
};
