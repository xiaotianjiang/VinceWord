'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PermissionGuard from '@/components/PermissionGuard';

export default function RoleMenuPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoleInfo, setUserRoleInfo] = useState({ roleType: '', roleId: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRoleMenus(selectedRole);
    }
  }, [selectedRole]);

  const filterRoles = (roles: any[], excludeRoleId: string): any[] => {
    return roles
      .filter(r => r.id !== excludeRoleId)
      .map(r => ({
        ...r,
        children: r.children ? filterRoles(r.children, excludeRoleId) : []
      }))
      .filter(r => r.children.length > 0 || r.id !== excludeRoleId);
  };

  const fetchRoles = async () => {
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/admin/roles', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      if (data.userRoleInfo) {
        setUserRoleInfo(data.userRoleInfo);
        // 只有非超级管理员才过滤掉当前用户的角色
        if (data.userRoleInfo.roleType !== 'superadmin') {
          const filteredRoles = filterRoles(data.roles, data.userRoleInfo.roleId);
          setRoles(filteredRoles);
        } else {
          setRoles(data.roles);
        }
      } else {
        setRoles(data.roles);
      }
    }
    setLoading(false);
  };

  const fetchRoleMenus = async (roleId: string) => {
    setError('');
    const token = localStorage.getItem('auth-token');
    const response = await fetch(`/api/admin/role-menus/${roleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      setMenus(data.menus);
    } else {
      setError(data.error || '获取菜单失败');
    }
  };

  const handleSave = async () => {
    setError('');
    const token = localStorage.getItem('auth-token');
    const menuIds = menus.flatMap(m => getAuthorizedMenuIds(m));
    
    const response = await fetch(`/api/admin/role-menus/${selectedRole}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ menuIds })
    });
    
    const data = await response.json();
    if (response.ok) {
      alert('授权成功');
    } else {
      setError(data.error || '授权失败');
    }
  };

  const getAuthorizedMenuIds = (menu: any): string[] => {
    let ids: string[] = [];
    if (menu.targetAuthorized) {
      ids.push(menu.id);
    }
    if (menu.children) {
      menu.children.forEach((child: any) => {
        ids = ids.concat(getAuthorizedMenuIds(child));
      });
    }
    return ids;
  };

  const toggleMenu = (menu: any, menusList: any[]): any[] => {
    return menusList.map(m => {
      if (m.id === menu.id) {
        const updated = { ...m, targetAuthorized: !m.targetAuthorized };
        if (updated.children) {
          updated.children = updated.children.map((child: any) => ({ ...child, targetAuthorized: updated.targetAuthorized }));
        }
        return updated;
      }
      if (m.children) {
        return { ...m, children: toggleMenu(menu, m.children) };
      }
      return m;
    });
  };

  const handleToggle = (menu: any) => {
    setMenus(toggleMenu(menu, menus));
  };

  const renderMenuTree = (menuList: any[], depth = 0) => {
    return menuList.map(menu => (
      <div key={menu.id} className="border-l-2 border-gray-200 pl-4 ml-4">
        <div 
          className={`flex items-center justify-between py-2 cursor-pointer ${menu.targetAuthorized ? 'bg-blue-50' : ''}`}
          onClick={() => handleToggle(menu)}
        >
          <div style={{ paddingLeft: `${depth * 16}px` }}>
            <input
              type="checkbox"
              checked={menu.targetAuthorized}
              onChange={() => {}}
              className="mr-2"
            />
            <span className="mr-2">{menu.icon}</span>
            <span className="font-medium">{menu.name}</span>
            {!menu.userAuthorized && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">无权授权</span>
            )}
          </div>
        </div>
        {menu.children && menu.children.length > 0 && renderMenuTree(menu.children, depth + 1)}
      </div>
    ));
  };

  const renderRoleTree = (roleList: any[], depth = 0) => {
    return roleList.map(role => {
      const indentStyle = { paddingLeft: `${depth * 16}px` };
      const prefix = depth > 0 ? '\u2514\u2500 ' : '';
      
      return (
        <div key={role.id}>
          <option value={role.id} style={indentStyle}>
            {prefix}{role.name}
            {role.type === 'superadmin' && ' (超级管理员)'}
            {role.type === 'admin' && ' (管理员)'}
            {role.type === 'user' && ' (普通用户)'}
          </option>
          {role.children && role.children.length > 0 && renderRoleTree(role.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <PermissionGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">角色菜单授权</h1>
            <div className="text-sm text-gray-500">
              当前角色: {userRoleInfo.roleType === 'superadmin' ? '超级管理员' : 
                        userRoleInfo.roleType === 'admin' ? '管理员' : '普通用户'}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择角色 
                  {userRoleInfo.roleType !== 'superadmin' && (
                    <span className="text-gray-400">（只能选择自己角色下的子角色）</span>
                  )}
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">请选择角色</option>
                  {renderRoleTree(roles)}
                </select>
              </div>

              {selectedRole && (
                <div>
                  {menus.length > 0 ? (
                    <>
                      <h2 className="text-lg font-semibold mb-4">
                        菜单授权 
                        {userRoleInfo.roleType !== 'superadmin' && (
                          <span className="text-gray-400 font-normal ml-2">（只能看到已授权的菜单）</span>
                        )}
                      </h2>
                      {renderMenuTree(menus)}
                      <div className="mt-6 flex justify-end">
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          保存授权
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {userRoleInfo.roleType !== 'superadmin' ? (
                        <p>当前角色没有已授权的菜单，请联系超级管理员授权</p>
                      ) : (
                        <p>暂无菜单数据</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </PermissionGuard>
  );
}
