// 简单的统计功能测试脚本
// 运行: node test-stats.js

const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'your_supabase_url';
const supabaseKey = process.env.SUPABASE_KEY || 'your_supabase_key';

if (supabaseUrl === 'your_supabase_url' || supabaseKey === 'your_supabase_key') {
  console.log('请设置SUPABASE_URL和SUPABASE_KEY环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStats() {
  console.log('=== 测试玩家统计功能 ===');
  
  try {
    // 获取一些用户来测试
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, total_games, wins, total_rounds')
      .limit(5);
    
    if (error) {
      console.error('获取用户错误:', error);
      return;
    }
    
    console.log('\n用户统计信息:');
    users.forEach(user => {
      const winRate = user.total_games > 0 
        ? ((user.wins || 0) / user.total_games * 100).toFixed(1) 
        : 0;
      console.log(`
${user.username}:
  总游戏数: ${user.total_games || 0}
  胜场: ${user.wins || 0}
  胜率: ${winRate}%
  总回合数: ${user.total_rounds || 0}`);
    });
    
    // 检查最近的游戏记录
    console.log('\n=== 检查最近的游戏 ===');
    const { data: recentGames } = await supabase
      .from('games')
      .select('id, name, status, player1_id, player2_id, winner_id')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (recentGames && recentGames.length > 0) {
      console.log('\n最近游戏:');
      recentGames.forEach(game => {
        console.log(`
游戏: ${game.name}
状态: ${game.status}
玩家1: ${game.player1_id}
玩家2: ${game.player2_id || '无'}
获胜者: ${game.winner_id || '无'}`);
      });
    }
    
    console.log('\n=== 测试完成 ===');
    console.log('要重新运行数据库初始化脚本以应用触发器更改:');
    console.log('psql -f scripts/init-db.sql');
    
  } catch (err) {
    console.error('测试错误:', err);
  }
}

testStats();