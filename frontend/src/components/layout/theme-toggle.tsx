'use client';

import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/i18n-provider';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dark = mounted && theme === 'dark';

  return (
    <Button
      aria-label={dark ? t('chrome.themeToLight') : t('chrome.themeToDark')}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      size="icon-lg"
      variant="ghost"
    >
      {dark ? (
        <SunIcon aria-hidden className="size-5" />
      ) : (
        <MoonIcon aria-hidden className="size-5" />
      )}
    </Button>
  );
}
