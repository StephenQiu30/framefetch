import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { HomeExperience } from '@/components/intake/home-experience';
import { PublicHome } from '@/components/intake/public-home';
import { publicQuestions } from '@/components/intake/public-home-content';
import type { Locale } from '@/lib/i18n/locale';
import { translate } from '@/lib/i18n/messages';
import { readLocale } from '@/lib/i18n/server-locale';
import { privateRobots, publicMetadata } from '@/lib/public-metadata';
import { absoluteUrl, siteConfig } from '@/lib/site';

const englishHomeTitle =
  'Framefetch — self-hosted video parsing and AI analysis';

const webCookieName = process.env.AUTH_WEB_COOKIE_NAME ?? 'video_web_session';

async function hasBrowserSession() {
  return (await cookies()).has(webCookieName);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readLocale();
  if (await hasBrowserSession()) {
    return {
      title: translate(locale, 'chrome.workspace'),
      robots: privateRobots,
    };
  }
  const english = locale === 'en-US';
  const metadata = publicMetadata(
    english ? englishHomeTitle : siteConfig.title,
    english ? siteConfig.englishDescription : siteConfig.description,
    '/',
  );
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      locale: english ? 'en_US' : 'zh_CN',
    },
  };
}

function homeStructuredData(locale: Locale) {
  const english = locale === 'en-US';
  const description = english
    ? siteConfig.englishDescription
    : siteConfig.description;
  const name = english ? 'Framefetch' : siteConfig.name;
  const title = english ? englishHomeTitle : siteConfig.title;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': absoluteUrl('/#website'),
        url: absoluteUrl('/'),
        name,
        alternateName: 'Framefetch',
        description,
        inLanguage: locale,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': absoluteUrl('/#software'),
        name,
        alternateName: 'Framefetch',
        description: siteConfig.englishDescription,
        url: absoluteUrl('/'),
        sameAs: [
          siteConfig.repositoryUrl,
          siteConfig.desktopRepositoryUrl,
          siteConfig.mobileRepositoryUrl,
        ],
        license: siteConfig.licenseUrl,
        applicationCategory: 'MultimediaApplication',
        applicationSubCategory: 'Media workflow and video analysis',
        operatingSystem: 'Web, Docker, Linux, macOS, Windows',
        featureList: [
          'Authorized public media link inspection and format selection',
          'Reliable asynchronous downloads with checksum verification',
          'Local video and screenplay import (Markdown, Fountain, TXT, PDF, DOCX)',
          'AI storyboard, scene and keyframe analysis',
          'Markdown and DOCX report export',
          'Flutter iOS and Android client',
          'Electron desktop client for macOS and Windows',
        ],
        author: { '@id': absoluteUrl('/#maintainer') },
        softwareHelp: { '@type': 'WebPage', url: absoluteUrl('/guide/') },
        subjectOf: { '@id': absoluteUrl('/#source') },
      },
      {
        '@type': 'Person',
        '@id': absoluteUrl('/#maintainer'),
        name: siteConfig.maintainer.name,
        url: siteConfig.maintainer.url,
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': absoluteUrl('/#source'),
        targetProduct: { '@id': absoluteUrl('/#software') },
        isAccessibleForFree: true,
        name: 'Framefetch source code',
        description: siteConfig.englishDescription,
        codeRepository: siteConfig.repositoryUrl,
        license: siteConfig.licenseUrl,
        programmingLanguage: ['Python', 'TypeScript'],
        runtimePlatform: ['Docker', 'Node.js', 'Python'],
        author: { '@id': absoluteUrl('/#maintainer') },
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': absoluteUrl('/#desktop-source'),
        targetProduct: { '@id': absoluteUrl('/#software') },
        isAccessibleForFree: true,
        name: 'Framefetch Electron desktop client',
        codeRepository: siteConfig.desktopRepositoryUrl,
        programmingLanguage: 'TypeScript',
        runtimePlatform: ['macOS', 'Windows'],
        author: { '@id': absoluteUrl('/#maintainer') },
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': absoluteUrl('/#mobile-source'),
        targetProduct: { '@id': absoluteUrl('/#software') },
        isAccessibleForFree: true,
        name: 'Framefetch Flutter iOS / Android client',
        codeRepository: siteConfig.mobileRepositoryUrl,
        programmingLanguage: 'Dart',
        runtimePlatform: ['iOS', 'Android'],
        author: { '@id': absoluteUrl('/#maintainer') },
      },
      {
        '@type': 'WebPage',
        '@id': absoluteUrl('/#webpage'),
        url: absoluteUrl('/'),
        name: title,
        description,
        inLanguage: locale,
        isPartOf: { '@id': absoluteUrl('/#website') },
        about: { '@id': absoluteUrl('/#software') },
        hasPart: { '@id': absoluteUrl('/#questions') },
      },
      {
        '@type': 'FAQPage',
        '@id': absoluteUrl('/#questions'),
        mainEntity: publicQuestions(locale).map(({ id, question, answer }) => ({
          '@type': 'Question',
          '@id': absoluteUrl(`/#${id}`),
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  };
}

export default async function HomePage() {
  const locale = await readLocale();
  const privateHome = await hasBrowserSession();

  return (
    <>
      {!privateHome ? (
        <script type="application/ld+json">
          {JSON.stringify(homeStructuredData(locale)).replace(/</g, '\\u003c')}
        </script>
      ) : null}
      <HomeExperience
        initialPublic={!privateHome}
        publicHome={<PublicHome />}
      />
    </>
  );
}
