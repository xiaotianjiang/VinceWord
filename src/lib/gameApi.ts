/**
 * 游戏 API 客户端模块
 * 封装所有与游戏相关的 HTTP API 请求
 */

// 类型定义
export interface Room {
  id: number;
  name: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'closed';
  can_spectate: boolean;
  digit_count: number;
  created_at: string;
  updated_at: string;
  player_count?: number;
  host_username?: string;
}

export interface Player {
  id: number;
  room_id: number;
  player_id: string;
  seat: number | null;
  is_ready: boolean;
  joined_at: string;
  left_at: string | null;
  username?: string;
}

export interface Game {
  id: number;
  room_id: number;
  player1_id: string;
  player2_id: string;
  player1_target: string;
  player2_target: string;
  current_turn: string;
  status: 'playing' | 'completed';
  winner_id: string | null;
  digit_count: number;
  created_at: string;
  updated_at: string;
}

export interface Guess {
  id: number;
  game_id: number;
  round: number;
  guesser_id: string;
  guess: string;
  target_owner_id: string;
  hit_count: number;
  created_at: string;
}

export interface Stats {
  id: number;
  player_id: string;
  total_games: number;
  total_rounds: number;
  wins: number;
  escapes: number;
  win_rate: number;
  updated_at: string;
}

export interface GameHistory {
  game_id: number;
  opponent_id: string;
  opponent_username: string;
  digit_count: number;
  result: '胜利' | '失败' | '逃跑';
  round_count: number;
  created_at: string;
}

// API 基础 URL
const API_BASE = '/api/games/digits-collision';

/**
 * 通用请求函数
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // 从 localStorage 中获取认证令牌
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
  console.log('fetchApi: 认证令牌:', token ? token.substring(0, 20) + '...' : '无');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    ...options,
  });

  console.log('fetchApi: 响应状态:', response.status);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    console.log('fetchApi: 错误信息:', error);
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 房间管理 API
 */
export const roomApi = {
  /**
   * 获取房间列表
   */
  async getRooms(): Promise<{ rooms: Room[] }> {
    return fetchApi<{ rooms: Room[] }>('/rooms');
  },

  /**
   * 获取用户当前所在的房间
   */
  async getMyRoom(): Promise<{
    inRoom: boolean;
    room: Room | null;
    players?: Player[];
  }> {
    return fetchApi<{
      inRoom: boolean;
      room: Room | null;
      players?: Player[];
    }>('/rooms/my-room');
  },

  /**
   * 创建房间
   */
  async createRoom(data: {
    name: string;
    host_id: string;
    digit_count: number;
    can_spectate: boolean;
  }): Promise<{ room: Room }> {
    return fetchApi<{ room: Room }>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 获取房间详情
   */
  async getRoom(roomId: number): Promise<{
    room: Room;
    players: Player[];
    game: Game | null;
  }> {
    return fetchApi<{
      room: Room;
      players: Player[];
      game: Game | null;
    }>(`/rooms/${roomId}`);
  },

  /**
   * 加入房间
   */
  async joinRoom(
    roomId: number,
    data: {
      player_id: string;
      seat?: number | null;
    }
  ): Promise<{ player: Player; success: boolean; isSpectator: boolean }> {
    return fetchApi<{ player: Player; success: boolean; isSpectator: boolean }>(
      `/rooms/${roomId}/join`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * 准备/取消准备
   */
  async setReady(
    roomId: number,
    data: {
      player_id: string;
      is_ready: boolean;
    }
  ): Promise<{
    player: Player;
    allReady: boolean;
    game?: Game;
  }> {
    return fetchApi<{
      player: Player;
      allReady: boolean;
      game?: Game;
    }>(`/rooms/${roomId}/ready`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 离开房间
   */
  async leaveRoom(
    roomId: number,
    data: {
      player_id: string;
    }
  ): Promise<{ success: boolean }> {
    return fetchApi<{ success: boolean }>(`/rooms/${roomId}/leave`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 坐下（选择座位）
   */
  async sitDown(
    roomId: number,
    data: {
      player_id: string;
      seat: number;
    }
  ): Promise<{ player: Player; success: boolean }> {
    return fetchApi<{ player: Player; success: boolean }>(
      `/rooms/${roomId}/sit`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * 离开座位
   */
  async standUp(
    roomId: number,
    data: {
      player_id: string;
    }
  ): Promise<{ player: Player; success: boolean }> {
    return fetchApi<{ player: Player; success: boolean }>(
      `/rooms/${roomId}/stand`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },
};

/**
 * 游戏 API
 */
export const gameApi = {
  /**
   * 创建游戏
   */
  async createGame(data: {
    room_id: number;
    player1_id: string;
    player2_id: string;
    player1_target: string;
    player2_target: string;
    digit_count: number;
  }): Promise<{ game: Game }> {
    return fetchApi<{ game: Game }>('/games', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 获取游戏详情
   */
  async getGame(gameId: number): Promise<{
    game: Game;
    guesses: Guess[];
  }> {
    return fetchApi<{
      game: Game;
      guesses: Guess[];
    }>(`/games/${gameId}`);
  },

  /**
   * 提交猜测
   */
  async submitGuess(
    gameId: number,
    data: {
      guesser_id: string;
      guess: string;
    }
  ): Promise<{
    guess: Guess;
    gameStatus: 'playing' | 'completed';
    winner_id: string | null;
  }> {
    return fetchApi<{
      guess: Guess;
      gameStatus: 'playing' | 'completed';
      winner_id: string | null;
    }>(`/games/${gameId}/guess`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * 统计 API
 */
export const statsApi = {
  /**
   * 获取玩家统计
   */
  async getStats(playerId: string): Promise<Stats> {
    return fetchApi<Stats>(`/stats?player_id=${playerId}`);
  },

  /**
   * 获取游戏历史记录
   */
  async getHistory(playerId: string): Promise<{ history: GameHistory[] }> {
    return fetchApi<{ history: GameHistory[] }>(
      `/stats/history?player_id=${playerId}`
    );
  },
};

/**
 * 工具函数：计算撞对数
 * @param guess 猜测的数字
 * @param target 目标数字
 * @returns 撞对数（位置和数字都正确的个数）
 */
export function calculateHitCount(guess: string, target: string): number {
  let hitCount = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      hitCount++;
    }
  }
  return hitCount;
}

/**
 * 工具函数：生成随机目标数字
 * @param digitCount 数字位数
 * @returns 不重复数字的随机数
 */
export function generateTargetNumber(digitCount: number): string {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const result: string[] = [];
  
  for (let i = 0; i < digitCount; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    result.push(digits[randomIndex]);
    digits.splice(randomIndex, 1);
  }
  
  return result.join('');
}

/**
 * 工具函数：验证猜测输入
 * @param guess 猜测的数字
 * @param digitCount 要求的位数
 * @returns 验证结果
 */
export function validateGuess(
  guess: string,
  digitCount: number
): { valid: boolean; error?: string } {
  if (guess.length !== digitCount) {
    return { valid: false, error: `请输入${digitCount}位数字` };
  }

  if (!/^\d+$/.test(guess)) {
    return { valid: false, error: '只能输入数字' };
  }

  const hasDuplicates = new Set(guess.split('')).size !== digitCount;
  if (hasDuplicates) {
    return { valid: false, error: '数字不能重复' };
  }

  return { valid: true };
}

// 创建 API 对象
const gameApiClient = {
  room: roomApi,
  game: gameApi,
  stats: statsApi,
  utils: {
    calculateHitCount,
    generateTargetNumber,
    validateGuess,
  },
};

// 导出所有 API
export default gameApiClient;
