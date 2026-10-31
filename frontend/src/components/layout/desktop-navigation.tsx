import { ArrowUpRightIcon, GithubLogoIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { useT } from '@/lib/i18n/i18n-provider';
import { siteConfig } from '@/lib/site';

type DesktopNavigationProps = {
  documentsActive: boolean;
  historyActive: boolean;
  homeActive: boolean;
  providersActive: boolean;
  publicView: boolean;
};

export function DesktopNavigation({
  documentsActive,
  historyActive,
  homeActive,
  providersActive,
  publicView,
}: DesktopNavigationProps) {
  const t = useT();
  return (
    <NavigationMenu
      aria-label={t('chrome.primaryNav')}
      className="hidden max-w-none flex-none lg:flex"
      viewport={false}
    >
      <NavigationMenuList className="gap-1">
        {publicView ? (
          <>
            <NavigationLink href="/#capabilities">
              {t('chrome.productCapabilities')}
            </NavigationLink>
            <NavigationLink href="/#architecture">
              {t('chrome.selfHostedArchitecture')}
            </NavigationLink>
            <NavigationLink href={siteConfig.repositoryUrl}>
              <GithubLogoIcon aria-hidden />
              GitHub
              <ArrowUpRightIcon aria-hidden />
            </NavigationLink>
          </>
        ) : (
          <>
            <NavigationLink active={homeActive} href="/">
              {t('chrome.home')}
            </NavigationLink>
            <NavigationLink active={historyActive} href="/history">
              {t('chrome.history')}
            </NavigationLink>
            <NavigationLink active={documentsActive} href="/documents">
              {t('chrome.documents')}
            </NavigationLink>
            <NavigationLink active={providersActive} href="/providers">
              {t('chrome.providers')}
            </NavigationLink>
          </>
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function NavigationLink({
  active = false,
  children,
  href,
}: {
  active?: boolean;
  children: ReactNode;
  href: string;
}) {
  const external = href.startsWith('https://');

  return (
    <NavigationMenuItem>
      <NavigationMenuLink
        active={active}
        asChild
        className={navigationMenuTriggerStyle()}
      >
        <Link
          aria-current={active ? 'page' : undefined}
          href={href}
          rel={external ? 'noreferrer' : undefined}
          target={external ? '_blank' : undefined}
        >
          {children}
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}
