'use client';

import { useState } from 'react';
import { loginUser } from '@/lib/auth';

export default function TestLogin() {
  const [email, setEmail] = useState('admin@vinceword.com');
  const [password, setPassword] = useState('admin123');
  const [result, setResult] = useState<string>('');

  const handleTest = async () => {
    setResult('测试中...');
    try {
      const user = await loginUser(email, password);
      if (user) {
        setResult(`登录成功: ${user.username} (${user.role})`);
      } else {
        setResult('登录失败');
      }
    } catch (error) {
      setResult(`错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">登录测试</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-1">邮箱:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block mb-1">密码:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          
          <button
            onClick={handleTest}
            className="w-full bg-blue-500 text-black py-2 px-4 rounded hover:bg-blue-600"
          >
            测试登录
          </button>
          
          {result && (
            <div className="p-3 bg-gray-100 rounded">
              <strong>结果:</strong> {result}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}