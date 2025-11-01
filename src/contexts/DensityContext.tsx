/**
 * Density Context - Управление режимом UI плотности
 * @module DensityContext
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type DensityMode = 'compact' | 'comfortable';

interface DensityContextType {
  density: DensityMode;
  setDensity: (mode: DensityMode) => void;
  toggleDensity: () => void;
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

const DENSITY_STORAGE_KEY = 'ui-density-mode';

export const DensityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [density, setDensityState] = useState<DensityMode>(() => {
    const stored = localStorage.getItem(DENSITY_STORAGE_KEY);
    return (stored === 'compact' || stored === 'comfortable') ? stored : 'comfortable';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  const setDensity = (mode: DensityMode) => {
    setDensityState(mode);
  };

  const toggleDensity = () => {
    setDensityState(prev => prev === 'compact' ? 'comfortable' : 'compact');
  };

  return (
    <DensityContext.Provider value={{ density, setDensity, toggleDensity }}>
      {children}
    </DensityContext.Provider>
  );
};

export const useDensity = (): DensityContextType => {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error('useDensity must be used within DensityProvider');
  }
  return context;
};
