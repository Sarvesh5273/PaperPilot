'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'paper' | 'espresso';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'paper',
  setTheme: () => {},
  toggleTheme: () => {},
});

const THEME_KEY = 'paperpilot_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY) as Theme | null;
      return saved === 'espresso' || saved === 'paper' ? saved : 'paper';
    }
    return 'paper';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'espresso') {
      root.classList.add('dark');
      root.classList.remove('paper');
    } else {
      root.classList.remove('dark');
      root.classList.add('paper');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'paper' ? 'espresso' : 'paper';
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
