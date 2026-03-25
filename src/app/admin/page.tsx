'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface MenuItem {
  title: string;
  icon: string;
  href: string;
  description: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 获取用户信息
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          setError('请先登录');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/auth/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        } else {
          setError('获取用户信息失败');
        }
      } catch (err) {
        setError('网络错误，请稍后重试');
        console.error('获取用户信息错误:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // 管理中心菜单
  const menuItems: MenuItem[] = [
    {
      title: '用户管理',
      icon: '👥',
      href: '/admin/users',
      description: '管理系统用户和权限'
    },
    {
      title: '角色管理',
      icon: '🎭',
      href: '/admin/roles',
      description: '管理系统角色和权限'
    },
    {
      title: '角色用户管理',
      icon: '👤',
      href: '/admin/role-users',
      description: '管理角色与用户的关联关系'
    },
    {
      title: '角色菜单授权',
      icon: '📋',
      href: '/admin/role-menus',
      description: '为角色授权可访问的菜单'
    },
    {
      title: '菜单管理',
      icon: '�️',
      href: '/admin/menu',
      description: '管理系统菜单和权限'
    },
    {
      title: 'Token管理',
      icon: '🔑',
      href: '/admin/tokens',
      description: '管理用户登录令牌'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/auth/login" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">管理中心</h1>
              <p className="text-gray-600">欢迎回来，{user?.username || '管理员'}</p>
            </div>
            <Link href="/auth/logout" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              退出登录
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => (
            <Link key={index} href={item.href} className="block">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h2>
                <p className="text-gray-600">{item.description}</p>
              </div>
            </Link>
          ))}
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
