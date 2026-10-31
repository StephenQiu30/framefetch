import 'server-only';

import { cookies, headers } from 'next/headers';
import { cache } from 'react';

import {
  type Locale,
  localeCookieName,
  matchAcceptLanguage,
  resolveLocale,
} from '@/lib/i18n/locale';

export const readLocale = cache(async (): Promise<Locale> => {
  const stored = resolveLocale((await cookies()).get(localeCookieName)?.value);
  if (stored) return stored;
  return matchAcceptLanguage((await headers()).get('accept-language'));
});
