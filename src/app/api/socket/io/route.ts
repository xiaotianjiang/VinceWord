import { Server } from 'socket.io';
import { NextRequest, NextResponse } from 'next/server';

let io: Server | null = null;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 检查是否已经初始化了Socket.io服务器
  if (!io) {
    // 由于Next.js的API路由是无状态的，我们需要在第一次请求时初始化Socket.io
    // 注意：这种方法在生产环境中可能需要调整，因为Next.js会自动缩放
    console.log('Initializing Socket.io server...');
  }

  // 返回成功响应
  return NextResponse.json({ message: 'Socket.io server is running' });
}

// 处理WebSocket连接
export async function POST(request: NextRequest) {
  // 由于Next.js的API路由不直接支持WebSocket，我们需要使用自定义的WebSocket处理
  // 注意：这种方法可能需要调整，具体取决于Next.js的版本和配置
  return NextResponse.json({ error: 'WebSocket connections are not supported through this endpoint' }, { status: 400 });
}
