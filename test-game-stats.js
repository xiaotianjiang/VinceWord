// 测试游戏房间战绩显示功能
// 运行: node test-game-stats.js

const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'your_supabase_url';
const supabaseKey = process.env.SUPABASE_KEY || 'your_supabase_key';

if (supabaseUrl === 'your_supabase_url' || supabaseKey === 'your_supabase_key') {
  console.log('请设置SUPABASE_URL和SUPABASE_KEY环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGameStats() {
  console.log('=== 测试游戏房间战绩功能 ===');
  
  try {
    // 获取一个正在进行或已完成的游戏
    const { data: games, error } = await supabase
      .from('games')
      .select('*, player1:users!player1_id(*), player2:users!player2_id(*)')
      .in('status', ['playing', 'completed'])
      .limit(1);
    
    if (error) {
      console.error('获取游戏错误:', error);
      return;
    }
    
    if (!games || games.length === 0) {
      console.log('没有找到进行中或已完成的游戏');
      console.log('请先创建一些游戏并完成它们以生成统计数据');
      return;
    }
    
    const game = games[0];
    console.log('\n游戏信息:');
    console.log(`游戏名称: ${game.name}`);
    console.log(`状态: ${game.status}`);
    
    if (game.player1) {
      console.log('\n玩家1统计:');
      console.log(`用户名: ${game.player1.username}`);
      console.log(`总游戏数: ${game.player1.total_games || 0}`);
      console.log(`胜场: ${game.player1.wins || 0}`);
      const winRate1 = game.player1.total_games > 0 
        ? ((game.player1.wins || 0) / game.player1.total_games * 100).toFixed(1)
        : 0;
      console.log(`胜率: ${winRate1}%`);
    }
    
    if (game.player2) {
      console.log('\n玩家2统计:');
      console.log(`用户名: ${game.player2.username}`);
      console.log(`总游戏数: ${game.player2.total_games || 0}`);
      console.log(`胜场: ${game.player2.wins || 0}`);
      const winRate2 = game.player2.total_games > 0 
        ? ((game.player2.wins || 0) / game.player2.total_games * 100).toFixed(1)
        : 0;
      console.log(`胜率: ${winRate2}%`);
    }
    
    console.log('\n=== 测试完成 ===');
    console.log('现在在游戏房间中可以看到双方玩家的战绩统计了！');
    
  } catch (err) {
    console.error('测试错误:', err);
  }
}

testGameStats();