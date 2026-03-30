import { NextRequest } from 'next/server';

/**
 * SSE 客户端连接
 */
interface ClientConnection {
  roomId: number;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  encoder: TextEncoder;
}

/**
 * 存储所有活跃的 SSE 连接
 * key: clientId (随机生成)
 * value: ClientConnection
 */
const clients = new Map<string, ClientConnection>();

/**
 * 生成唯一的客户端ID
 */
function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * SSE 事件类型
 */
export type SSEEventType =
  | 'player_joined'
  | 'player_left'
  | 'player_ready'
  | 'player_seated'
  | 'player_stand_up'
  | 'game_started'
  | 'guess_submitted'
  | 'game_ended'
  | 'room_updated';

/**
 * SSE 事件数据结构
 */
export interface SSEEvent {
  type: SSEEventType;
  roomId: number;
  data: any;
  timestamp: string;
}

/**
 * 广播消息到指定房间的所有客户端
 * @param roomId 房间ID
 * @param eventType 事件类型
 * @param data 事件数据
 */
export async function broadcastToRoom(
  roomId: number,
  eventType: SSEEventType,
  data: any
): Promise<void> {
  const event: SSEEvent = {
    type: eventType,
    roomId,
    data,
    timestamp: new Date().toISOString(),
  };

  const message = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);

  console.log(`[SSE] 广播到房间 ${roomId}: ${eventType}`, data);

  // 收集需要清理的客户端
  const clientsToRemove: string[] = [];

  for (const [clientId, connection] of clients.entries()) {
    if (connection.roomId === roomId) {
      try {
        await connection.writer.write(encodedMessage);
      } catch (error) {
        console.error(`[SSE] 发送消息失败，客户端: ${clientId}`, error);
        clientsToRemove.push(clientId);
      }
    }
  }

  // 清理断开的客户端
  clientsToRemove.forEach((clientId) => {
    const connection = clients.get(clientId);
    if (connection) {
      try {
        connection.writer.close();
      } catch (e) {
        // 忽略关闭错误
      }
      clients.delete(clientId);
    }
  });
}

/**
 * 获取房间的连接数
 * @param roomId 房间ID
 */
export function getRoomConnectionCount(roomId: number): number {
  let count = 0;
  for (const connection of clients.values()) {
    if (connection.roomId === roomId) {
      count++;
    }
  }
  return count;
}

/**
 * SSE 连接处理
 * GET /api/sse?roomId=[id]
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const roomId = parseInt(searchParams.get('roomId') || '', 10);

  if (isNaN(roomId)) {
    return new Response('缺少 roomId 参数', { status: 400 });
  }

  const clientId = generateClientId();
  console.log(`[SSE] 新连接: ${clientId}, 房间: ${roomId}`);

  // 创建 TransformStream
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // 存储客户端连接
  clients.set(clientId, {
    roomId,
    writer,
    encoder,
  });

  // 发送初始连接成功消息
  const connectMessage = encoder.encode(
    `data: ${JSON.stringify({
      type: 'connected',
      roomId,
      clientId,
      timestamp: new Date().toISOString(),
    })}\n\n`
  );
  await writer.write(connectMessage);

  // 监听连接关闭
  request.signal.addEventListener('abort', () => {
    console.log(`[SSE] 连接关闭: ${clientId}`);
    const connection = clients.get(clientId);
    if (connection) {
      try {
        connection.writer.close();
      } catch (e) {
        // 忽略关闭错误
      }
      clients.delete(clientId);
    }
  });

  // 返回 SSE 响应
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  });
}

/**
 * 清理所有连接（用于测试或重置）
 */
export function clearAllConnections(): void {
  for (const [clientId, connection] of clients.entries()) {
    try {
      connection.writer.close();
    } catch (e) {
      // 忽略关闭错误
    }
    clients.delete(clientId);
  }
  console.log('[SSE] 所有连接已清理');
}
