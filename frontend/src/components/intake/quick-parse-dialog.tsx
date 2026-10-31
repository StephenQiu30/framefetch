'use client';

import {
  ArrowElbowDownLeftIcon,
  BookOpenIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  CommandIcon,
  FileTextIcon,
  FileVideoIcon,
  HardDrivesIcon,
  HouseIcon,
  InfoIcon,
  LinkSimpleIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  PulseIcon,
  RobotIcon,
  SignInIcon,
  StackIcon,
  UserCircleIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import { usePathname, useRouter } from 'next/navigation';
import {
  type ClipboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import type { IntakeMode } from '@/components/intake/content-intake-hero';
import { useIntakeDraft } from '@/components/intake/intake-draft-provider';
import { hasPublicInput } from '@/components/intake/public-input';
import { markNavigationPush } from '@/components/layout/navigation-state';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { useT } from '@/lib/i18n/i18n-provider';
import type { MessageKey } from '@/lib/i18n/messages';

const publicDestinations = [
  {
    labelKey: 'chrome.home',
    href: '/',
    keywords: '首页 工作区 home workspace',
    icon: HouseIcon,
  },
  {
    labelKey: 'chrome.guide',
    href: '/guide/',
    keywords: '使用指南 帮助 guide help',
    icon: BookOpenIcon,
  },
  {
    labelKey: 'chrome.selfHosting',
    href: '/self-hosting/',
    keywords: '自托管部署 部署 self-hosting deploy',
    icon: HardDrivesIcon,
  },
  {
    labelKey: 'chrome.about',
    href: '/about/',
    keywords: '关于 Framefetch about',
    icon: InfoIcon,
  },
] as const;

const accountDestinations = [
  {
    labelKey: 'chrome.history',
    href: '/history',
    keywords: '下载记录 历史 任务 download history',
    icon: ClockCounterClockwiseIcon,
  },
  {
    labelKey: 'chrome.activity',
    href: '/history/activity',
    keywords: '我的处理记录 解析历史 分析历史 activity',
    icon: ListBulletsIcon,
  },
  {
    labelKey: 'chrome.documents',
    href: '/documents',
    keywords: '剧本文档 文档 screenplay documents',
    icon: FileTextIcon,
  },
  {
    labelKey: 'chrome.providers',
    href: '/providers',
    keywords: '平台状态 来源 provider status',
    icon: PulseIcon,
  },
  {
    labelKey: 'chrome.account',
    href: '/account',
    keywords: '个人资料 账户 profile account',
    icon: UserCircleIcon,
  },
] as const;

const adminDestinations = [
  {
    labelKey: 'chrome.operationLogs',
    href: '/admin/operation-logs',
    keywords: '系统操作日志 管理员 日志 operation logs',
    icon: ListBulletsIcon,
  },
  {
    labelKey: 'chrome.aiProviders',
    href: '/admin/ai-providers',
    keywords: 'AI 服务 管理员 模型 ai providers',
    icon: RobotIcon,
  },
  {
    labelKey: 'chrome.analytics',
    href: '/admin/analytics',
    keywords: '使用统计 管理员 统计 usage analytics',
    icon: ChartLineUpIcon,
  },
  {
    labelKey: 'chrome.files',
    href: '/admin/files',
    keywords: '文件管理 管理员 存储 files storage',
    icon: HardDrivesIcon,
  },
  {
    labelKey: 'chrome.catalog',
    href: '/admin/providers',
    keywords: '平台目录 管理员 平台 provider catalog',
    icon: StackIcon,
  },
  {
    labelKey: 'chrome.users',
    href: '/admin/users',
    keywords: '用户管理 管理员 用户 users',
    icon: UsersThreeIcon,
  },
] as const;

function matchesDestination(
  destination: { href: string; keywords: string; label: string },
  query: string,
) {
  return `${destination.label} ${destination.href} ${destination.keywords}`
    .toLocaleLowerCase()
    .includes(query);
}

function labelDestinations<T extends { labelKey: MessageKey }>(
  destinations: readonly T[],
  t: (key: MessageKey) => string,
) {
  return destinations.map((destination) => ({
    ...destination,
    label: t(destination.labelKey),
  }));
}

export function QuickParseDialog() {
  const t = useT();
  const { user } = useAuth();
  const { input, requestQuickParse, setMode } = useIntakeDraft();
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const query = value.trim().toLocaleLowerCase();
  const isShareText = /https?:\/\//iu.test(value);
  const labeledPublic = labelDestinations(publicDestinations, t);
  const labeledAccount = labelDestinations(accountDestinations, t);
  const labeledAdmin = labelDestinations(adminDestinations, t);
  const publicMatches = labeledPublic.filter((item) =>
    matchesDestination(item, query),
  );
  const accountMatches = user
    ? labeledAccount.filter((item) => matchesDestination(item, query))
    : [];
  const adminMatches =
    user?.role === 'admin'
      ? labeledAdmin.filter((item) => matchesDestination(item, query))
      : [];
  const navigationMatches =
    publicMatches.length + accountMatches.length + adminMatches.length;
  const showNavigation = !isShareText;
  const showVideoUpload = Boolean(
    user &&
      (!query ||
        (!navigationMatches &&
          '上传本地视频 upload local video'.includes(query))),
  );
  const showScreenplayUpload = Boolean(
    user &&
      (!query ||
        (!navigationMatches &&
          '上传剧本文档 upload screenplay'.includes(query))),
  );
  const showParse = Boolean(
    user &&
      (!query ||
        isShareText ||
        (!navigationMatches && !showVideoUpload && !showScreenplayUpload)),
  );
  const showLogin = Boolean(
    !user &&
      (!query ||
        isShareText ||
        '登录后使用 sign in to continue'.includes(query)),
  );
  const showRegister = Boolean(
    !user && (!query || '注册账户 create account'.includes(query)),
  );

  const openDialog = useCallback(
    (nextValue = input) => {
      returnFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setValue(nextValue);
      setInvalid(false);
      setOpen(true);
    },
    [input],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key !== 'k' && event.key !== 'K') ||
        (!event.metaKey && !event.ctrlKey) ||
        event.altKey ||
        event.shiftKey ||
        event.repeat ||
        event.isComposing
      )
        return;
      event.preventDefault();
      if (open) setOpen(false);
      else openDialog();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, openDialog]);

  function submit() {
    if (!hasPublicInput(value)) {
      setInvalid(true);
      return;
    }
    requestQuickParse(value);
    setOpen(false);
    if (pathname !== '/') {
      markNavigationPush('/');
      router.push('/');
    }
  }

  function selectUpload(mode: Extract<IntakeMode, 'video' | 'screenplay'>) {
    setMode(mode);
    setOpen(false);
    if (pathname !== '/') {
      markNavigationPush('/');
      router.push('/');
    }
  }

  function navigate(href: string) {
    setOpen(false);
    if (pathname !== href) {
      markNavigationPush(href);
      router.push(href);
    }
  }

  function selectSearchResult() {
    const destination = [
      ...publicMatches,
      ...accountMatches,
      ...adminMatches,
    ][0];
    if (destination) return navigate(destination.href);
    if (showVideoUpload) return selectUpload('video');
    if (showScreenplayUpload) return selectUpload('screenplay');
    if (showLogin) return navigate('/user/login?redirect=%2F');
    if (showRegister) return navigate('/user/register');
    if (showParse) submit();
  }

  function pasteShareText(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text');
    if (!/[\r\n]/.test(pasted)) return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart ?? value.length;
    const end = target.selectionEnd ?? start;
    setValue(
      `${value.slice(0, start)}${pasted.replace(/\s+/g, ' ')}${value.slice(end)}`.slice(
        0,
        4096,
      ),
    );
    setInvalid(false);
  }

  return (
    <>
      <InputGroup className="w-60">
        <InputGroupInput
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          aria-label={t('chrome.quickParseLabel')}
          onClick={() => openDialog()}
          onChange={(event) => openDialog(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            openDialog();
          }}
          placeholder={t('chrome.quickParseLabel')}
          type="search"
          value=""
        />
        <InputGroupAddon>
          <MagnifyingGlassIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <Kbd aria-label="Command + K">
            <CommandIcon aria-hidden />K
          </Kbd>
        </InputGroupAddon>
      </InputGroup>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          className="max-h-svh overflow-y-auto overscroll-contain sm:max-w-2xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected)
              returnFocus.current.focus({ preventScroll: true });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('chrome.quickParseTitle')}</DialogTitle>
            <DialogDescription>
              {user
                ? t('chrome.quickParseSignedIn')
                : t('chrome.quickParseSignedOut')}
            </DialogDescription>
          </DialogHeader>
          <Command label={t('chrome.commandLabel')} shouldFilter={false}>
            <CommandInput
              aria-describedby={invalid ? 'quick-parse-error' : undefined}
              aria-invalid={invalid ? true : undefined}
              aria-label={t('chrome.commandLabel')}
              maxLength={4096}
              onKeyDown={(event) => {
                if (
                  event.key !== 'Enter' ||
                  event.nativeEvent.isComposing ||
                  !query ||
                  isShareText
                )
                  return;
                event.preventDefault();
                event.stopPropagation();
                selectSearchResult();
              }}
              onPaste={pasteShareText}
              onValueChange={(nextValue) => {
                setValue(nextValue);
                setInvalid(false);
              }}
              placeholder={t('chrome.commandPlaceholder')}
              value={value}
            />
            <CommandList>
              {user &&
              (showParse || showVideoUpload || showScreenplayUpload) ? (
                <CommandGroup heading={t('chrome.chooseAction')}>
                  {showParse ? (
                    <CommandItem onSelect={submit} value="解析链接">
                      <LinkSimpleIcon aria-hidden />
                      {t('chrome.parseLink')}
                      <CommandShortcut aria-label="Enter">
                        <ArrowElbowDownLeftIcon aria-hidden />
                      </CommandShortcut>
                    </CommandItem>
                  ) : null}
                  {showVideoUpload ? (
                    <CommandItem
                      onSelect={() => selectUpload('video')}
                      value="上传本地视频"
                    >
                      <FileVideoIcon aria-hidden />
                      {t('chrome.uploadVideo')}
                    </CommandItem>
                  ) : null}
                  {showScreenplayUpload ? (
                    <CommandItem
                      onSelect={() => selectUpload('screenplay')}
                      value="上传剧本文档"
                    >
                      <FileTextIcon aria-hidden />
                      {t('chrome.uploadScreenplay')}
                    </CommandItem>
                  ) : null}
                </CommandGroup>
              ) : null}
              {showLogin || showRegister ? (
                <CommandGroup heading={t('chrome.getStarted')}>
                  {showLogin ? (
                    <CommandItem
                      onSelect={() => navigate('/user/login?redirect=%2F')}
                      value="登录后使用"
                    >
                      <SignInIcon aria-hidden />
                      {t('chrome.loginToUse')}
                    </CommandItem>
                  ) : null}
                  {showRegister ? (
                    <CommandItem
                      onSelect={() => navigate('/user/register')}
                      value="注册账户"
                    >
                      <UserPlusIcon aria-hidden />
                      {t('chrome.registerAccount')}
                    </CommandItem>
                  ) : null}
                </CommandGroup>
              ) : null}
              {showNavigation && publicMatches.length ? (
                <CommandGroup heading={t('chrome.pages')}>
                  {publicMatches.map(({ label, href, icon: Icon }) => (
                    <CommandItem
                      key={href}
                      onSelect={() => navigate(href)}
                      value={label}
                    >
                      <Icon aria-hidden />
                      {label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {showNavigation && accountMatches.length ? (
                <CommandGroup heading={t('chrome.workspace')}>
                  {accountMatches.map(({ label, href, icon: Icon }) => (
                    <CommandItem
                      key={href}
                      onSelect={() => navigate(href)}
                      value={label}
                    >
                      <Icon aria-hidden />
                      {label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {showNavigation && adminMatches.length ? (
                <CommandGroup heading={t('chrome.admin')}>
                  {adminMatches.map(({ label, href, icon: Icon }) => (
                    <CommandItem
                      key={href}
                      onSelect={() => navigate(href)}
                      value={label}
                    >
                      <Icon aria-hidden />
                      {label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {!user &&
              query &&
              !navigationMatches &&
              !showLogin &&
              !showRegister ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {t('chrome.noPageMatch')}
                </p>
              ) : null}
            </CommandList>
            {invalid ? (
              <FieldError id="quick-parse-error">
                {t('chrome.publicInputRequired')}
              </FieldError>
            ) : null}
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
