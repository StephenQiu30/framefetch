import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/auth-provider';
import { IntakeDraftProvider } from '@/components/intake/intake-draft-provider';
import { BasicLayout } from '@/components/layout/basic-layout';
import { QueryProvider } from '@/components/layout/query-provider';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider } from '@/lib/i18n/i18n-provider';
import { provideLocale } from '@/lib/i18n/locale-state';
import { readLocale } from '@/lib/i18n/server-locale';
import { readServerSession } from '@/lib/server-session';
import { siteConfig, siteUrl } from '@/lib/site';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readLocale();
  const english = locale === 'en-US';
  return {
    metadataBase: siteUrl,
    title: {
      default: english
        ? 'Framefetch — self-hosted video parsing and AI analysis'
        : siteConfig.title,
      template: english ? '%s · Framefetch' : '%s · 帧取',
    },
    icons: {
      icon: [{ url: '/logo.svg', type: 'image/svg+xml' }],
      apple: [{ url: '/logo.png', sizes: '1024x1024', type: 'image/png' }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: english ? 'Framefetch' : siteConfig.shortName,
    },
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await readLocale();
  provideLocale(locale);
  const initialUser = await readServerSession();
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable}`}
      lang={locale}
      suppressHydrationWarning
    >
      <body data-design="borderless">
        <I18nProvider locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange
            enableSystem={false}
            storageKey="framegrab-theme"
            themes={['light', 'dark']}
          >
            <AuthProvider initialUser={initialUser}>
              <QueryProvider>
                <IntakeDraftProvider>
                  <TooltipProvider delayDuration={300}>
                    <BasicLayout>{children}</BasicLayout>
                  </TooltipProvider>
                  <Toaster
                    mobileOffset={{ top: 72 }}
                    offset={{ top: 80 }}
                    position="top-center"
                  />
                </IntakeDraftProvider>
              </QueryProvider>
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
