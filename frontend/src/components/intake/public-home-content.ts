import type { Locale } from '@/lib/i18n/locale';

const questions = [
  {
    id: 'what-is-framefetch',
    question: '帧取 Framefetch 是什么？',
    answer:
      '帧取是 MIT 开源、可自托管的个人视频下载与分析工具。它支持检查公开、免费、非 DRM 的视频链接，导入有权处理的本地视频与剧本文档，并管理处理记录、AI 分析和报告导出。',
    questionEn: 'What is Framefetch?',
    answerEn:
      'Framefetch is an MIT-licensed, self-hosted tool for downloading and analyzing video. It can inspect public, free, non-DRM video links, import local videos and screenplays you are allowed to process, and keep track of jobs, AI analysis, and exported reports.',
  },
  {
    id: 'ai-reports',
    question: 'AI 视频分析可以输出什么？',
    answer:
      '按所选分析能力生成场景、分镜、时间轴和关键帧证据等结构化结果，报告可导出为 Markdown 或 DOCX。AI 分析需要配置可用的模型服务与 AI Worker；模型结论需要结合原始素材复核。',
    questionEn: 'What can AI video analysis produce?',
    answerEn:
      'The selected analysis produces structured scenes, shots, a timeline, and keyframe evidence. Reports export as Markdown or DOCX. Analysis needs a configured model service and AI worker, and model conclusions should be checked against the source.',
  },
  {
    id: 'local-import',
    question: '可以直接分析本地视频和剧本吗？',
    answer:
      '可以导入自己有权处理的本地视频与剧本文档。剧本支持 Markdown、Fountain、TXT、PDF 和 DOCX；导入后可在工作区阅读和发起分析，无需先提供第三方平台链接。',
    questionEn: 'Can I analyze a local video or screenplay directly?',
    answerEn:
      'Yes. Import a local video or screenplay you are allowed to process. Screenplays can be Markdown, Fountain, TXT, PDF, or DOCX. After import you can read and analyze them in the workspace without a third-party link.',
  },
  {
    id: 'self-hosting',
    question: '开源免费是否意味着运行没有成本？',
    answer:
      '源代码以 MIT 许可证开放，可自行部署、使用和修改。服务器、对象存储、网络流量和外部 AI 模型可能产生费用；本项目不承诺免费托管或免费模型额度。',
    questionEn: 'Does open source mean it is free to run?',
    answerEn:
      'The source is MIT licensed, so you can deploy, use, and modify it. Servers, object storage, bandwidth, and external AI models can cost money. This project does not provide free hosting or free model credits.',
  },
  {
    id: 'platform-support',
    question: '是否支持所有视频平台和所有链接？',
    answer:
      '不保证所有平台或链接可用。实际能力取决于部署实例的 Provider 配置、内容授权、访问条件和最近验证结果；应先检查链接再选择格式。公开可访问不等于获得使用授权。',
    questionEn: 'Does it support every platform and every link?',
    answerEn:
      'No. What works depends on this deployment’s provider configuration, content rights, access conditions, and the latest check. Inspect the link before choosing a format. Being publicly reachable is not the same as permission to use it.',
  },
  {
    id: 'mobile-app',
    question: '手机端是否能独立运行 AI 分析？',
    answer:
      'iOS 和 Android 客户端位于独立的 framefetch-app 仓库，使用 Flutter 构建并连接自托管 framefetch。媒体处理与 AI 推理由服务端执行，手机端不内置离线提取器或离线 AI 模型。',
    questionEn: 'Can the phone app run AI analysis on its own?',
    answerEn:
      'The iOS and Android client lives in the separate framefetch-app repository. It is a Flutter app that connects to a self-hosted Framefetch. Media processing and AI inference run on the server. The phone does not include an offline extractor or an offline model.',
  },
  {
    id: 'source-repositories',
    question: '源码在哪里？如何关注项目？',
    answer:
      '服务端与 Web：https://github.com/StephenQiu30/framefetch。桌面端：https://github.com/StephenQiu30/framefetch-electron。iOS 与 Android：https://github.com/StephenQiu30/framefetch-app。三个仓库都采用 MIT 许可证，由 StephenQiu30 维护。在 GitHub 打开对应仓库即可 Star 或 Watch。',
    questionEn: 'Where is the source, and how do I follow the project?',
    answerEn:
      'Server and web: https://github.com/StephenQiu30/framefetch. Desktop: https://github.com/StephenQiu30/framefetch-electron. iOS and Android: https://github.com/StephenQiu30/framefetch-app. All three are MIT licensed and maintained by StephenQiu30. Open a repository on GitHub to star or watch it.',
  },
] as const;

export type PublicQuestion = {
  id: string;
  question: string;
  answer: string;
};

export function publicQuestions(locale: Locale = 'zh-CN'): PublicQuestion[] {
  return questions.map((item) => ({
    id: item.id,
    question: locale === 'en-US' ? item.questionEn : item.question,
    answer: locale === 'en-US' ? item.answerEn : item.answer,
  }));
}
