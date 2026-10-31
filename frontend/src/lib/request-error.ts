import {
  localizedErrorMessage,
  statusErrorMessage,
} from '@/lib/error-messages';
import { requestCopy } from '@/lib/i18n/error-copy';
import type { Locale } from '@/lib/i18n/locale';
import { currentLocale } from '@/lib/i18n/locale-state';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly title: string,
    readonly detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

export function displayError(
  error: unknown,
  locale: Locale = currentLocale(),
): string {
  const copy = requestCopy(locale);
  if (!(error instanceof ApiError)) return copy.unknown;
  return (
    localizedErrorMessage(error.code, undefined, locale) ??
    (locale === 'zh-CN' && containsChinese(error.detail)
      ? error.detail
      : statusErrorMessage(error.status, locale))
  );
}

export function apiErrorFrom(
  status: number,
  payload: unknown,
  fallbackDetail?: string,
  locale: Locale = currentLocale(),
): ApiError {
  const problem = parseErrorResponse(payload);
  if (problem) {
    return new ApiError(status, problem.code, problem.message, problem.message);
  }
  const copy = requestCopy(locale);
  return new ApiError(
    status,
    'request_failed',
    copy.requestFailed,
    fallbackDetail ?? (status >= 500 ? copy.unavailable : copy.incomplete),
  );
}

function parseErrorResponse(value: unknown): API.ErrorResponse | null {
  if (!value || typeof value !== 'object') return null;
  const error = value as Partial<API.ErrorResponse>;
  return typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    error.data === null
    ? (error as API.ErrorResponse)
    : null;
}

function containsChinese(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value);
}
