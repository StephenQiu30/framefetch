import type { Metadata } from 'next';

import { LoginView } from '@/components/auth/login-view';
import { translate } from '@/lib/i18n/messages';
import { readLocale } from '@/lib/i18n/server-locale';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translate(await readLocale(), 'auth.loginTab') };
}

export default function LoginPage() {
  return <LoginView />;
}
