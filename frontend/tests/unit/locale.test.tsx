import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DesktopNavigation } from '@/components/layout/desktop-navigation';
import { LocaleToggle } from '@/components/layout/locale-toggle';
import { I18nProvider } from '@/lib/i18n/i18n-provider';
import { matchAcceptLanguage, resolveLocale } from '@/lib/i18n/locale';
import { ApiError, displayError } from '@/lib/request-error';
import { render } from '../helpers/query-render';

describe('locale selection', () => {
  it('maps Chinese and English tags onto the two supported locales', () => {
    expect(resolveLocale('zh')).toBe('zh-CN');
    expect(resolveLocale('zh_TW')).toBe('zh-CN');
    expect(resolveLocale('en-GB')).toBe('en-US');
    expect(resolveLocale('fr')).toBeNull();
    expect(matchAcceptLanguage('fr,en;q=0.8')).toBe('en-US');
    expect(matchAcceptLanguage('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh-CN');
  });

  it('translates shared navigation and API errors', () => {
    render(
      <I18nProvider locale="en-US">
        <DesktopNavigation
          documentsActive={false}
          historyActive={false}
          homeActive
          providersActive={false}
          publicView={false}
        />
      </I18nProvider>,
    );
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(
      displayError(
        new ApiError(401, 'unauthenticated', 'Unauthorized', 'Unauthorized'),
        'en-US',
      ),
    ).toBe('Your session has expired. Sign in again.');
  });

  it('stores the next locale and reloads so the document matches', () => {
    const reload = vi.fn();
    vi.spyOn(window.location, 'reload').mockImplementation(reload);
    render(<LocaleToggle />);
    fireEvent.click(screen.getByRole('button', { name: '切换到英文' }));
    expect(document.cookie).toContain('framefetch-locale=en-US');
    expect(reload).toHaveBeenCalledOnce();
  });
});
