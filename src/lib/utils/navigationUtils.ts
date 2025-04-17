// src/lib/utils/navigationUtils.ts

/**
 * Saves the current URL path to localStorage
 * @param path The current URL path
 */
export const saveCurrentPath = (path: string): void => {
  if (typeof window !== 'undefined') {
    // Don't save login or signup pages
    if (path !== '/login' && path !== '/signup') {
      localStorage.setItem('ghibliLastPath', path);
    }
  }
};

/**
 * Gets the last saved URL path from localStorage
 * @returns The last saved URL path or '/' if none exists
 */
export const getLastPath = (): string => {
  if (typeof window !== 'undefined') {
    const lastPath = localStorage.getItem('ghibliLastPath');
    return lastPath || '/';
  }
  return '/';
};

/**
 * Determines if a path is a protected path that requires authentication
 * @param path The path to check
 * @returns True if the path is protected, false otherwise
 */
export const isProtectedPath = (path: string): boolean => {
  const protectedPaths = ['/generate', '/profile', '/gallery'];
  return protectedPaths.some(protectedPath => path === protectedPath || path.startsWith(`${protectedPath}/`));
};
