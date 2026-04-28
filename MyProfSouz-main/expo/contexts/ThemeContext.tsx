import React, { createContext, useContext } from 'react';
import Colors from '@/constants/colors';

interface ThemeContextType {
  theme: 'light';
  toggleTheme: () => void;
  colors: typeof Colors;
  themeKey: number;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  colors: Colors,
  themeKey: 0,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {}, colors: Colors, themeKey: 0 }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
