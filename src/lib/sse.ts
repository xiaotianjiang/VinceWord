'use client';

/**
 * SSE 事件类型定义
 */
export type SSEEventType = 
  | 'player_joined'
  | 'player_left'
  | 'player_ready'
  | 'game_started'
  | 'guess_submitted'
  | 'game_ended'
  | 'room_updated'
  | 'player_seated'
  | 'player_stand_up';

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
 * SSE 事件回调函数类型
 */
export type SSEEventCallback = (data: any) => void;

/**
 * SSE 管理类
 * 用于管理 Server-Sent Events 连接和事件监听
 */
export class SSEManager {
  private eventSource: EventSource | null = null;
  private listeners: Map<SSEEventType, SSEEventCallback[]> = new Map();
  private roomId: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3秒
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;

  /**
   * 建立 SSE 连接
   * @param roomId 房间ID
   */
  connect(roomId: number): void {
    if (this.eventSource) {
      console.log('[SSE] 已存在连接，先断开');
      this.disconnect();
    }

    this.roomId = roomId;
    this.isIntentionallyClosed = false;
    this.reconnectAttempts = 0;

    try {
      const url = `/api/sse?roomId=${roomId}`;
      console.log(`[SSE] 连接到: ${url}`);
      
      this.eventSource = new EventSource(url);

      // 连接打开
      this.eventSource.onopen = () => {
        console.log('[SSE] 连接已建立');
        this.reconnectAttempts = 0; // 重置重连次数
      };

      // 接收消息
      this.eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data);
          console.log(`[SSE] 收到事件: ${sseEvent.type}`, sseEvent.data);
          this.notifyListeners(sseEvent.type, sseEvent.data);
        } catch (error) {
          console.error('[SSE] 解析事件数据失败:', error);
        }
      };

      // 错误处理
      this.eventSource.onerror = (error) => {
        console.error('[SSE] 连接错误:', error);
        
        if (this.isIntentionallyClosed) {
          console.log('[SSE] 连接已手动关闭，不进行重连');
          return;
        }

        // 自动重连
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[SSE] 创建连接失败:', error);
      this.attemptReconnect();
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSE] 达到最大重连次数，停止重连');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`[SSE] ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`);

    this.reconnectTimer = setTimeout(() => {
      if (this.roomId && !this.isIntentionallyClosed) {
        this.connect(this.roomId);
      }
    }, delay);
  }

  /**
   * 断开 SSE 连接
   */
  disconnect(): void {
    console.log('[SSE] 断开连接');
    
    this.isIntentionallyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.roomId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * 订阅 SSE 事件
   * @param eventType 事件类型
   * @param callback 回调函数
   */
  on(eventType: SSEEventType, callback: SSEEventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
    console.log(`[SSE] 订阅事件: ${eventType}`);
  }

  /**
   * 取消订阅 SSE 事件
   * @param eventType 事件类型
   * @param callback 回调函数（可选，不传则取消该类型所有订阅）
   */
  off(eventType: SSEEventType, callback?: SSEEventCallback): void {
    if (!this.listeners.has(eventType)) {
      return;
    }

    if (callback) {
      const callbacks = this.listeners.get(eventType)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(eventType);
    }
    console.log(`[SSE] 取消订阅事件: ${eventType}`);
  }

  /**
   * 通知所有监听器
   * @param eventType 事件类型
   * @param data 事件数据
   */
  private notifyListeners(eventType: SSEEventType, data: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SSE] 事件处理错误 (${eventType}):`, error);
        }
      });
    }
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  /**
   * 获取当前房间ID
   */
  get currentRoomId(): number | null {
    return this.roomId;
  }
}

/**
 * 全局 SSE 管理器实例
 */
export const sseManager = new SSEManager();

/**
 * React Hook: 使用 SSE
 * @param roomId 房间ID
 * @param eventHandlers 事件处理器
 */
export function useSSE(
  roomId: number | null,
  eventHandlers: Partial<Record<SSEEventType, SSEEventCallback>>
) {
  const { useEffect, useRef } = require('react');
  
  const handlersRef = useRef(eventHandlers);
  handlersRef.current = eventHandlers;

  useEffect(() => {
    if (!roomId) return;

    // 订阅所有事件
    const unsubscribers: (() => void)[] = [];

    (Object.keys(handlersRef.current) as SSEEventType[]).forEach(eventType => {
      const handler = handlersRef.current[eventType];
      if (handler) {
        sseManager.on(eventType, handler);
        unsubscribers.push(() => sseManager.off(eventType, handler));
      }
    });

    // 建立连接
    sseManager.connect(roomId);

    // 清理函数
    return () => {
      unsubscribers.forEach(unsub => unsub());
      sseManager.disconnect();
    };
  }, [roomId]);
}
