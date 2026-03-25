'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/session';

export default function ToolsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 工具分类和列表
  const toolCategories = [
    {
      id: 'productivity',
      name: '生产力工具',
      icon: '📋',
      tools: [
        { id: 'calculator', name: '计算器', description: '基本的数学计算工具' },
        { id: 'todo-list', name: '待办事项', description: '管理你的任务和待办事项' },
        { id: 'notes', name: '笔记工具', description: '快速记录和管理笔记' }
      ]
    },
    {
      id: 'utilities',
      name: '实用工具',
      icon: '🔧',
      tools: [
        { id: 'password-generator', name: '密码生成器', description: '生成安全的随机密码' },
        { id: 'text-converter', name: '文本转换', description: '文本大小写转换等功能' }
      ]
    },
    {
      id: 'entertainment',
      name: '娱乐工具',
      icon: '🎮',
      tools: [
        { id: 'randomizer', name: '随机选择器', description: '随机选择选项' },
        { id: 'dice-roller', name: '骰子模拟器', description: '模拟掷骰子' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">工具中心</h1>
          <p className="text-gray-600">选择你需要的工具开始使用</p>
        </header>

        {toolCategories.map((category) => (
          <div key={category.id} className="mb-8">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-2">{category.icon}</span>
              <h2 className="text-xl font-semibold text-gray-800">{category.name}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.tools.map((tool) => (
                <Link key={tool.id} href={`/tools/${tool.id}`}>
                  <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                    <h3 className="text-lg font-semibold mb-2">{tool.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{tool.description}</p>
                    <div className="flex justify-end">
                      <span className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        开始使用 →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-500 hover:text-blue-700">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
