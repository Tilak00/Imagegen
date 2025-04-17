'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react'; // Import useState
import { useDispatch, useSelector } from '@/lib/state/store'; 
import type { RootState } from '@/lib/state/store'; 
import { signOut } from '@/lib/state/slices/authSlice'; 

// --- Icons ---
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function MainNavBar() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const router = useRouter();
  const { user: currentUser } = useSelector((state: RootState) => state.auth); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile menu

  // Hide nav only on login/signup pages
  if (pathname === '/login' || pathname === '/signup') {
      return null;
  }

  const handleSignOut = () => {
    dispatch(signOut());
    setIsMobileMenuOpen(false); // Close menu on sign out
    router.push('/login'); 
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/generate", label: "Generate" },
    { href: "/gallery", label: "Gallery" },
    { href: "/subscription", label: "Subscription" },
    { href: "/profile", label: "Profile" },
  ];

  // Updated linkClasses to use dark: prefixes directly
  const linkClasses = (href: string) =>
    `font-medium transition-colors duration-200 ease-in-out px-3 py-2 rounded-md text-sm ${
      pathname === href
        ? 'bg-indigo-100 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400' // Active state
        : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-indigo-400' // Default state
    }`;
  
  // Updated mobileLinkClasses to use dark: prefixes directly
  const mobileLinkClasses = (href: string) =>
    `block px-4 py-3 rounded-md text-base font-medium transition-colors duration-200 ease-in-out ${
      pathname === href
        ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-indigo-300' // Active state
        : 'text-gray-700 hover:bg-gray-100 hover:text-indigo-700 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white' // Default state
    }`;

  return (
    <nav className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50"> {/* Made sticky */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Increased max-width */}
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                Ghiblify.ai
            </Link>
          </div>

          {/* Center: Desktop Navigation Links */}
          <div className="hidden md:flex md:justify-center md:flex-grow">
             <div className="flex items-baseline space-x-4">
                {currentUser && navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
                    {link.label}
                  </Link>
                ))}
             </div>
          </div>

          {/* Right: Auth Button & Mobile Menu Button */}
          <div className="flex items-center">
             <div className="hidden md:block flex-shrink-0"> {/* Hide auth button on mobile if menu is used */}
                {currentUser ? (
                  <button
                    onClick={handleSignOut}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors duration-200"
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link href="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors duration-200">
                    Sign In
                  </Link>
                )}
             </div>
             {/* Mobile Menu Button */}
             {currentUser && ( // Only show mobile menu toggle if logged in
                <div className="ml-4 md:hidden">
                   <button
                     onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                     className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500" // Adjusted colors/focus
                     aria-controls="mobile-menu"
                     aria-expanded={isMobileMenuOpen}
                   >
                     <span className="sr-only">Open main menu</span>
                     {isMobileMenuOpen ? (
                       <CloseIcon className="block h-6 w-6" aria-hidden="true" />
                     ) : (
                       <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                     )}
                   </button>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {currentUser && isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className={mobileLinkClasses(link.href)}
                onClick={() => setIsMobileMenuOpen(false)} // Close menu on link click
              >
                {link.label}
              </Link>
            ))}
             {/* Sign Out Button in Mobile Menu */}
             <button
                onClick={handleSignOut}
                className={`${mobileLinkClasses('/')} w-full text-left text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30`} // Adjusted hover bg
             >
                Sign Out
             </button>
          </div>
        </div>
      )}
    </nav>
  );
}