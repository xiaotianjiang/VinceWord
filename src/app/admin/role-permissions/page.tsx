'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

interface Menu {
  id: string;
  name: string;
  path: string;
  icon: string | null;
  parent_id: string | null;
  access_level: string;
  children?: Menu[];
}

export default function RolePermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('请先登录');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/roles?page=1&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
        if (data.data.length > 0 && !selectedRole) {
          setSelectedRole(data.data[0].id);
        }
      } else {
        setError('获取角色列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取角色列表错误:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  // 获取菜单列表
  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('请先登录');
        return;
      }

      const response = await fetch('/api/menus', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setMenus(data.data);
      } else {
        setError('获取菜单列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取菜单列表错误:', err);
    }
  };

  // 获取角色授权的菜单
  const fetchRoleMenus = async (roleId: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/role-menus/${roleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSelectedMenus(data.data);
      } else {
        setError('获取角色菜单失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取角色菜单错误:', err);
    }
  };

  // 保存角色授权的菜单
  const handleSave = async () => {
    if (!selectedRole) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('请先登录');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/admin/role-menus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roleId: selectedRole,
          menuIds: selectedMenus
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('菜单授权成功');
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setError(data.error || '菜单授权失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('保存角色菜单错误:', err);
    } finally {
      setSaving(false);
    }
  };

  // 处理菜单选择
  const handleMenuToggle = (menuId: string) => {
    setSelectedMenus(prev => {
      if (prev.includes(menuId)) {
        return prev.filter(id => id !== menuId);
      } else {
        return [...prev, menuId];
      }
    });
  };

  // 渲染菜单树
  const renderMenuTree = (menuList: Menu[], level: number = 0) => {
    return menuList.map(menu => (
      <div key={menu.id} className="mb-2">
        <div className="flex items-center space-x-2" style={{ marginLeft: `${level * 20}px` }}>
          <input
            type="checkbox"
            checked={selectedMenus.includes(menu.id)}
            onChange={() => handleMenuToggle(menu.id)}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
          />
          <span className="text-gray-700">{menu.icon ? menu.icon + ' ' : ''}{menu.name}</span>
          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${menu.access_level === 'show' ? 'bg-yellow-100 text-yellow-800' : menu.access_level === 'use' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {menu.access_level === 'show' ? 'Show' : menu.access_level === 'use' ? 'Use' : 'Admin'}
          </span>
        </div>
        {menu.children && menu.children.length > 0 && renderMenuTree(menu.children, level + 1)}
      </div>
    ));
  };

  useEffect(() => {
    fetchRoles();
    fetchMenus();
  }, [fetchRoles]);

  // 从URL参数中获取roleId并自动选择角色
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roleId = urlParams.get('roleId');
    if (roleId) {
      setSelectedRole(roleId);
    }
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRoleMenus(selectedRole);
    }
  }, [selectedRole]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">角色功能授权</h1>
          <p className="text-gray-600">为角色授权可使用的功能</p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-10">
              {error}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">选择角色</label>
                <select
                  value={selectedRole || ''}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择角色</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} {role.is_system && '(系统角色)'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRole && (
                <>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">选择功能菜单</h2>
                    <div className="border border-gray-200 rounded-md p-4 max-h-96 overflow-y-auto">
                      {menus.length > 0 ? (
                        renderMenuTree(menus)
                      ) : (
                        <div className="text-gray-500 text-center py-4">
                          暂无菜单数据
                        </div>
                      )}
                    </div>
                  </div>

                  {successMessage && (
                    <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-700">
                      {successMessage}
                    </div>
                  )}

                  <div className="flex justify-end space-x-4">
                    <Link href="/admin" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                      返回管理中心
                    </Link>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? '保存中...' : '保存授权'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/admin" className="text-blue-500 hover:text-blue-700">
            ← 返回管理中心
          </Link>
        </div>
      </div>
    </div>
  );
}
