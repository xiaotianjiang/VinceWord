'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/session';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome to VinceWord
          </h1>
          <p className="text-lg text-gray-600">
            一个实时聊天应用，连接你与世界
          </p>
        </header>

        <div className="max-w-2xl mx-auto">
          {user ? (
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                欢迎回来, {user.username}!
              </h2>
              <div className="space-y-4">
                <Link
                  href="/chat"
                  className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  开始聊天
                </Link>
                <Link
                  href="/game"
                  className="inline-block ml-4 bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  玩我发4
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="inline-block ml-4 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    管理后台
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-8">
                加入我们的聊天社区
              </h2>
              <div className="space-x-4">
                <Link
                  href="/login"
                  className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="inline-block bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
                >
                  注册
                </Link>
              </div>
            </div>
          )}

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">实时聊天</h3>
              <p className="text-gray-600">
                与世界各地的用户实时交流，支持一对一和群组聊天
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">安全加密</h3>
              <p className="text-gray-600">
                所有通信都经过加密处理，保护您的隐私和安全
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">多平台支持</h3>
              <p className="text-gray-600">
                支持Web、移动端等多种设备，随时随地保持连接
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}