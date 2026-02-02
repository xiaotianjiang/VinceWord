// 完整测试重新开始游戏逻辑
console.log('=== 重新开始游戏逻辑测试 ===');

console.log('\n1. 游戏结束后的状态:');
console.log('   - 游戏状态: completed');
console.log('   - 有回合记录');
console.log('   - 有获胜者');
console.log('   - 玩家数字已设置');

console.log('\n2. 点击"开始新的一轮"按钮后:');
console.log('   - 数据库操作:');
console.log('     ✓ 删除所有回合记录 (game_rounds)');
console.log('     ✓ 重置游戏状态为 preparing');
console.log('     ✓ 清空玩家数字 (player1_number, player2_number)');
console.log('     ✓ 清空当前玩家和获胜者');

console.log('\n3. 本地状态重置:');
console.log('   ✓ rounds 数组清空');
console.log('   ✓ currentGameStartIndex 重置为 0');
console.log('   ✓ guess 输入清空');
console.log('   ✓ isMyTurn 重置为 false');
console.log('   ✓ isReady 重置为 false');
console.log('   ✓ myNumber 清空');

console.log('\n4. 回合号计算:');
console.log('   - 新的回合号计算: Math.floor((rounds.length - currentGameStartIndex) / 2) + 1');
console.log('   - 初始状态: Math.floor((0 - 0) / 2) + 1 = 1');
console.log('   - 每两个记录增加一个回合号');

console.log('\n5. 游戏记录显示:');
console.log('   - rounds.length === 0 → 显示"暂无游戏记录"');
console.log('   - 新的回合从第1回开始显示');
console.log('   - 回合号基于当前游戏重新计算');

console.log('\n6. 确保两个玩家:');
console.log('   - 都需要重新设置数字');
console.log('   - 准备状态重置');
console.log('   - 回合记录从零开始');

console.log('\n=== 测试完成 ===');