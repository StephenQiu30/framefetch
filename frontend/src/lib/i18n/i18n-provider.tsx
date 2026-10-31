'use client';

import { createContext, type ReactNode, useCallback, useContext } from 'react';

import { defaultLocale, type Locale } from '@/lib/i18n/locale';
import { provideLocale } from '@/lib/i18n/locale-state';
import { type MessageKey, translate } from '@/lib/i18n/messages';

const LocaleContext = createContext<Locale>(defaultLocale);

export function I18nProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  provideLocale(locale);
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return useCallback(
    (key: MessageKey, values?: Record<string, string | number>) =>
      translate(locale, key, values),
    [locale],
  );
}
