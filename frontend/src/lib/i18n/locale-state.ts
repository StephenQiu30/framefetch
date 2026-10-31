import { cache } from 'react';

import { defaultLocale, type Locale } from '@/lib/i18n/locale';

const serverLocale = cache(() => ({ locale: defaultLocale }));

let clientLocale: Locale = defaultLocale;

export function provideLocale(locale: Locale) {
  if (typeof window === 'undefined') serverLocale().locale = locale;
  else clientLocale = locale;
}

export function currentLocale(): Locale {
  if (typeof window === 'undefined') return serverLocale().locale;
  return clientLocale;
}

export function resetLocale() {
  clientLocale = defaultLocale;
  if (typeof window === 'undefined') serverLocale().locale = defaultLocale;
}
