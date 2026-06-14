'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PermissionGuard from '@/components/PermissionGuard';

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', code: '', description: '', type: '', parent_id: '' });
  const [userRoleInfo, setUserRoleInfo] = useState({ roleType: '', roleId: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/admin/roles', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      setRoles(data.roles);
      if (data.userRoleInfo) {
        setUserRoleInfo(data.userRoleInfo);
      }
    }
    setLoading(false);
  };

  const handleCreateRole = async () => {
    setError('');
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newRole)
    });
    const data = await response.json();
    if (response.ok) {
      setShowModal(false);
      setNewRole({ name: '', code: '', description: '', type: '', parent_id: '' });
      fetchRoles();
    } else {
      setError(data.error || '创建失败');
    }
  };

  const renderRoleTree = (rolesList: any[], depth = 0) => {
    return rolesList.map(role => (
      <div key={role.id} className="border-l-2 border-gray-200 pl-4 ml-4">
        <div className="flex items-center justify-between py-2">
          <div style={{ paddingLeft: `${depth * 16}px` }}>
            <span className="font-medium">{role.name}</span>
            <span className="text-gray-500 text-sm ml-2">({role.code})</span>
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              role.type === 'superadmin' ? 'bg-red-100 text-red-800' :
              role.type === 'admin' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {role.type === 'superadmin' ? '超级管理员' : 
               role.type === 'admin' ? '管理员' : '普通用户'}
            </span>
          </div>
        </div>
        {role.children && role.children.length > 0 && renderRoleTree(role.children, depth + 1)}
      </div>
    ));
  };

  const getAvailableRoleTypes = () => {
    if (userRoleInfo.roleType === 'superadmin') {
      return [
        { value: 'admin', label: '管理员' },
        { value: 'user', label: '普通用户' }
      ];
    }
    return [
      { value: 'user', label: '普通用户' }
    ];
  };

  const getAvailableParentRoles = () => {
    const flattenRoles = (list: any[], parentPath = '') => {
      let result: any[] = [];
      list.forEach(role => {
        result.push({
          id: role.id,
          name: parentPath ? `${parentPath} / ${role.name}` : role.name,
          type: role.type
        });
        if (role.children && role.children.length > 0) {
          result = result.concat(flattenRoles(role.children, parentPath ? `${parentPath} / ${role.name}` : role.name));
        }
      });
      return result;
    };
    
    if (userRoleInfo.roleType === 'superadmin') {
      return flattenRoles(roles);
    }
    return flattenRoles(roles);
  };

  return (
    <PermissionGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">角色管理</h1>
            <button
              onClick={() => {
                setNewRole({ 
                  name: '', 
                  code: '', 
                  description: '', 
                  type: userRoleInfo.roleType === 'superadmin' ? '' : 'user',
                  parent_id: userRoleInfo.roleType === 'superadmin' ? '' : userRoleInfo.roleId 
                });
                setError('');
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              创建角色
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">角色列表</h2>
                <span className="text-sm text-gray-500">
                  当前角色: {userRoleInfo.roleType === 'superadmin' ? '超级管理员' : 
                           userRoleInfo.roleType === 'admin' ? '管理员' : '普通用户'}
                </span>
              </div>
              {roles.length > 0 ? (
                renderRoleTree(roles)
              ) : (
                <div className="text-center py-8 text-gray-500">暂无角色</div>
              )}
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">创建角色</h3>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">角色名称 *</label>
                    <input
                      type="text"
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="角色名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">角色编码 *</label>
                    <input
                      type="text"
                      value={newRole.code}
                      onChange={(e) => setNewRole({ ...newRole, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="角色编码"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <textarea
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="描述"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                    <select
                      value={newRole.type}
                      onChange={(e) => setNewRole({ ...newRole, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">请选择类型</option>
                      {getAvailableRoleTypes().map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      父角色 
                      {userRoleInfo.roleType !== 'superadmin' && (
                        <span className="text-gray-400">(默认当前角色)</span>
                      )}
                    </label>
                    <select
                      value={newRole.parent_id}
                      onChange={(e) => setNewRole({ ...newRole, parent_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {userRoleInfo.roleType === 'superadmin' && (
                        <option value="">无</option>
                      )}
                      {getAvailableParentRoles().map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreateRole}
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
