'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/session';

export default function FriendsChat() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        loadUsers(user.id);
      }
    };
    loadUser();
  }, []);

  const loadUsers = async (currentUserId: string) => {
    try {
      const response = await fetch('/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      const data = await response.json();
      if (response.ok && data.users) {
        setUsers(data.users.filter((user: User) => user.id !== currentUserId));
      }
    } catch (error) {
      console.error('获取用户列表错误:', error);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800">好友聊天</h1>
          <p className="text-gray-600">选择好友开始私密聊天</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-4">用户列表</h3>
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 rounded cursor-pointer hover:bg-gray-100 ${
                    selectedUser?.id === user.id ? 'bg-blue-100 border border-blue-300' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-black text-sm font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{user.username}</p>
                      <p className="text-xs text-gray-500">{user.email || '未设置邮箱'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            {selectedUser ? (
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-black font-bold">
                        {selectedUser.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedUser.username}</h3>
                      <p className="text-sm text-gray-500">{selectedUser.email || '未设置邮箱'}</p>
                    </div>
                  </div>
                </div>

                <div className="h-64 p-4 overflow-y-auto">
                  <div className="text-center text-gray-500 py-8">
                    <p>开始与 {selectedUser.username} 聊天</p>
                    <p className="text-sm mt-2">私密聊天功能即将上线</p>
                  </div>
                </div>

                <div className="p-4 border-t">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="输入消息..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      disabled
                    />
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      发送
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">选择好友开始聊天</h3>
                <p className="text-gray-600">从左侧用户列表中选择一个好友开始私密对话</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/chat" className="text-blue-500 hover:text-blue-700">
            ← 返回聊天选择
          </a>
        </div>
      </div>
    </div>
  );
}