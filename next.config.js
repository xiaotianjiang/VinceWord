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
  }
}

module.exports = nextConfig