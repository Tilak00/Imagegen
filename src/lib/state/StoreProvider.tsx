// src/lib/state/StoreProvider.tsx
'use client'; // This component needs to be a Client Component

import { Provider } from 'react-redux';
import { store } from './store'; // Import the configured store (removed .ts)
import React from 'react';

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[StoreProvider] Rendering...'); // ADD LOG
  return <Provider store={store}>{children}</Provider>;
}