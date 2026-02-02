-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usercode TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 0,
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
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'preparing', 'playing', 'completed', 'cancelled')),
  player1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  player1_number TEXT,
  player2_number TEXT,
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
  round_number INTEGER NOT NULL DEFAULT 1,
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
CREATE INDEX IF NOT EXISTS idx_users_usercode ON users(usercode);
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
INSERT INTO users (usercode, email, username, password_hash, role) VALUES 
('admin', 'admin@vinceword.com', 'admin', '$2b$10$WYzQtcKlhOsn0pM7iS8WFO76irWt1DDGxp4YikM//aQ3g4VsNru/u', 'admin')
ON CONFLICT (usercode) DO NOTHING;
INSERT INTO users (usercode, email, username, password_hash, role) VALUES 
('Gino', 'Gino@vinceword.com', 'Gino', '$2b$10$WYzQtcKlhOsn0pM7iS8WFO76irWt1DDGxp4YikM//aQ3g4VsNru/u', 'admin')
ON CONFLICT (usercode) DO NOTHING;

-- 给管理员分配所有菜单权限
INSERT INTO user_menus (user_id, menu_id)
SELECT 
  (SELECT id FROM users WHERE email = 'admin@vinceword.com'),
  id 
FROM menus
ON CONFLICT DO NOTHING;

-- 创建更新用户游戏统计的函数
CREATE OR REPLACE FUNCTION update_user_game_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 当游戏状态变为 completed 时更新统计
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- 更新所有参与者的总游戏数
    IF NEW.player1_id IS NOT NULL THEN
      UPDATE users 
      SET total_games = total_games + 1,
          updated_at = NOW()
      WHERE id = NEW.player1_id;
    END IF;
    
    IF NEW.player2_id IS NOT NULL THEN
      UPDATE users 
      SET total_games = total_games + 1,
          updated_at = NOW()
      WHERE id = NEW.player2_id;
    END IF;
    
    -- 更新获胜者的胜场数
    IF NEW.winner_id IS NOT NULL THEN
      UPDATE users 
      SET wins = wins + 1,
          updated_at = NOW()
      WHERE id = NEW.winner_id;
    END IF;
    
    -- 更新总回合数
    UPDATE users u
    SET total_rounds = total_rounds + (
      SELECT COUNT(*) 
      FROM game_rounds 
      WHERE game_id = NEW.id
    ),
    updated_at = NOW()
    WHERE u.id IN (NEW.player1_id, NEW.player2_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_game_stats_trigger ON games;
CREATE TRIGGER update_game_stats_trigger
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_user_game_stats();