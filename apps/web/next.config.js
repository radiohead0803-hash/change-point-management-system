const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  importScripts: ['/custom-sw.js'],
  buildExcludes: [/middleware-manifest\.json$/, /\.map$/],
  // 페이지 프리캐싱 비활성화 - 캐시된 에러 페이지 문제 방지
  dynamicStartUrl: false,
  cacheOnFrontEndNav: false,
  reloadOnOnline: true,
  runtimeCaching: [
    {
      // HTML 페이지 - 네트워크만 사용 (캐시 안 함)
      urlPattern: /^https:\/\/.*/,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'pages',
      },
      method: 'GET',
    },
  ],
  // next-pwa 기본 캐싱 규칙 사용 안 함
  publicExcludes: ['!icons/**/*'],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cpms/database'],
};

module.exports = withPWA(nextConfig);
