'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/session';

export default function Admin() {
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
        </div>
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">无权限访问管理后台</p>
          <Link href="/" className="text-blue-500 hover:text-blue-700">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">管理后台</h1>
          <p className="text-gray-600">欢迎回来，管理员 {currentUser.username}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin/users">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">用户管理</h3>
                <p className="text-gray-600">管理用户账号和权限</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/menus">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">菜单管理</h3>
                <p className="text-gray-600">管理系统菜单和权限</p>
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