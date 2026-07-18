/**
 * Theme Provider Component
 * 
 * Manages theme state and Cinema Mode toggle
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { brandThemes, type BrandTheme } from '@/lib/theme-tokens';

interface ThemeContextType {
  cinemaMode: boolean;
  toggleCinemaMode: () => void;
  brandTheme: string;
  setBrandTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultBrandTheme?: string;
}

export function ThemeProvider({ children, defaultBrandTheme = 'default' }: ThemeProviderProps) {
  const [cinemaMode, setCinemaMode] = useState(false);
  const [brandTheme, setBrandTheme] = useState(defaultBrandTheme);

  // Apply cinema mode class to body
  useEffect(() => {
    if (cinemaMode) {
      document.documentElement.classList.add('cinema-mode');
    } else {
      document.documentElement.classList.remove('cinema-mode');
    }
  }, [cinemaMode]);

  // Apply brand theme CSS variables
  useEffect(() => {
    const theme = brandThemes[brandTheme] || brandThemes.default;
    const root = document.documentElement;

    // Update CSS variables
    root.style.setProperty('--primary', theme.colors.primary);
    root.style.setProperty('--secondary', theme.colors.secondary);
    root.style.setProperty('--accent', theme.colors.accent);
  }, [brandTheme]);

  const toggleCinemaMode = () => {
    setCinemaMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        cinemaMode,
        toggleCinemaMode,
        brandTheme,
        setBrandTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

