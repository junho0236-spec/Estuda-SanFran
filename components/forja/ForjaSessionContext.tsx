import React, { createContext, useContext, type ReactNode } from 'react';

export type ForjaSessionValue = {
  userId: string;
  email: string | null;
  displayName: string | null;
  onLeaveForja: () => void;
};

const ForjaSessionContext = createContext<ForjaSessionValue | null>(null);

export function ForjaSessionProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ForjaSessionValue;
}) {
  return <ForjaSessionContext.Provider value={value}>{children}</ForjaSessionContext.Provider>;
}

export function useForjaSession() {
  const ctx = useContext(ForjaSessionContext);
  if (!ctx) throw new Error('useForjaSession must be used inside ForjaSessionProvider');
  return ctx;
}
