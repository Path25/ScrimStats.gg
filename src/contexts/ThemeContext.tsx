
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  accentColor: string;
  setAccentColorState: (color: string) => void; // Renamed to avoid conflict
}

const DEFAULT_ACCENT_COLOR = '#2563EB'; // Default if nothing is stored

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      return storedTheme;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [accentColor, setAccentColorInternal] = useState<string>(() => {
    return localStorage.getItem('accentColor') || DEFAULT_ACCENT_COLOR;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--primary-hsl', hexToHsl(accentColor)); // Assuming --primary is defined with HSL
    // Or directly if your CSS uses hex for --primary (which it seems to for shadcn)
    // We need to make sure index.css's --primary and related vars are set up to use HSL components
    // For now, let's assume we are setting the HSL components for --primary directly
    // E.g. --primary: hsl(var(--primary-h) var(--primary-s) var(--primary-l));
    // Let's directly update the --primary variable for now as it's simpler and likely what index.css uses.
    // Check index.css: --primary: 240 5.9% 10%; (this is HSL)
    // So we need to convert hex to HSL string like "240 5.9% 10%"
    
    const primaryHslValue = convertHexToHslCssValue(accentColor);
    if (primaryHslValue) {
      root.style.setProperty('--primary', primaryHslValue);
      // If your index.css also defines --primary-foreground based on --primary,
      // you might need to adjust that too, or ensure --primary-foreground is generic.
      // For now, we'll just update --primary.
      // Shadcn typically defines --primary-foreground separately.
    }
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const setAccentColorState = (color: string) => {
    setAccentColorInternal(color);
  };

  // Helper function to convert HEX to HSL string for CSS
  // This is a simplified version. Robust conversion might be needed.
  function convertHexToHslCssValue(hex: string): string | null {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    } else {
      return null; // Invalid hex
    }

    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    // Return as CSS HSL string components (without "hsl()")
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }
  // Dummy hexToHsl function if not using the above, or if it causes issues
  // Replace with a proper library or more robust implementation if needed.
  const hexToHsl = (hex: string) => hex; // Placeholder


  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, setAccentColorState }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

