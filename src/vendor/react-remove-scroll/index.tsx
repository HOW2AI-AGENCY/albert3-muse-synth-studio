import React, { useEffect } from 'react';

export const RemoveScroll: React.FC<{ children?: React.ReactNode } & Record<string, unknown>> = ({ children }) => {
  return <>{children}</>;
};

export const RemoveScrollBar: React.FC<{ children?: React.ReactNode } & Record<string, unknown>> = ({ children }) => {
  return <>{children}</>;
};

export function useRemoveScroll(): void {
  useEffect(() => {}, []);
}

export default RemoveScroll;