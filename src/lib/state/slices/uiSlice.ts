import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  themeMode: ThemeMode;
  // Resolved theme takes into account 'system' preference
  resolvedTheme: 'light' | 'dark';
}

// Function to get system theme preference using web APIs
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light'; // Default if window/matchMedia is not available (e.g., SSR)
};

// Function to get persisted theme from localStorage
const getInitialThemeMode = (): ThemeMode => {
  if (typeof window !== 'undefined') {
    const persistedTheme = localStorage.getItem('themeMode') as ThemeMode | null;
    if (persistedTheme && ['light', 'dark', 'system'].includes(persistedTheme)) {
      return persistedTheme;
    }
  }
  return 'light'; // Default to light theme if nothing persisted or not in browser
};

const initialMode = getInitialThemeMode();
const initialResolved = initialMode === 'system' ? getSystemTheme() : initialMode;

const initialState: UIState = {
  themeMode: initialMode,
  resolvedTheme: initialResolved,
};

// Helper to apply theme class to documentElement (for Tailwind)
const applyThemeClass = (theme: 'light' | 'dark') => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }
};

// Function to initialize theme (called from ThemeInitializer component)
export const initializeTheme = () => {
  if (typeof document !== 'undefined') {
    applyThemeClass(initialResolved);
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      const newMode = action.payload;
      state.themeMode = newMode;
      state.resolvedTheme = newMode === 'system' ? getSystemTheme() : newMode;
      // Persist preference
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', newMode);
      }
      // Apply class to HTML tag for Tailwind
      applyThemeClass(state.resolvedTheme);
    },
    // Reducer to re-apply theme based on system change (if mode is 'system')
    // This should be dispatched by a listener setup elsewhere (e.g., Context/Provider)
    syncSystemTheme: (state) => {
        if (state.themeMode === 'system') {
            const currentSystem = getSystemTheme();
            if (state.resolvedTheme !== currentSystem) {
                state.resolvedTheme = currentSystem;
                applyThemeClass(currentSystem);
            }
        }
    }
    // Optional: Toggle action (can be simplified or removed if using explicit buttons)
    // toggleThemeMode: (state) => { ... } // Logic would need adapting for web
  },
});

// Listener for system theme changes (optional but good UX)
// This listener setup is better placed within a React component/provider
// to correctly dispatch actions to the store.
/*
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    // Dispatch syncSystemTheme action
    // store.dispatch(uiSlice.actions.syncSystemTheme()); // Requires access to store instance
  });
}
*/


export const { setThemeMode, syncSystemTheme } = uiSlice.actions;
export default uiSlice.reducer;