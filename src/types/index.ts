export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: string;
  name: string;
  path: string;
  icon?: string;
  parent_id?: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface UserMenu {
  id: string;
  user_id: string;
  menu_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string; // 为空表示世界聊天
  content: string;
  message_type: 'text' | 'image' | 'file';
  created_at: string;
  sender?: {
    username: string;
  };
}

export interface Game {
  id: string;
  name: string;
  status: 'waiting' | 'preparing' | 'playing' | 'completed' | 'cancelled';
  player1_id: string;
  player2_id?: string;
  player1_number?: string;
  player2_number?: string;
  current_player_id?: string;
  winner_id?: string;
  created_at: string;
  updated_at: string;
  player1?: User;
  player2?: User;
  current_player?: User;
  winner?: User;
}

export interface GameRound {
  id: string;
  game_id: string;
  player_id: string;
  guess_number: string;
  correct_count: number;
  round_number: number;
  created_at: string;
  player?: User;
}

export interface GameChat {
  id: string;
  game_id: string;
  player_id: string;
  message: string;
  created_at: string;
  player?: User;
}