// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { getCurrentUser } from '@/lib/session';
import { User } from '@/types';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 检查 localStorage 中的 token
        const token = localStorage.getItem('auth-token');
        
        if (!token) {
          setTokenStatus('invalid');
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        // 强制调用后端接口验证 token 是否存在于数据库
        const response = await fetch('/api/auth/login', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            // Token 验证成功，保存用户信息到 localStorage
            localStorage.setItem('user-info', JSON.stringify(data.user));
            setTokenStatus('valid');
            setCurrentUser(data.user);
          } else {
            setTokenStatus('invalid');
            setCurrentUser(null);
          }
        } else {
          // Token 验证失败（不存在、过期或无效）
          const errorData = await response.json();
          console.error('Token 验证失败:', errorData.error);
          
          // 清除无效的 token
          localStorage.removeItem('auth-token');
          localStorage.removeItem('user-info');
          
          setTokenStatus('expired');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('登录状态检查失败:', error);
        setTokenStatus('invalid');
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const stats = [
    { title: '用户总数', value: '1,234', icon: '👥', color: 'bg-blue-500' },
    { title: '在线用户', value: '45', icon: '🟢', color: 'bg-green-500' },
    { title: '游戏次数', value: '5,678', icon: '🎮', color: 'bg-purple-500' },
    { title: '工具使用', value: '9,876', icon: '🔧', color: 'bg-yellow-500' }
  ];

  const features = [
    { name: '用户管理', icon: '👥', description: '管理系统用户', link: '/admin/users' },
    { name: '角色管理', icon: '👤', description: '管理用户角色', link: '/admin/roles' },
    { name: '菜单管理', icon: '📋', description: '管理系统菜单', link: '/admin/menu' },
    { name: 'Token管理', icon: '🔑', description: '管理用户Token', link: '/admin/tokens' },
  ];

  const isAdmin = currentUser?.roles?.some(r => r.type === 'admin' || r.type === 'superadmin');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <section className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">欢迎来到 VinceWord</h1>
              <p className="text-gray-600 text-lg">一个功能强大的综合平台</p>
              
              {/* Token 状态显示 */}
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-sm text-gray-500">登录状态:</span>
                {tokenStatus === 'valid' && (
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm text-green-600">已登录</span>
                  </span>
                )}
                {tokenStatus === 'expired' && (
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span className="text-sm text-yellow-600">登录已过期</span>
                  </span>
                )}
                {tokenStatus === 'invalid' && (
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    <span className="text-sm text-gray-500">未登录</span>
                  </span>
                )}
              </div>
            </section>

        {isAdmin && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">数据概览</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-700">{stat.title}</h3>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                      <span className="text-2xl">{stat.icon}</span>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">快速导航</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="/games" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <span className="text-3xl">🎮</span>
                <div>
                  <h3 className="font-semibold text-gray-800">游戏中心</h3>
                  <p className="text-sm text-gray-500">多种有趣的小游戏</p>
                </div>
              </div>
            </a>
            <a href="/tools" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <span className="text-3xl">🔧</span>
                <div>
                  <h3 className="font-semibold text-gray-800">工具中心</h3>
                  <p className="text-sm text-gray-500">实用工具等你来用</p>
                </div>
              </div>
            </a>
            {isAdmin && (
              <>
                <a href="/admin" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">⚙️</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">管理后台</h3>
                      <p className="text-sm text-gray-500">系统管理功能</p>
                    </div>
                  </div>
                </a>
                <a href="/auth/invite-code" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">🎟️</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">邀请码管理</h3>
                      <p className="text-sm text-gray-500">生成和管理邀请码</p>
                    </div>
                  </div>
                </a>
              </>
            )}
          </div>
        </section>
          </>
        )}
      </main>
    </div>
  );
}
