import { join } from 'node:path';
import { defineConfig } from '@umijs/max';
import proxy from './proxy';
import routes from './routes';

const { UMI_ENV = 'dev' } = process.env;

export default defineConfig({
  hash: true,
  esbuildMinifyIIFE: true,
  routes,
  proxy: proxy[UMI_ENV as keyof typeof proxy],
  fastRefresh: true,
  antd: {},
  request: {},
  reactQuery: {},
  title: '公开视频下载器',
  plugins: ['@umijs/max-plugin-openapi'],
  openAPI: [
    {
      requestLibPath: "import { request } from '@umijs/max'",
      // The local fallback only satisfies Umi's config schema; openapi generation
      // must receive OPENAPI_SCHEMA_URL and fails when the file is absent.
      schemaPath:
        process.env.OPENAPI_SCHEMA_URL ||
        join(process.cwd(), '.openapi-schema.json'),
      projectName: 'video',
      mock: false,
    },
  ],
  define: {
    'process.env.VIDEO_API_BASE_URL': process.env.VIDEO_API_BASE_URL,
  },
});
