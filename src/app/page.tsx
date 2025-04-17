// src/app/page.tsx
import React from 'react'; // Add React import
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    // Using a responsive theme that works in both light and dark modes
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-gray-800 dark:bg-gradient-to-b dark:from-gray-900 dark:to-black dark:text-white transition-colors duration-300">
      {/* Header removed as requested, relying on MainNavBar */}
      {/* Header removed, will rely on MainNavBar when logged in */}

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fadeIn">
          Create Beautiful AI Images in the style of Studio Ghibli
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto animate-fadeIn delay-200">
          Convert your photos into beautiful Studio Ghibli style images without a ChatGPT Plus Subscription. No Rate Limits
        </p>
        {/* Placeholder for user avatars */}
        <div className="flex justify-center items-center space-x-2 mb-8 animate-fadeIn delay-300">
          <span className="text-sm text-gray-500 animate-pulse-custom">125+ people are already using Ghiblify</span>
        </div>
        <Link href="/generate" className="btn-modern bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-8 rounded-lg text-lg inline-flex items-center shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 animate-fadeIn delay-400">
          Convert Now <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>

        {/* Placeholder for example images */}
        <div className="mt-16 md:mt-24 animate-slideUp delay-500">
          {/* Add example image grid or carousel here */}
          <p className="text-gray-500 italic">(Example images would go here)</p>
        </div>

        {/* Feature Section */}
        <section className="mt-16 md:mt-24">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-slideUp">
            Studio Ghibli AI Art Generator
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto animate-slideUp delay-200">
            Transform your photos into Studio Ghibli style images.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="card-modern p-6 animate-slideInLeft delay-300 hover-lift">
              <div className="text-indigo-600 dark:text-indigo-400 text-4xl mb-4">✨</div>
              <h3 className="text-xl font-bold mb-2">Magical Transformations</h3>
              <p className="text-gray-600 dark:text-gray-400">Turn ordinary photos into magical Ghibli-inspired artwork with a single click.</p>
            </div>

            <div className="card-modern p-6 animate-scaleUp delay-400 hover-lift">
              <div className="text-indigo-600 dark:text-indigo-400 text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-bold mb-2">Authentic Style</h3>
              <p className="text-gray-600 dark:text-gray-400">Our AI captures the unique aesthetic that makes Studio Ghibli films so beloved.</p>
            </div>

            <div className="card-modern p-6 animate-slideInRight delay-500 hover-lift">
              <div className="text-indigo-600 dark:text-indigo-400 text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">Fast & Unlimited</h3>
              <p className="text-gray-600 dark:text-gray-400">Generate as many images as you want with no rate limits or subscription required.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Enhanced */}
      <footer className="text-center py-12 bg-gradient-to-t from-blue-50 to-transparent dark:from-gray-900 dark:to-transparent">
        <div className="container mx-auto px-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Ghiblify.ai</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Bringing Ghibli magic to your photos</p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              © {new Date().getFullYear()} Ghiblify.ai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
