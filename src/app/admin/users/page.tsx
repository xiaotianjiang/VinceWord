'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PermissionGuard from '@/components/PermissionGuard';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentUser, setCurrentUser] = useState({ 
    id: '',
    usercode: '', 
    username: '', 
    email: '', 
    phone: '', 
    password: '',
    status: 'active' 
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      setUsers(data.users);
    } else {
      setError(data.error || '获取用户列表失败');
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setError('');
    const token = localStorage.getItem('auth-token');
    const url = isEdit ? `/api/admin/users/${currentUser.id}` : '/api/admin/users';
    const method = isEdit ? 'PUT' : 'POST';
    
    const body = isEdit 
      ? { 
          username: currentUser.username, 
          email: currentUser.email, 
          phone: currentUser.phone, 
          status: currentUser.status,
          password: currentUser.password || undefined
        }
      : { 
          usercode: currentUser.usercode, 
          username: currentUser.username, 
          email: currentUser.email, 
          phone: currentUser.phone, 
          password: currentUser.password 
        };

    const response = await fetch(url, {
      method,
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (response.ok) {
      setShowModal(false);
      setCurrentUser({ id: '', usercode: '', username: '', email: '', phone: '', password: '', status: 'active' });
      setIsEdit(false);
      fetchUsers();
    } else {
      setError(data.error || (isEdit ? '更新失败' : '创建失败'));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？')) return;
    const token = localStorage.getItem('auth-token');
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      fetchUsers();
    }
  };

  const handleEditUser = (user: any) => {
    setCurrentUser({
      id: user.id,
      usercode: user.usercode,
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      password: '',
      status: user.status
    });
    setIsEdit(true);
    setShowModal(true);
    setError('');
  };

  const handleCreate = () => {
    setCurrentUser({ id: '', usercode: '', username: '', email: '', phone: '', password: '', status: 'active' });
    setIsEdit(false);
    setShowModal(true);
    setError('');
  };

  return (
    <PermissionGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              创建用户
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">账号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">手机号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.usercode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.status === 'active' ? '活跃' : '禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 text-sm mr-3"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">{isEdit ? '编辑用户' : '创建用户'}</h3>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {!isEdit && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">账号 *</label>
                      <input
                        type="text"
                        value={currentUser.usercode}
                        onChange={(e) => setCurrentUser({ ...currentUser, usercode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="4-20位字母和数字"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">用户名 *</label>
                    <input
                      type="text"
                      value={currentUser.username}
                      onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="1-20位字母、数字或中文"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 *</label>
                    <input
                      type="email"
                      value={currentUser.email}
                      onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="邮箱地址"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                    <input
                      type="tel"
                      value={currentUser.phone}
                      onChange={(e) => setCurrentUser({ ...currentUser, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="11位手机号"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isEdit ? '密码（留空不修改）' : '密码 *'}
                    </label>
                    <input
                      type="password"
                      value={currentUser.password}
                      onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder={isEdit ? '留空不修改密码' : '至少6位'}
                    />
                  </div>
                  
                  {isEdit && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select
                        value={currentUser.status}
                        onChange={(e) => setCurrentUser({ ...currentUser, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="active">活跃</option>
                        <option value="inactive">禁用</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setIsEdit(false);
                        setError('');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {isEdit ? '更新' : '创建'}
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
