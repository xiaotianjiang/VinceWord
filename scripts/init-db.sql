-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建菜单表
CREATE TABLE IF NOT EXISTS menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES menus(id),
  seq INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户菜单权限表
CREATE TABLE IF NOT EXISTS user_menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, menu_id)
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建比赛表
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'completed', 'cancelled')),
  player1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_number TEXT NOT NULL,
  current_player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建游戏回合表
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  guess_number TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建游戏聊天表
CREATE TABLE IF NOT EXISTS game_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_rounds_game ON game_rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_game_chats_game ON game_chats(game_id);

-- 插入默认菜单
INSERT INTO menus (name, path, icon, seq) VALUES 
('首页', '/', 'home', 1),
('聊天', '/chat', 'message-square', 2),
('世界聊天', '/chat/global', 'globe', 3),
('好友聊天', '/chat/friends', 'users', 4),
('我发4', '/game', 'gamepad', 5),
('用户管理', '/admin/users', 'user-cog', 6),
('菜单管理', '/admin/menus', 'menu', 7)
ON CONFLICT DO NOTHING;

-- 创建管理员账号（密码：admin123）
INSERT INTO users (email, username, password_hash, role) VALUES 
('admin@vinceword.com', 'admin', '$2b$10$WYzQtcKlhOsn0pM7iS8WFO76irWt1DDGxp4YikM//aQ3g4VsNru/u', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 给管理员分配所有菜单权限
INSERT INTO user_menus (user_id, menu_id)
SELECT 
  (SELECT id FROM users WHERE email = 'admin@vinceword.com'),
  id 
FROM menus
ON CONFLICT DO NOTHING;