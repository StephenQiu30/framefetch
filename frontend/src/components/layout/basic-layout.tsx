'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { NavigationHistoryProvider } from '@/components/layout/navigation-history';
import SiteFooter from '@/components/layout/site-footer';
import SiteHeader from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/i18n-provider';

export function BasicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const t = useT();

  return (
    <NavigationHistoryProvider currentPath={pathname}>
      <div
        className="flex min-h-svh flex-col bg-background text-foreground"
        data-slot="basic-layout"
      >
        <Button
          asChild
          className="fixed left-4 top-0 z-50 -translate-y-full focus-visible:top-3 focus-visible:translate-y-0"
          size="lg"
        >
          <a href="#main-content">{t('chrome.skipToContent')}</a>
        </Button>
        <SiteHeader />
        <main
          className="content-shell flex flex-1 flex-col"
          data-slot="basic-layout-main"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
        <SiteFooter />
      </div>
    </NavigationHistoryProvider>
  );
}
