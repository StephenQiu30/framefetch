'use client';

import { useEffect, useState } from 'react';

import { RouteErrorView } from '@/components/layout/route-error-view';
import {
  defaultLocale,
  type Locale,
  localeCookieName,
  resolveLocale,
} from '@/lib/i18n/locale';
import { provideLocale } from '@/lib/i18n/locale-state';

function localeFromCookie(): Locale {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${localeCookieName}=([^;]*)`),
  );
  return (
    resolveLocale(match?.[1] ? decodeURIComponent(match[1]) : null) ??
    defaultLocale
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    console.error(error);
    const next = localeFromCookie();
    provideLocale(next);
    setLocale(next);
  }, [error]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body data-design="borderless">
        <main className="flex min-h-svh flex-col bg-background px-6 text-foreground sm:px-10">
          <RouteErrorView error={error} reset={reset} />
        </main>
      </body>
    </html>
  );
}
