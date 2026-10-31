'use client';

import { Eraser, FileText, FileVideo, LinkSimple } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/lib/i18n/i18n-provider';

export type IntakeMode = 'link' | 'video' | 'screenplay' | 'watermark';

export function ContentIntakeHero({
  disabled,
  linkForm,
  mode,
  onModeChange,
  screenplayForm,
  videoForm,
  watermarkForm,
}: {
  disabled: boolean;
  linkForm: ReactNode;
  mode: IntakeMode;
  onModeChange: (mode: IntakeMode) => void;
  screenplayForm: ReactNode;
  videoForm: ReactNode;
  watermarkForm: ReactNode;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        size="lg"
        description={
          mode === 'watermark'
            ? t('intake.watermarkDescription')
            : t('intake.downloadDescription')
        }
        title={
          mode === 'watermark'
            ? t('intake.watermarkTitle')
            : t('intake.downloadTitle')
        }
      />

      <Tabs
        className="w-full gap-4"
        onValueChange={(value) => onModeChange(value as IntakeMode)}
        value={mode}
      >
        <TabsList
          aria-label={t('intake.sourceLabel')}
          className="h-auto max-w-full flex-wrap"
          variant="default"
        >
          <TabsTrigger className="min-w-0" disabled={disabled} value="link">
            <LinkSimple aria-hidden />
            {t('intake.link')}
          </TabsTrigger>
          <TabsTrigger className="min-w-0" disabled={disabled} value="video">
            <FileVideo aria-hidden />
            {t('intake.video')}
          </TabsTrigger>
          <TabsTrigger
            className="min-w-0"
            disabled={disabled}
            value="screenplay"
          >
            <FileText aria-hidden />
            {t('intake.screenplay')}
          </TabsTrigger>
          <TabsTrigger
            className="min-w-0"
            disabled={disabled}
            value="watermark"
          >
            <Eraser aria-hidden />
            {t('intake.watermark')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="link">{linkForm}</TabsContent>
        <TabsContent value="watermark">{watermarkForm}</TabsContent>
        <TabsContent value="video">{videoForm}</TabsContent>
        <TabsContent value="screenplay">{screenplayForm}</TabsContent>
      </Tabs>
    </div>
  );
}
