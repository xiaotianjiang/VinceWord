# 玩家统计功能说明

## 功能概述

本功能实现了玩家游戏统计数据的自动跟踪和显示，包括：
- 总游戏数
- 获胜次数  
- 总回合数
- 胜率计算
- 平均每局回合数

## 数据库结构变更

### users表新增字段
```sql
total_games INTEGER DEFAULT 0  -- 总参与游戏数
wins INTEGER DEFAULT 0         -- 获胜次数
total_rounds INTEGER DEFAULT 0 -- 总回合数
```

### 自动统计更新机制

通过PostgreSQL触发器自动更新统计信息：

1. **触发器函数**: `update_user_game_stats()`
2. **触发时机**: 当游戏状态变为'completed'时
3. **更新逻辑**:
   - 为所有参与者增加总游戏数
   - 为获胜者增加胜场数
   - 为所有参与者增加该游戏的总回合数

## 前端界面

### UserStats组件
位置: `src/components/UserStats.tsx`

显示当前玩家的统计信息，包括：
- 总游戏数、胜场、胜率、总回合数
- 平均每局回合数
- 游戏表现评级（优秀/良好/需要提高）

### GameLobby集成
在游戏大厅显示好友的统计信息，方便玩家比较战绩。

### GameRoom集成
在游戏房间中显示双方玩家的实时战绩统计，包括：
- 总游戏数
- 胜场数  
- 胜率

玩家可以在游戏过程中随时查看对手的战绩信息。

## 使用说明

1. **数据库初始化**: 运行 `scripts/init-db.sql` 创建触发器和字段
2. **统计查看**: 进入游戏大厅即可看到个人和好友的统计信息
3. **自动更新**: 游戏结束后统计信息会自动更新

## 测试

运行测试脚本验证统计功能：
```bash
export SUPABASE_URL=your_url
export SUPABASE_KEY=your_key
node test-stats.js
```

## 注意事项

1. 触发器只在游戏状态从非'completed'变为'completed'时触发
2. 统计更新是异步的，可能需要短暂延迟才能看到最新数据
3. 如果手动修改数据库，请确保统计字段的一致性