'use client'

import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  usercode: string;
  username: string;
  email: string;
  phone: string | null;
  status: string;
  last_login: string | null;
  created_at: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UserResponse {
  success: boolean;
  data: User[];
  pagination: Pagination;
  error?: string;
}

interface UserFormData {
  usercode: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  status: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  
  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState<UserFormData>({
    usercode: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    status: 'active'
  });
  
  // 当前操作的用户
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // 操作加载状态
  const [actionLoading, setActionLoading] = useState(false);
  // 操作消息
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('请先登录');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data: UserResponse = await response.json();
      if (data.success) {
        setUsers(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.error || '获取用户列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取用户列表错误:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchUsers();
  }, [page, limit, search, fetchUsers]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // 表单输入变化处理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 打开添加用户模态框
  const handleAddUser = () => {
    setFormData({
      usercode: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      status: 'active'
    });
    setActionMessage(null);
    setShowAddModal(true);
  };

  // 打开编辑用户模态框
  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setFormData({
      usercode: user.usercode,
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      password: '', // 密码为空，不修改
      status: user.status
    });
    setActionMessage(null);
    setShowEditModal(true);
  };

  // 打开删除用户模态框
  const handleDeleteUser = (user: User) => {
    setCurrentUser(user);
    setActionMessage(null);
    setShowDeleteModal(true);
  };

  // 提交添加用户
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionMessage(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setActionMessage('请先登录');
        setActionLoading(false);
        return;
      }
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('用户添加成功');
        setTimeout(() => {
          setShowAddModal(false);
          fetchUsers();
        }, 1000);
      } else {
        setActionMessage(data.error || '添加用户失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('添加用户错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 提交编辑用户
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setActionLoading(true);
    setActionMessage(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setActionMessage('请先登录');
        setActionLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('用户更新成功');
        setTimeout(() => {
          setShowEditModal(false);
          fetchUsers();
        }, 1000);
      } else {
        setActionMessage(data.error || '更新用户失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('更新用户错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 提交删除用户
  const handleSubmitDelete = async () => {
    if (!currentUser) return;
    
    setActionLoading(true);
    setActionMessage(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setActionMessage('请先登录');
        setActionLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/users/${currentUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('用户删除成功');
        setTimeout(() => {
          setShowDeleteModal(false);
          fetchUsers();
        }, 1000);
      } else {
        setActionMessage(data.error || '删除用户失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('删除用户错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">用户管理</h1>
          <p className="text-gray-600">管理系统用户和权限</p>
        </header>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">用户列表</h2>
            <button 
              onClick={handleAddUser}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加用户
            </button>
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜索用户..."
              value={search}
              onChange={handleSearch}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
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
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">账号</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">用户名</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">邮箱</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">手机号</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">来源</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">状态</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">创建时间</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">操作</th>
                  </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">{user.usercode}</td>
                          <td className="border border-gray-200 px-4 py-2">{user.username}</td>
                          <td className="border border-gray-200 px-4 py-2">{user.email}</td>
                          <td className="border border-gray-200 px-4 py-2">{user.phone || '-'}</td>
                          <td className="border border-gray-200 px-4 py-2">{user.source || '-'}</td>
                          <td className="border border-gray-200 px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.status === 'active' ? '活跃' : '待激活'}
                            </span>
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {user.last_login ? new Date(user.last_login).toLocaleString() : '-'}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <button 
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:underline mr-2"
                            >
                              编辑
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:underline"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                          暂无用户数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  共 {pagination.total} 条记录
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1 border border-gray-300 rounded-md bg-gray-50">
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="mt-8 text-center">
          <Link href="/admin" className="text-blue-500 hover:text-blue-700">
            ← 返回管理中心
          </Link>
        </div>
      </div>

      {/* 添加用户模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">添加用户</h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
                <input
                  type="text"
                  name="usercode"
                  value={formData.usercode}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入账号"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入用户名"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入邮箱"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入手机号（可选）"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入密码"
                />
              </div>
              

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">活跃</option>
                  <option value="inactive">禁用</option>
                  <option value="pending">待激活</option>
                </select>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? '添加中...' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑用户模态框 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">编辑用户</h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
                <input
                  type="text"
                  name="usercode"
                  value={formData.usercode}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入账号"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入用户名"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入邮箱"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入手机号（可选）"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="留空表示不修改密码"
                />
              </div>
              

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">活跃</option>
                  <option value="inactive">禁用</option>
                  <option value="pending">待激活</option>
                </select>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? '更新中...' : '更新'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除用户模态框 */}
      {showDeleteModal && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">删除用户</h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <p className="mb-6">确定要删除用户 <strong>{currentUser.username}</strong> 吗？此操作不可恢复。</p>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button 
                onClick={handleSubmitDelete}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}