'use client';

import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  GithubLogoIcon,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import {
  PublicHomeCapabilities,
  PublicHomeSafeguards,
  PublicHomeWorkflow,
} from '@/components/intake/public-home-details';
import { PublicHomeFaq } from '@/components/intake/public-home-faq';
import { PageHeader } from '@/components/layout/page-header';
import { SplitLayout } from '@/components/layout/split-layout';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { useLocale, useT } from '@/lib/i18n/i18n-provider';
import { siteConfig, sourceRepositories } from '@/lib/site';

export function PublicHome() {
  const locale = useLocale();
  const t = useT();
  const capabilities = [
    [t('home.publicEyebrow'), t('home.publicTitle'), t('home.publicBody')],
    [t('home.localEyebrow'), t('home.localTitle'), t('home.localBody')],
    [
      t('home.analysisEyebrow'),
      t('home.analysisTitle'),
      t('home.analysisBody'),
    ],
  ] as const;
  const workflow = [
    [t('home.stepParse'), t('home.stepParseBody')],
    [t('home.stepChoose'), t('home.stepChooseBody')],
    [t('home.stepRun'), t('home.stepRunBody')],
    [t('home.stepDeliver'), t('home.stepDeliverBody')],
  ] as const;
  const safeguards = [
    t('home.safeguardPublic'),
    t('home.safeguardLocal'),
    t('home.safeguardStorage'),
    t('home.safeguardLicense'),
  ] as const;

  return (
    <div
      className="inner-page flex flex-col gap-12"
      data-home-view-root="public"
    >
      <PageHeader
        size="lg"
        title={t('home.title')}
        description={t('home.description')}
      />
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/user/register">
            {t('home.createAccount')}
            <ArrowRightIcon aria-hidden data-icon="inline-end" />
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <a href={siteConfig.repositoryUrl} rel="noreferrer" target="_blank">
            <GithubLogoIcon aria-hidden data-icon="inline-start" />
            {t('home.viewSource')}
            <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
          </a>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/user/login">{t('home.signIn')}</Link>
        </Button>
      </div>
      <SplitLayout columns="primary">
        <section
          aria-labelledby="capabilities-title"
          className="flex flex-col gap-4"
          id="capabilities"
        >
          <ItemTitle>
            <h2 id="capabilities-title">{t('home.capabilitiesTitle')}</h2>
          </ItemTitle>
          <PublicHomeCapabilities items={capabilities} />
        </section>
        <section
          aria-labelledby="workflow-title"
          className="flex flex-col gap-4"
        >
          <ItemTitle>
            <h2 id="workflow-title">{t('home.workflowTitle')}</h2>
          </ItemTitle>
          <PublicHomeWorkflow items={workflow} label={t('home.workflowList')} />
        </section>
      </SplitLayout>
      <SplitLayout columns="primary" id="architecture">
        <section
          aria-labelledby="architecture-title"
          className="flex flex-col gap-4"
        >
          <ItemTitle>
            <h2 id="architecture-title">{t('home.architectureTitle')}</h2>
          </ItemTitle>
          <Item variant="muted">
            <ItemContent>
              <ItemTitle>{t('home.architectureItemTitle')}</ItemTitle>
              <ItemDescription className="line-clamp-none">
                {t('home.architectureBody')}
              </ItemDescription>
            </ItemContent>
          </Item>
          <Button asChild className="self-start" variant="secondary">
            <a
              href={`${siteConfig.repositoryUrl}/blob/main/README.md#快速开始`}
            >
              {t('home.readDeploy')}
              <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
            </a>
          </Button>
        </section>
        <section aria-label={t('home.safeguardsLabel')}>
          <PublicHomeSafeguards items={safeguards} />
        </section>
      </SplitLayout>
      <section
        aria-labelledby="repositories-title"
        className="flex flex-col gap-4"
        id="repositories"
      >
        <ItemTitle>
          <h2 id="repositories-title">{t('home.repositoriesTitle')}</h2>
        </ItemTitle>
        <ItemGroup>
          {sourceRepositories.map(({ name, href, text, english }) => (
            <Item key={name} role="listitem">
              <ItemContent>
                <ItemTitle>
                  <Button asChild variant="link">
                    <a href={href}>{name}</a>
                  </Button>
                </ItemTitle>
                <ItemDescription className="line-clamp-none">
                  {locale === 'en-US' ? english : text}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </section>
      <PublicHomeFaq />
    </div>
  );
}
