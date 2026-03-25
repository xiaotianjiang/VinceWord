/** @type {import('next').NextConfig} */
const nextConfig = {
  // 配置路由别名
  async rewrites() {
    return [
      // 将 /gamesMemory 重写为 /games/memory
      {
        source: '/gamesMemory',
        destination: '/games/memory'
      }
    ];
  },
  // 配置 API 路由为动态，避免静态构建时的错误
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  }
}

module.exports = nextConfig