export const locales = ['zh-CN', 'en-US'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh-CN';

export const localeCookieName = 'framefetch-locale';

export function resolveLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replaceAll('_', '-');
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en-US';
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh-CN';
  return null;
}

export function matchAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return defaultLocale;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const quality = params.find((param) =>
        param.trim().toLowerCase().startsWith('q='),
      );
      const parsed = quality ? Number(quality.trim().slice(2)) : 1;
      return {
        tag: tag?.trim() ?? '',
        quality: Number.isFinite(parsed) ? parsed : 0,
      };
    })
    .filter((item) => item.tag && item.tag !== '*')
    .sort((left, right) => right.quality - left.quality);

  for (const item of ranked) {
    const locale = resolveLocale(item.tag);
    if (locale) return locale;
  }
  return defaultLocale;
}
