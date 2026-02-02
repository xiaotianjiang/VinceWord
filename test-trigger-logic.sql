-- 测试数据库触发器逻辑
-- 这个脚本用于验证游戏结束时的统计更新逻辑

-- 1. 首先查看当前用户统计
SELECT id, username, total_games, wins, total_rounds FROM users;

-- 2. 创建一个测试游戏
INSERT INTO games (name, player1_id, player2_id, status) 
VALUES ('测试游戏', 
        (SELECT id FROM users WHERE username = 'admin'),
        (SELECT id FROM users WHERE username = 'Gino'),
        'completed');

-- 3. 设置获胜者
UPDATE games 
SET winner_id = (SELECT id FROM users WHERE username = 'admin')
WHERE name = '测试游戏';

-- 4. 添加一些回合记录
INSERT INTO game_rounds (game_id, player_id, guess_number, correct_count, round_number)
VALUES 
((SELECT id FROM games WHERE name = '测试游戏'), 
 (SELECT id FROM users WHERE username = 'admin'), '1234', 2, 1),
((SELECT id FROM games WHERE name = '测试游戏'), 
 (SELECT id FROM users WHERE username = 'Gino'), '5678', 1, 1),
((SELECT id FROM games WHERE name = '测试游戏'), 
 (SELECT id FROM users WHERE username = 'admin'), '1235', 3, 2);

-- 5. 再次查看用户统计，应该看到游戏数、胜场和回合数都增加了
SELECT id, username, total_games, wins, total_rounds FROM users;

-- 6. 清理测试数据
DELETE FROM game_rounds WHERE game_id IN (SELECT id FROM games WHERE name = '测试游戏');
DELETE FROM games WHERE name = '测试游戏';

-- 7. 重置用户统计（可选）
UPDATE users SET total_games = 0, wins = 0, total_rounds = 0;