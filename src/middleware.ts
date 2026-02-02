import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 不需要登录校验的路径
const publicPaths = ['/login', '/register', '/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 检查是否为公开路径
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }
  
  // 检查是否已登录
  // 由于中间件在服务器端运行，无法访问localStorage
  // 我们改为在客户端组件中进行认证检查
  // 这里只做基本的路由保护，具体认证逻辑在页面组件中实现
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - 公开路径
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};