'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/session';

export default function Chat() {
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">请先登录</p>
          <Link href="/login" className="text-blue-500 hover:text-blue-700">
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">聊天</h1>
          <p className="text-gray-600">选择聊天类型开始交流</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/chat/global">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🌍</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">世界聊天</h3>
                <p className="text-gray-600">与所有在线用户实时聊天</p>
              </div>
            </div>
          </Link>

          <Link href="/chat/friends">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">好友聊天</h3>
                <p className="text-gray-600">与好友进行一对一私密聊天</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-500 hover:text-blue-700">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}