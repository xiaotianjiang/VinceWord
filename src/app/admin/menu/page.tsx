'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PermissionGuard from '@/components/PermissionGuard';

export default function MenuManagementPage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newMenu, setNewMenu] = useState({ name: '', icon: '', path: '', type: '', parent_id: '', order: 0 });

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/admin/menu', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      setMenus(data.menus);
    }
    setLoading(false);
  };

  const handleCreateMenu = async () => {
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/admin/menu', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newMenu)
    });
    const data = await response.json();
    if (response.ok) {
      setShowModal(false);
      setNewMenu({ name: '', icon: '', path: '', type: '', parent_id: '', order: 0 });
      fetchMenus();
    }
  };

  const renderMenuTree = (menuList: any[], depth = 0) => {
    return menuList.map(menu => (
      <div key={menu.id} className="border-l-2 border-gray-200 pl-4 ml-4">
        <div className="flex items-center justify-between py-2">
          <div style={{ paddingLeft: `${depth * 16}px` }}>
            <span className="mr-2">{menu.icon}</span>
            <span className="font-medium">{menu.name}</span>
            <span className="text-gray-500 text-sm ml-2">({menu.path})</span>
          </div>
          <span className="text-xs text-gray-500">{menu.type}</span>
        </div>
        {menu.children && menu.children.length > 0 && renderMenuTree(menu.children, depth + 1)}
      </div>
    ));
  };

  return (
    <PermissionGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">菜单管理</h1>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              创建菜单
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">菜单列表</h2>
              {renderMenuTree(menus)}
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">创建菜单</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">菜单名称</label>
                    <input
                      type="text"
                      value={newMenu.name}
                      onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="菜单名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                    <input
                      type="text"
                      value={newMenu.icon}
                      onChange={(e) => setNewMenu({ ...newMenu, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="图标"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">路径</label>
                    <input
                      type="text"
                      value={newMenu.path}
                      onChange={(e) => setNewMenu({ ...newMenu, path: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="路径"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                    <select
                      value={newMenu.type}
                      onChange={(e) => setNewMenu({ ...newMenu, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="directory">目录</option>
                      <option value="menu">菜单</option>
                      <option value="button">按钮</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                    <input
                      type="number"
                      value={newMenu.order}
                      onChange={(e) => setNewMenu({ ...newMenu, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreateMenu}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      创建
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </PermissionGuard>
  );
}
