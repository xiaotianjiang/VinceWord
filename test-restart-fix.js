// 测试重新开始游戏的功能修复
// 这个脚本用于验证重新开始游戏时回合记录是否正确清空

console.log('测试重新开始游戏功能修复:');
console.log('1. 游戏结束后点击"开始新的一轮"按钮');
console.log('2. 系统应该：');
console.log('   - 清空数据库中的回合记录');
console.log('   - 重置游戏状态为准备中');
console.log('   - 清空本地回合状态');
console.log('   - 重置回合索引为0');
console.log('   - 重新加载游戏数据');
console.log('3. 新的游戏应该从回合1开始，没有之前的回合记录');

console.log('\n修复内容:');
console.log('- 在 restartGame 函数中添加了删除回合记录的数据库操作');
console.log('- 重置了所有相关的本地状态');
console.log('- 确保新的游戏从干净的状态开始');