'use client';

import Header from '@/components/Header';

export default function ToolsPage() {
  const tools = [
    { name: '计算器', icon: '🧮', description: '实用的计算器工具', link: '/tools/calculator' },
    { name: '密码生成器', icon: '🔐', description: '生成安全的密码', link: '/tools/password-generator' },
    { name: '日期笔记', icon: '📅', description: '记录重要日期', link: '/tools/date-note' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">工具中心</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <a
              key={index}
              href={tool.link}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <span className="text-4xl">{tool.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{tool.name}</h3>
                  <p className="text-gray-500">{tool.description}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
