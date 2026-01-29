import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'teal' | 'blue' | 'purple' | 'rose' | 'amber';
type LayoutDensity = 'comfortable' | 'compact' | 'spacious';

interface ThemeContextType {
  theme: Theme;
  accentColor: AccentColor;
  layoutDensity: LayoutDensity;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setLayoutDensity: (density: LayoutDensity) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ACCENT_COLORS: Record<AccentColor, { accent: string; ring: string }> = {
  teal: { accent: '173 58% 39%', ring: '173 58% 39%' },
  blue: { accent: '217 91% 60%', ring: '217 91% 60%' },
  purple: { accent: '262 83% 58%', ring: '262 83% 58%' },
  rose: { accent: '346 77% 50%', ring: '346 77% 50%' },
  amber: { accent: '38 92% 50%', ring: '38 92% 50%' },
};

const DENSITY_CLASSES: Record<LayoutDensity, string> = {
  compact: 'density-compact',
  comfortable: 'density-comfortable',
  spacious: 'density-spacious',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('fixsense-theme');
    return (stored as Theme) || 'system';
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    const stored = localStorage.getItem('fixsense-accent');
    return (stored as AccentColor) || 'teal';
  });

  const [layoutDensity, setLayoutDensityState] = useState<LayoutDensity>(() => {
    const stored = localStorage.getItem('fixsense-density');
    return (stored as LayoutDensity) || 'comfortable';
  });

  // Apply theme class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  // Apply accent color
  useEffect(() => {
    const root = document.documentElement;
    const colors = ACCENT_COLORS[accentColor];
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--sidebar-ring', colors.ring);
  }, [accentColor]);

  // Apply layout density
  useEffect(() => {
    const root = document.documentElement;
    Object.values(DENSITY_CLASSES).forEach((cls) => root.classList.remove(cls));
    root.classList.add(DENSITY_CLASSES[layoutDensity]);
  }, [layoutDensity]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('fixsense-theme', newTheme);
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
    localStorage.setItem('fixsense-accent', color);
  };

  const setLayoutDensity = (density: LayoutDensity) => {
    setLayoutDensityState(density);
    localStorage.setItem('fixsense-density', density);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, accentColor, layoutDensity, setTheme, setAccentColor, setLayoutDensity }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
