'use client'

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { User } from '@/types';
import { getCurrentUser } from '@/lib/session';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // 当模块数据加载完成后，默认展开所有有子菜单的模块
  useEffect(() => {
    if (modules.length > 0) {
      const modulesWithChildren = modules.filter(module => module.children && module.children.length > 0);
      const moduleIds = new Set(modulesWithChildren.map(module => module.id));
      setExpandedModules(moduleIds);
    }
  }, [modules]);

  useEffect(() => {
    const fetchData = async () => {
      // 获取用户信息
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // 模拟通知数据
      if (user) {
        setNotifications([
          { id: 1, title: '系统通知', content: '欢迎回来！', type: 'info', read: false, timestamp: new Date().toISOString() },
          { id: 2, title: '权限更新', content: '您的权限已更新', type: 'success', read: true, timestamp: new Date(Date.now() - 86400000).toISOString() }
        ]);
      }
      
      // 获取菜单数据
      try {
        setLoading(true);
        setMenuError(null);
        
        const token = localStorage.getItem('auth-token');
        const headers: HeadersInit = {};
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch('/api/menus', {
          headers
        });
        
        const data = await response.json();
        if (data.success) {
          // 处理菜单数据，转换为功能模块格式
          const menuModules = data.data.map((menu: any) => ({
            id: menu.id,
            name: menu.name,
            icon: menu.icon || '📋',
            link: menu.path,
            children: menu.children || []
          }));
          setModules(menuModules);
        } else {
          setMenuError(data.error || '获取菜单失败');
        }
      } catch (error) {
        setMenuError('网络错误，请稍后重试');
        console.error('获取菜单错误:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // 轮播图自动切换
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prevIndex) => 
        (prevIndex + 1) % carouselItems.length
      );
    }, 5000); // 每5秒切换一次

    return () => clearInterval(interval); // 清除定时器
  }, [carouselItems.length]);

  // 模拟数据概览（只有管理员可见）
  const stats = [
    { title: '用户总数', value: '1,234', icon: '👥', color: 'bg-blue-500' },
    { title: '在线用户', value: '45', icon: '🟢', color: 'bg-green-500' },
    { title: '游戏次数', value: '5,678', icon: '🎮', color: 'bg-purple-500' },
    { title: '工具使用', value: '9,876', icon: '🔧', color: 'bg-yellow-500' }
  ];

  // 轮播图数据
  const carouselItems = [
    {
      id: 1,
      title: '欢迎使用 VinceWord',
      description: '一个功能强大的综合平台',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20tech%20platform%20dashboard%20with%20blue%20theme&image_size=landscape_16_9'
    },
    {
      id: 2,
      title: '游戏中心',
      description: '多种有趣的小游戏',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=game%20center%20interface%20with%20colorful%20game%20icons&image_size=landscape_16_9'
    },
    {
      id: 3,
      title: '工具中心',
      description: '实用工具等你来用',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tool%20center%20interface%20with%20various%20tool%20icons&image_size=landscape_16_9'
    }
  ];

  // 新闻数据
  const news = [
    {
      id: 1,
      title: '系统更新公告',
      content: 'VinceWord 系统已更新至最新版本，新增了多项功能和优化。',
      date: '2026-03-20',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=system%20update%20announcement%20with%20tech%20theme&image_size=square'
    },
    {
      id: 2,
      title: '新游戏上线',
      content: '全新的记忆翻牌游戏已上线，快来挑战你的记忆力吧！',
      date: '2026-03-18',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=memory%20card%20game%20interface&image_size=square'
    },
    {
      id: 3,
      title: '工具中心新增计算器',
      content: '工具中心新增了功能强大的计算器工具，支持多种计算功能。',
      date: '2026-03-15',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=calculator%20tool%20interface&image_size=square'
    }
  ];



  // 管理功能（只有管理员可见）
  const adminFeatures = [
    { name: '用户管理', icon: '👥', link: '/admin/users' },
    { name: '菜单管理', icon: '📋', link: '/admin/menu' },
    { name: '角色管理', icon: '👤', link: '/admin/roles' },
    { name: '角色菜单授权', icon: '⚙️', link: '/admin/role-menus' },
    { name: 'Token管理', icon: '🔑', link: '/admin/tokens' }
  ];

  // 检查用户是否为管理员
  const isAdmin = currentUser?.roles && currentUser.roles.some(role => role.type === 'admin' || role.type === 'superadmin');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header currentUser={currentUser} notifications={notifications} />
      <main className="flex-1">
        {/* 面包屑导航 */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">首页</span>
            </div>
          </div>
        </div>
        
        {/* 数据概览 */}
        {isAdmin && (
          <div className="container mx-auto px-4 py-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">数据概览</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
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
          </div>
        )}

        {/* 轮播图 */}
        <div className="container mx-auto px-4 py-6">
          <div className="relative overflow-hidden rounded-lg shadow-md mb-8">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentCarouselIndex * 100}%)` }}
            >
              {carouselItems.map((item, index) => (
                <div key={item.id} className="min-w-full">
                  <div className="relative h-64 sm:h-80">
                    <div className="w-full h-full relative">
                      <Image 
                        src={item.image} 
                        alt={item.title} 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex items-center">
                      <div className="px-8 text-white">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2">{item.title}</h2>
                        <p className="text-lg sm:text-xl">{item.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
              {carouselItems.map((item, index) => (
                <button 
                  key={item.id} 
                  className={`w-3 h-3 rounded-full transition-colors ${currentCarouselIndex === index ? 'bg-white' : 'bg-white/50 hover:bg-white'}`}
                  onClick={() => setCurrentCarouselIndex(index)}
                />
              ))}
            </div>
          </div>

          {/* 新闻板块 */}
          <h2 className="text-xl font-semibold text-gray-800 mb-4">最新动态</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {news.map((item, index) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="w-full h-48 relative">
                  <Image 
                    src={item.image} 
                    alt={item.title} 
                    fill 
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-2">{item.date}</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-4">{item.content}</p>
                  <button className="text-blue-600 hover:text-blue-800 font-medium">
                    阅读更多 →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 功能模块 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">功能模块</h2>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : menuError ? (
                <div className="text-red-600 text-center py-8">
                  {menuError}
                </div>
              ) : modules.length > 0 ? (
                <ul className="space-y-3">
                  {modules.map((module, index) => (
                    <li key={module.id}>
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors">
                        <a href={module.link} className="text-blue-600 hover:text-blue-800 flex items-center space-x-3">
                          <span className="text-xl">{module.icon}</span>
                          <span>{module.name}</span>
                        </a>
                        {module.children && module.children.length > 0 && (
                          <button
                            className="text-gray-400 transition-transform duration-300 hover:text-gray-600 focus:outline-none"
                            style={{ transform: expandedModules.has(module.id) ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedModules(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(module.id)) {
                                  newSet.delete(module.id);
                                } else {
                                  newSet.add(module.id);
                                }
                                return newSet;
                              });
                            }}
                          >
                            ▼
                          </button>
                        )}
                      </div>
                      {/* 子菜单 */}
                      {module.children && module.children.length > 0 && expandedModules.has(module.id) && (
                        <ul className="ml-8 mt-2 space-y-2">
                          {module.children.map((child: any) => (
                            <li key={child.id}>
                              <a href={child.path} className="text-gray-600 hover:text-blue-600 flex items-center space-x-2 p-1 rounded hover:bg-gray-50 transition-colors">
                                <span className="text-sm">{child.icon || '📄'}</span>
                                <span>{child.name}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  暂无功能模块
                </div>
              )}
            </div>

            {/* 管理功能 */}
            {isAdmin && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">管理功能</h2>
                <ul className="space-y-3">
                  {adminFeatures.map((feature, index) => (
                    <li key={index}>
                      <a href={feature.link} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
                        <span className="text-xl">{feature.icon}</span>
                        <span>{feature.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 用户信息 */}
            {currentUser && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">用户信息</h2>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">{currentUser.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{currentUser.username}</h3>
                    <p className="text-gray-600">{currentUser.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}