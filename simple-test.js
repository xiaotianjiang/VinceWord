const bcrypt = require('bcryptjs');

// 使用一个已知的正确哈希
const testHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

bcrypt.compare('admin123', testHash)
  .then(result => console.log('测试结果:', result))
  .catch(err => console.error('错误:', err));