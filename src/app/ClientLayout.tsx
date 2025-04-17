// src/app/ClientLayout.tsx
'use client';

import React, { useEffect } from 'react';
import { useSelector } from '@/lib/state/store';
import type { RootState } from '@/lib/state/store';
// Removed unnecessary import of useTheme from next-themes
import { usePathname } from 'next/navigation'; // Only need pathname for logging
import StoreProvider from '../lib/state/StoreProvider'; // Relative path, no .tsx
import AuthListener from './AuthListener'; // no .tsx
import ThemeInitializer from './ThemeInitializer'; // Import ThemeInitializer
import MainNavBar from './MainNavBar'; // Import the NavBar, no .tsx
// Internal component to access Redux context and handle routing logic
function LayoutContent({ children }: { children: React.ReactNode }) {
  console.log('[LayoutContent] Rendering...'); // ADD LOG: Start of component
  // Get auth loading status
  const { isLoading: isAuthLoading } = useSelector((state: RootState) => state.auth);
  // Removed themeMode selector and useEffect for applying dark class
  console.log('[LayoutContent] useSelector completed. isAuthLoading:', isAuthLoading); // ADD LOG: After useSelector
  const pathname = usePathname();

  // Log the current path and auth state for debugging
  useEffect(() => {
    console.log('[LayoutContent] Current path:', pathname, 'Auth loading:', isAuthLoading);
  }, [pathname, isAuthLoading]);

  // Show loading indicator while checking auth state
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        {/* You can replace this with a more sophisticated loading component */}
        <div className="w-10 h-10 border-4 border-gray-300 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render layout once auth state is loaded
  return (
    <div className="flex flex-col min-h-screen">
      {/* AuthListener is moved outside the loading check, but still needs Provider */}
      {/* It will be rendered by the main ClientLayout component now */}
      <MainNavBar />
      {/* Removed explicit bg-black, will be handled by body styles in globals.css */}
      {/* Apply background and foreground colors using mapped theme variables */}
      {/* Restore explicit bg-black */}
      {/* Ensure explicit bg-black is used as before */}
      <div className="flex-grow bg-white dark:bg-black text-gray-800 dark:text-white">{children}</div>
    </div>
  );
}

// Main layout component wraps everything in the StoreProvider
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // AuthListener needs to be within the Provider, but should always be mounted
  // to listen for auth changes and update the loading state.
  return (
    <StoreProvider>
      <AuthListener /> {/* Mount AuthListener unconditionally */}
      <ThemeInitializer /> {/* Initialize theme */}
      <LayoutContent>{children}</LayoutContent> {/* LayoutContent handles loading UI */}
    </StoreProvider>
  );
}