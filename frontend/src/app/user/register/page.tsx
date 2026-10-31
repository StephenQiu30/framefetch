import type { Metadata } from 'next';

import { RegisterView } from '@/components/auth/register-view';
import { translate } from '@/lib/i18n/messages';
import { readLocale } from '@/lib/i18n/server-locale';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translate(await readLocale(), 'auth.registerTab') };
}

export default function RegisterPage() {
  return <RegisterView />;
}
