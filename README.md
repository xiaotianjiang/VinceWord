# VinceWord Chat App

一个基于 Next.js 和 Supabase 构建的实时聊天应用，支持一对一好友聊天和世界聊天功能。

## 功能特性

- ✅ 用户注册和登录（邮箱+密码）
- ✅ 密码加密存储
- ✅ 世界聊天（所有用户可见的公共聊天室）
- ✅ 好友聊天（一对一私密聊天）
- ✅ 管理员后台管理
- ✅ 用户权限管理
- ✅ 菜单权限控制
- ✅ 响应式设计

## 技术栈

- **前端**: Next.js 14, React 18, TypeScript
- **样式**: Tailwind CSS
- **后端**: Supabase (PostgreSQL)
- **认证**: bcryptjs 密码加密
- **实时通信**: Supabase Realtime

## 快速开始

### 1. 环境配置

复制环境变量文件：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 文件，填入你的 Supabase 配置：

```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

### 2. 安装依赖

```bash
npm install
```

### 3. 初始化数据库

在 Supabase 控制台中执行 `scripts/init-db.sql` 文件来创建表和初始化数据。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 默认账号

系统会自动创建一个管理员账号：

- **邮箱**: admin@vinceword.com
- **密码**: admin123
- **角色**: 管理员

## 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── admin/          # 管理后台
│   ├── chat/           # 聊天功能
│   ├── login/          # 登录页面
│   ├── register/       # 注册页面
│   └── logout/         # 登出页面
├── components/         # 可复用组件
├── lib/               # 工具函数和配置
│   ├── auth.ts        # 认证相关函数
│   ├── session.ts     # 会话管理
│   └── supabase.ts    # Supabase客户端
└── types/             # TypeScript类型定义
```

## 数据库结构

### 用户表 (users)
- `id`: 用户ID (UUID)
- `email`: 邮箱 (唯一)
- `username`: 用户名 (唯一)
- `password_hash`: 加密后的密码
- `role`: 用户角色 (admin/user)
- `created_at`: 创建时间
- `updated_at`: 更新时间

### 菜单表 (menus)
- `id`: 菜单ID (UUID)
- `name`: 菜单名称
- `path`: 菜单路径
- `icon`: 菜单图标
- `parent_id`: 父菜单ID
- `order`: 排序
- `created_at`: 创建时间
- `updated_at`: 更新时间

### 用户菜单权限表 (user_menus)
- `id`: 权限ID (UUID)
- `user_id`: 用户ID
- `menu_id`: 菜单ID
- `created_at`: 创建时间

### 消息表 (messages)
- `id`: 消息ID (UUID)
- `sender_id`: 发送者ID
- `receiver_id`: 接收者ID (为空表示世界聊天)
- `content`: 消息内容
- `message_type`: 消息类型 (text/image/file)
- `created_at`: 创建时间

## 开发说明

### 添加新功能

1. 在 `src/types/index.ts` 中添加类型定义
2. 在相应的页面目录中创建组件
3. 在 `src/lib/` 中添加相关的工具函数
4. 更新数据库结构（如果需要）

### 样式规范

使用 Tailwind CSS 进行样式开发，遵循响应式设计原则。

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 使用 Prettier 进行代码格式化

## 部署

### Vercel 部署

1. 连接你的 GitHub 仓库到 Vercel
2. 配置环境变量
3. 自动部署

### 其他平台

确保配置正确的环境变量和构建命令。

## 许可证

MIT License