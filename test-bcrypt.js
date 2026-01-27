const bcrypt = require('bcryptjs');

async function testBcrypt() {
  const password = 'admin123';
  const dbHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  
  console.log('测试 bcrypt 功能:');
  console.log('密码:', password);
  console.log('数据库哈希:', dbHash);
  
  // 验证数据库中的哈希
  const isValid = await bcrypt.compare(password, dbHash);
  console.log('数据库哈希验证结果:', isValid);
  
  // 生成新哈希并验证
  const newHash = await bcrypt.hash(password, 10);
  console.log('新生成的哈希:', newHash);
  
  const isNewValid = await bcrypt.compare(password, newHash);
  console.log('新哈希验证结果:', isNewValid);
}

testBcrypt().catch(console.error);