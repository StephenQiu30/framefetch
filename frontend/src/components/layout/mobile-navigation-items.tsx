import {
  BookOpenIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  DesktopTowerIcon,
  FileTextIcon,
  GithubLogoIcon,
  HardDrivesIcon,
  HouseIcon,
  InfoIcon,
  ListBulletsIcon,
  PulseIcon,
  RobotIcon,
  StackIcon,
  UserCircleIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import { type ReactNode, useId } from 'react';

import { MobileNavigationLink as MobileLink } from '@/components/layout/mobile-navigation-link';
import { NavigationMenuList } from '@/components/ui/navigation-menu';
import { useT } from '@/lib/i18n/i18n-provider';
import { siteConfig } from '@/lib/site';

export function MobileNavigationItems({
  pathname,
  user,
}: {
  pathname: string;
  user?: API.UserResponse;
}) {
  const t = useT();
  return (
    <div className="grid gap-6 px-4 pb-4">
      <MobileNavigationSection title={t('chrome.workspace')}>
        <MobileLink active={pathname === '/'} href="/">
          <HouseIcon aria-hidden />
          {t('chrome.home')}
        </MobileLink>
        <MobileLink active={pathname === '/history'} href="/history">
          <ClockCounterClockwiseIcon aria-hidden />
          {t('chrome.history')}
        </MobileLink>
        <MobileLink
          active={pathname.startsWith('/documents')}
          href="/documents"
        >
          <FileTextIcon aria-hidden />
          {t('chrome.documents')}
        </MobileLink>
        <MobileLink
          active={pathname.startsWith('/providers')}
          href="/providers"
        >
          <PulseIcon aria-hidden />
          {t('chrome.providers')}
        </MobileLink>
        {user ? (
          <>
            <MobileLink
              active={pathname.startsWith('/history/activity')}
              href="/history/activity"
            >
              <ListBulletsIcon aria-hidden />
              {t('chrome.activity')}
            </MobileLink>
            <MobileLink
              active={pathname.startsWith('/account')}
              href="/account"
            >
              <UserCircleIcon aria-hidden />
              {t('chrome.account')}
            </MobileLink>
          </>
        ) : (
          <>
            <MobileLink
              href={`/user/login?redirect=${encodeURIComponent(pathname)}`}
            >
              <UserCircleIcon aria-hidden />
              {t('chrome.loginAccount')}
            </MobileLink>
            <MobileLink href="/user/register">
              <UserPlusIcon aria-hidden />
              {t('chrome.registerAccount')}
            </MobileLink>
          </>
        )}
      </MobileNavigationSection>
      {user?.role === 'admin' ? (
        <MobileNavigationSection title={t('chrome.admin')}>
          <MobileLink
            active={pathname.startsWith('/admin/operation-logs')}
            href="/admin/operation-logs"
          >
            <ListBulletsIcon aria-hidden />
            {t('chrome.operationLogs')}
          </MobileLink>
          <MobileLink
            active={pathname.startsWith('/admin/ai-providers')}
            href="/admin/ai-providers"
          >
            <RobotIcon aria-hidden />
            {t('chrome.aiProviders')}
          </MobileLink>
          <MobileLink
            active={pathname.startsWith('/admin/analytics')}
            href="/admin/analytics"
          >
            <ChartLineUpIcon aria-hidden />
            {t('chrome.analytics')}
          </MobileLink>
          <MobileLink
            active={pathname.startsWith('/admin/files')}
            href="/admin/files"
          >
            <HardDrivesIcon aria-hidden />
            {t('chrome.files')}
          </MobileLink>
          <MobileLink
            active={pathname.startsWith('/admin/providers')}
            href="/admin/providers"
          >
            <StackIcon aria-hidden />
            {t('chrome.catalog')}
          </MobileLink>
          <MobileLink
            active={pathname.startsWith('/admin/users')}
            href="/admin/users"
          >
            <UsersThreeIcon aria-hidden />
            {t('chrome.users')}
          </MobileLink>
        </MobileNavigationSection>
      ) : null}
      <MobileNavigationSection title={t('chrome.resources')}>
        <MobileLink active={pathname.startsWith('/guide')} href="/guide/">
          <BookOpenIcon aria-hidden />
          {t('chrome.guide')}
        </MobileLink>
        <MobileLink
          active={pathname.startsWith('/self-hosting')}
          href="/self-hosting/"
        >
          <DesktopTowerIcon aria-hidden />
          {t('chrome.selfHosting')}
        </MobileLink>
        <MobileLink active={pathname.startsWith('/about')} href="/about/">
          <InfoIcon aria-hidden />
          {t('chrome.about')}
        </MobileLink>
        <MobileLink href={siteConfig.repositoryUrl}>
          <GithubLogoIcon aria-hidden />
          GitHub
        </MobileLink>
        <MobileLink href={siteConfig.documentationUrl}>
          <FileTextIcon aria-hidden />
          {t('chrome.docs')}
        </MobileLink>
      </MobileNavigationSection>
    </div>
  );
}

function MobileNavigationSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="grid gap-2">
      <h3 className="text-xs font-medium text-muted-foreground" id={titleId}>
        {title}
      </h3>
      <NavigationMenuList className="grid w-full flex-none justify-stretch gap-1">
        {children}
      </NavigationMenuList>
    </section>
  );
}
