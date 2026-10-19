'use client';
import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="toggle-switch">
      <label className="switch-label" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
        <input 
          type="checkbox" 
          className="checkbox" 
          checked={!isDark} 
          onChange={toggleTheme} 
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        />
        <span className="slider"></span>
      </label>
    </div>
  );
}
