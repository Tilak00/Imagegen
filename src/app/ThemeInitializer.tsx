'use client';

import { useEffect } from 'react';
import { useSelector, useDispatch } from '@/lib/state/store';
import { setThemeMode, initializeTheme } from '@/lib/state/slices/uiSlice';
import type { RootState } from '@/lib/state/store';

// This component ensures the theme is properly initialized and applied
export default function ThemeInitializer() {
  const dispatch = useDispatch();
  const { themeMode, resolvedTheme } = useSelector((state: RootState) => state.ui);

  // Apply theme on mount
  useEffect(() => {
    // Initialize theme first
    initializeTheme();

    // Then force a re-application of the theme
    dispatch(setThemeMode(themeMode));

    // Set up listener for system theme changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        if (themeMode === 'system') {
          // Re-apply theme based on new system preference
          dispatch(setThemeMode('system'));
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [dispatch, themeMode]);

  return null; // This component doesn't render anything
}
