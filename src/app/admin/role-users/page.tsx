'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PermissionGuard from '@/components/PermissionGuard';

export default function RoleUsersPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoleInfo, setUserRoleInfo] = useState({ roleType: '', roleId: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchAuthorizedUsers(selectedRole);
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

  const fetchAuthorizedUsers = async (roleId: string) => {
    setError('');
    const token = localStorage.getItem('auth-token');
    const response = await fetch(`/api/admin/role-users/${roleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      setAuthorizedUsers(data.users);
      setSelectedUsers(data.users.map((u: any) => u.id));
    } else {
      setError(data.error || '获取授权用户失败');
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }
    const token = localStorage.getItem('auth-token');
    const response = await fetch(`/api/admin/users/search?keyword=${encodeURIComponent(searchKeyword)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      setSearchResults(data.users);
    }
  };

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSave = async () => {
    setError('');
    const token = localStorage.getItem('auth-token');
    const response = await fetch(`/api/admin/role-users/${selectedRole}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userIds: selectedUsers })
    });
    
    const data = await response.json();
    if (response.ok) {
      alert('授权成功');
      await fetchAuthorizedUsers(selectedRole);
    } else {
      setError(data.error || '授权失败');
    }
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
            <h1 className="text-2xl font-bold text-gray-800">角色用户授权</h1>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-4">搜索用户</h2>
                    <div className="mb-4">
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="搜索账号、用户名或邮箱"
                      />
                      <button
                        onClick={handleSearch}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        搜索
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                      {searchResults.length > 0 ? (
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">选择</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">账号</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">用户名</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">邮箱</th>
                            </tr>
                          </thead>
                          <tbody>
                            {searchResults.map(user => (
                              <tr 
                                key={user.id} 
                                className={`border-t ${selectedUsers.includes(user.id) ? 'bg-blue-50' : ''}`}
                              >
                                <td className="px-4 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.id)}
                                    onChange={() => handleToggleUser(user.id)}
                                  />
                                </td>
                                <td className="px-4 py-2 text-sm">{user.usercode}</td>
                                <td className="px-4 py-2 text-sm">{user.username}</td>
                                <td className="px-4 py-2 text-sm">{user.email}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          {searchKeyword ? '未找到匹配的用户' : '请输入关键词搜索'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold mb-4">已授权用户</h2>
                    <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                      {authorizedUsers.length > 0 ? (
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">选择</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">账号</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">用户名</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">邮箱</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                            </tr>
                          </thead>
                          <tbody>
                            {authorizedUsers.map(user => (
                              <tr 
                                key={user.id} 
                                className={`border-t ${selectedUsers.includes(user.id) ? 'bg-blue-50' : ''}`}
                              >
                                <td className="px-4 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.id)}
                                    onChange={() => handleToggleUser(user.id)}
                                  />
                                </td>
                                <td className="px-4 py-2 text-sm">{user.usercode}</td>
                                <td className="px-4 py-2 text-sm">{user.username}</td>
                                <td className="px-4 py-2 text-sm">{user.email}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-1 text-xs rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {user.status === 'active' ? '活跃' : '禁用'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          该角色暂无授权用户
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedRole && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    保存授权
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </PermissionGuard>
  );
}
