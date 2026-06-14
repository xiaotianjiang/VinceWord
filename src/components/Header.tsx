// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, logout } from '@/lib/session';
import { User } from '@/types';

export default function Header() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <a href="/" className="text-xl font-bold text-gray-800">VinceWord</a>
          </div>
          <nav className="flex items-center space-x-4">
            <a href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">首页</a>
            <a href="/games" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">游戏</a>
            <a href="/tools" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">工具</a>
            
            {isLoggedIn ? (
              <>
                <a href="/admin" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">管理后台</a>
                <div className="relative">
                  <button className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                    <span>{currentUser?.username}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  登出
                </button>
              </>
            ) : (
              <>
                <a href="/auth/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">登录</a>
                <a href="/auth/register" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">注册</a>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
