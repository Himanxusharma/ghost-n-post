"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthSync } from "@/components/auth-sync";
import { ToastProvider } from "@/components/toast";
import { clerkAppearance } from "@/lib/auth/clerk-appearance";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
    >
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthSync />
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
