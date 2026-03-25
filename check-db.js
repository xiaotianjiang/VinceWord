const { createClient } = require('@supabase/supabase-js');

// 替换为你的Supabase配置
const supabaseUrl = 'http://localhost:54321';
const supabaseAnonKey = 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndAddCreatorColumn() {
  try {
    // 尝试获取用户表的结构
    console.log('Checking vw_users table structure...');
    
    // 尝试查询一个用户，看看是否有creator字段
    const { data, error } = await supabase
      .from('vw_users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying users:', error);
    } else if (data && data.length > 0) {
      console.log('User data:', data[0]);
      console.log('Columns in vw_users:', Object.keys(data[0]));
    }
    
    // 尝试添加creator字段
    console.log('\nAttempting to add creator column...');
    
    // 注意：在Supabase中，你需要使用SQL来添加列
    // 这里我们使用一个简单的方法来测试
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndAddCreatorColumn();