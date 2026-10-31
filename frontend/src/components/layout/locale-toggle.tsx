'use client';

import { Button } from '@/components/ui/button';
import { useLocale, useT } from '@/lib/i18n/i18n-provider';
import { type Locale, localeCookieName } from '@/lib/i18n/locale';

export function LocaleToggle() {
  const locale = useLocale();
  const t = useT();
  const next: Locale = locale === 'zh-CN' ? 'en-US' : 'zh-CN';

  return (
    <Button
      aria-label={
        next === 'en-US'
          ? t('locale.switchToEnglish')
          : t('locale.switchToChinese')
      }
      onClick={() => {
        // Cookie Store is unavailable in some browsers this app still runs in.
        // biome-ignore lint/suspicious/noDocumentCookie: fallback for browsers without cookieStore
        document.cookie = `${localeCookieName}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
        window.location.reload();
      }}
      size="lg"
      type="button"
      variant="ghost"
    >
      {next === 'en-US' ? t('locale.englishShort') : t('locale.chineseShort')}
    </Button>
  );
}
