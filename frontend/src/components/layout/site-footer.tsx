'use client';

import { cn } from 'cn';
import Link from 'next/link';
import { type ReactNode, useSyncExternalStore } from 'react';
import { buttonVariants } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { useT } from '@/lib/i18n/i18n-provider';
import { siteConfig } from '@/lib/site';

function desktopViewport() {
  const breakpoint = getComputedStyle(document.documentElement)
    .getPropertyValue('--breakpoint-lg')
    .trim();
  return breakpoint && typeof window.matchMedia === 'function'
    ? window.matchMedia(`(min-width: ${breakpoint})`)
    : null;
}

function subscribeToDesktopViewport(onChange: () => void) {
  const media = desktopViewport();
  if (!media) return () => undefined;
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function isDesktopViewport() {
  return desktopViewport()?.matches ?? false;
}

function SiteFooter({ className }: { className?: string }) {
  const t = useT();
  const showFooterActions = useSyncExternalStore(
    subscribeToDesktopViewport,
    isDesktopViewport,
    () => false,
  );

  return (
    <footer className={cn('shrink-0 bg-background', className)}>
      <div className="content-shell flex min-h-16 flex-wrap items-center justify-between gap-x-8 gap-y-3 py-5 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link className="focus-ring font-medium text-foreground" href="/">
            {t('chrome.footerBrand')}
          </Link>
          <span>
            <Link className="focus-ring" href={siteConfig.licenseUrl}>
              {t('chrome.license')}
            </Link>{' '}
            · {t('chrome.authorizedOnly')}
          </span>
        </div>
        {showFooterActions ? (
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <NavigationMenu
              aria-label={t('chrome.projectLinks')}
              className="min-w-0 max-w-none"
              viewport={false}
            >
              <NavigationMenuList className="flex-wrap justify-start gap-x-4 gap-y-2">
                <FooterLink href="/guide/">{t('chrome.guide')}</FooterLink>
                <FooterLink href="/self-hosting/">
                  {t('chrome.selfHosting')}
                </FooterLink>
                <FooterLink href="/about/">{t('chrome.about')}</FooterLink>
                <FooterLink href={siteConfig.repositoryUrl}>GitHub</FooterLink>
                <FooterLink href={siteConfig.documentationUrl}>
                  {t('chrome.docs')}
                </FooterLink>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        ) : null}
      </div>
    </footer>
  );
}

function FooterLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <NavigationMenuItem>
      <NavigationMenuLink
        asChild
        className={buttonVariants({ variant: 'ghost' })}
      >
        <Link href={href}>{children}</Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

export default SiteFooter;
