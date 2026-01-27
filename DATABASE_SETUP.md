# 数据库设置指南

## 1. Supabase 项目创建

1. 访问 [Supabase](https://supabase.com/) 并创建账号
2. 创建一个新项目
3. 获取项目URL和匿名密钥

## 2. 环境变量配置

在 `.env.local` 文件中配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. 数据库初始化

在 Supabase SQL 编辑器中执行 `scripts/init-db.sql` 文件：

### 手动执行步骤

1. 登录 Supabase 控制台
2. 进入 SQL Editor
3. 复制 `scripts/init-db.sql` 的内容
4. 执行 SQL 语句

### 创建的表格

- `users` - 用户表
- `menus` - 菜单表  
- `user_menus` - 用户菜单权限表
- `messages` - 消息表

### 默认数据

- 默认管理员账号: admin@vinceword.com / admin123
- 默认菜单项: 首页、聊天、世界聊天、好友聊天、用户管理、菜单管理

## 4. 验证设置

1. 启动应用: `npm run dev`
2. 访问 http://localhost:3000
3. 使用管理员账号登录测试
4. 注册新用户测试

## 5. 故障排除

### 常见问题

1. **连接错误**: 检查环境变量是否正确
2. **表不存在**: 确保执行了初始化SQL
3. **认证失败**: 检查Supabase项目设置

### 重新初始化

如果需要重新初始化数据库，可以先删除所有表，然后重新执行初始化SQL。