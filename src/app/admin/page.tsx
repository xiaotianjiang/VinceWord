'use client';

import Header from '@/components/Header';
import PermissionGuard from '@/components/PermissionGuard';

export default function AdminPage() {
  const menuItems = [
    { name: '用户管理', icon: '👥', href: '/admin/users' },
    { name: '角色管理', icon: '👤', href: '/admin/roles' },
    { name: '菜单管理', icon: '📋', href: '/admin/menu' },
    { name: '角色菜单授权', icon: '⚙️', href: '/admin/role-menus' },
    { name: '角色用户授权', icon: '👥', href: '/admin/role-users' },
    { name: 'Token管理', icon: '🔑', href: '/admin/tokens' },
  ];

  return (
    <PermissionGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-8">管理后台</h1>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-lg font-semibold text-gray-800">{item.name}</span>
                </div>
              </a>
            ))}
          </div>
        </main>
      </div>
    </PermissionGuard>
  );
}
