const target = process.env.VIDEO_API_PROXY_TARGET;

const apiProxy = target
  ? {
      '/api/': {
        target,
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
      },
    }
  : {};

export default {
  dev: apiProxy,
  test: apiProxy,
};
