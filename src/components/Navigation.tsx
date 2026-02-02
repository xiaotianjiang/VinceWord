'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/session';

export default function Navigation() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const eventHandlerRef = useRef<((event: CustomEvent<User | null>) => void) | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    
    // 清理之前的事件监听器
    if (eventHandlerRef.current) {
      window.removeEventListener('userChanged', eventHandlerRef.current);
    }
    
    // 监听用户变化事件
    const handleUserChanged = (event: CustomEvent<User | null>) => {
      setCurrentUser(event.detail);
    };
    
    eventHandlerRef.current = handleUserChanged;
    window.addEventListener('userChanged', handleUserChanged);
    
    return () => {
      if (eventHandlerRef.current) {
        window.removeEventListener('userChanged', eventHandlerRef.current);

      }
    };
  }, []);

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="text-xl font-bold text-gray-800">
            VinceWord
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-600 hover:text-gray-800">
              首页
            </Link>
            
            {currentUser && (
              <>
                <Link href="/chat" className="text-gray-600 hover:text-gray-800">
                  聊天
                </Link>
                <Link href="/game" className="text-gray-600 hover:text-gray-800">
                  我发4
                </Link>
                {currentUser.role === 'admin' && (
                  <Link href="/admin" className="text-gray-600 hover:text-gray-800">
                    管理
                  </Link>
                )}
              </>
            )}

            {currentUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">欢迎, {currentUser.username}</span>
                <Link 
                  href="/logout" 
                  className="bg-red-500 text-black px-3 py-1 rounded hover:bg-red-600"
                >
                  登出
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-gray-600 hover:text-gray-800">
                  登录
                </Link>
                <Link 
                  href="/register" 
                  className="bg-blue-500 text-black px-3 py-1 rounded hover:bg-blue-600"
                >
                  注册
                </Link>
              </div>
            )}
          </div>

          {/* 移动端菜单按钮 */}
          <button
            type="button"
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* 移动端菜单 */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="space-y-2">
              <Link href="/" className="block py-2 text-gray-600 hover:text-gray-800">
                首页
              </Link>
              
              {currentUser && (
                <>
                  <Link href="/chat" className="block py-2 text-gray-600 hover:text-gray-800">
                    聊天
                  </Link>
                  <Link href="/game" className="block py-2 text-gray-600 hover:text-gray-800">
                    我发4
                  </Link>
                  {currentUser.role === 'admin' && (
                    <Link href="/admin" className="block py-2 text-gray-600 hover:text-gray-800">
                      管理
                    </Link>
                  )}
                </>
              )}

              {currentUser ? (
                <>
                  <div className="py-2 text-gray-600">欢迎, {currentUser.username}</div>
                  <Link 
                    href="/logout" 
                    className="block py-2 text-red-500 hover:text-red-700"
                  >
                    登出
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="block py-2 text-gray-600 hover:text-gray-800">
                    登录
                  </Link>
                  <Link 
                    href="/register" 
                    className="block py-2 text-blue-500 hover:text-blue-700"
                  >
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}