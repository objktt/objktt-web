import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const readTheme = (): Theme => {
  if (typeof document === 'undefined') return 'light';
  return (document.documentElement.dataset.theme as Theme) === 'dark' ? 'dark' : 'light';
};

/**
 * Reads the current theme from `<html data-theme="...">` and re-renders
 * whenever it changes (Layout toggles this attribute on the html element).
 */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
