const LOCAL_SITE_URL = 'http://127.0.0.1:8101';

export function resolveSiteUrl(value: string | undefined): URL {
  const candidate = value?.trim();
  if (!candidate) return new URL(LOCAL_SITE_URL);

  try {
    const url = new URL(candidate);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new Error('unsupported protocol');
    }

    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url;
  } catch (error) {
    throw new Error('SITE_URL must be an absolute HTTP(S) URL', {
      cause: error,
    });
  }
}

export const sourceRepositories = [
  {
    name: 'framefetch',
    href: 'https://github.com/StephenQiu30/framefetch',
    text: 'FastAPI API、Next.js Web、下载 / 文档 / 报告 Worker、隔离 Media Runner 与 Docker Compose 部署。',
    english:
      'FastAPI API, Next.js web app, workers, isolated media runner and Docker Compose.',
  },
  {
    name: 'framefetch-electron',
    href: 'https://github.com/StephenQiu30/framefetch-electron',
    text: '连接自托管 framefetch 的 Electron 桌面客户端，面向 macOS 与 Windows。媒体处理与 AI 推理仍在服务端执行。',
    english:
      'Electron desktop client for macOS and Windows. It connects to a self-hosted framefetch; media processing and AI inference stay on the server.',
  },
  {
    name: 'framefetch-app',
    href: 'https://github.com/StephenQiu30/framefetch-app',
    text: '连接自托管 framefetch 的 Flutter iOS / Android 客户端。媒体处理与 AI 推理仍在服务端执行。',
    english:
      'Flutter iOS and Android client for a self-hosted framefetch. Media processing and AI inference stay on the server.',
  },
] as const;

const [serverRepository, desktopRepository, mobileRepository] =
  sourceRepositories;

export const siteConfig = {
  name: '帧取 Framefetch',
  shortName: '帧取',
  title: '帧取 Framefetch — 开源自托管的视频解析与 AI 分析平台',
  description:
    '帧取 Framefetch 是 MIT 开源的自托管视频解析与 AI 分析平台，支持本地视频导入、剧本文档处理、分镜分析，以及 Markdown / DOCX 报告导出。',
  englishDescription:
    'Framefetch is a self-hosted open-source workflow for authorized video parsing, local media import, screenplay processing, and AI video analysis with Markdown and DOCX reports.',
  repositoryUrl: serverRepository.href,
  desktopRepositoryUrl: desktopRepository.href,
  documentationUrl: `${serverRepository.href}/tree/main/docs`,
  mobileRepositoryUrl: mobileRepository.href,
  licenseUrl: `${serverRepository.href}/blob/main/LICENSE`,
  maintainer: {
    name: 'StephenQiu30',
    url: 'https://github.com/StephenQiu30',
  },
} as const;

// Search and answer-engine crawlers. Private deployments still noindex HTML.
export const generativeCrawlers = [
  '*',
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'PerplexityBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
] as const;

// Crawlable marketing pages. Everything else is an app view and stays noindex.
export const publicPages = [
  { path: '/', label: '首页' },
  { path: '/guide/', label: '使用指南' },
  { path: '/self-hosting/', label: '自托管部署' },
  { path: '/about/', label: '关于' },
] as const;

export function isPublicPage(pathname: string): boolean {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return publicPages.some(({ path }) => path === normalized);
}

export const socialPalette = {
  background: '#0a0a0a',
  foreground: '#fafafa',
  muted: '#a3a3a3',
} as const;

export const siteUrl = resolveSiteUrl(process.env.SITE_URL);

export function absoluteUrl(path = '/'): string {
  return new URL(path, siteUrl).toString();
}

// Public indexing is a deployment decision; local and private instances opt out.
export const siteIndexable = process.env.SITE_INDEXABLE === 'true';
