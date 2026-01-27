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