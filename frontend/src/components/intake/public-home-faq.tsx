'use client';

import Link from 'next/link';
import { publicQuestions } from '@/components/intake/public-home-content';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ItemTitle } from '@/components/ui/item';
import { useLocale, useT } from '@/lib/i18n/i18n-provider';

export function PublicHomeFaq() {
  const locale = useLocale();
  const t = useT();
  const questions = publicQuestions(locale);

  return (
    <section
      aria-labelledby="questions-title"
      className="flex flex-col gap-4 scroll-mt-24"
      id="questions"
    >
      <ItemTitle>
        <h2 id="questions-title">{t('home.faqTitle')}</h2>
      </ItemTitle>
      <Accordion
        type="multiple"
        defaultValue={questions.map((item) => item.id)}
      >
        {questions.map(({ id, question, answer }) => (
          <AccordionItem id={id} key={id} value={id}>
            <AccordionTrigger>{question}</AccordionTrigger>
            <AccordionContent>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Button asChild className="self-start" variant="ghost">
        <Link href="/guide/">{t('home.faqGuide')}</Link>
      </Button>
    </section>
  );
}
