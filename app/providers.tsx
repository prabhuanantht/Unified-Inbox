'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0, // Default to always stale for messages (can be overridden per query)
        gcTime: 10 * 60 * 1000, // 10 minutes (cacheTime renamed to gcTime in v5)
        refetchOnWindowFocus: true, // Refetch when window regains focus
        refetchOnMount: true, // Refetch when component mounts
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
