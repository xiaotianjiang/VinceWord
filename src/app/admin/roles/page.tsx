'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  type: string;
  parent_id: string | null;
  created_at: string;
  children?: Role[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface RoleResponse {
  success: boolean;
  data: Role[];
  pagination: Pagination;
  error?: string;
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoleType, setUserRoleType] = useState<string>('user');
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'user'
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('请先登录');
        setLoading(false);
        return;
      }
      
      // 获取用户信息，包括角色类型
      const userResponse = await fetch('/api/auth/login', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.success && userData.user && userData.user.roles) {
          // 确定用户的最高角色类型
          const roles = userData.user.roles;
          if (roles.some((role: any) => role.type === 'superadmin')) {
            setUserRoleType('superadmin');
          } else if (roles.some((role: any) => role.type === 'admin')) {
            setUserRoleType('admin');
          } else {
            setUserRoleType('user');
          }
        }
      }
      
      const response = await fetch(`/api/admin/roles?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data: RoleResponse = await response.json();
      if (data.success) {
        setRoles(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.error || '获取角色列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取角色列表错误:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchRoles();
  }, [page, limit, search, fetchRoles]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddRole = () => {
    setFormData({ name: '', code: '', description: '', type: 'user' });
    setShowAddModal(true);
    setMessage(null);
  };

  const handleEditRole = (role: Role) => {
    setCurrentRole(role);
    setFormData({ name: role.name, code: role.code, description: role.description || '', type: role.type });
    setShowEditModal(true);
    setMessage(null);
  };

  const handleDeleteRole = (role: Role) => {
    setCurrentRole(role);
    setShowDeleteModal(true);
  };

  const submitRole = async (isEdit: boolean) => {
    setSubmitLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setMessage('请先登录');
        setSubmitLoading(false);
        return;
      }

      const url = isEdit && currentRole ? `/api/admin/roles/${currentRole.id}` : '/api/admin/roles';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setMessage(isEdit ? '角色编辑成功' : '角色添加成功');
        setTimeout(() => {
          fetchRoles();
          setShowAddModal(false);
          setShowEditModal(false);
        }, 1000);
      } else {
        setMessage(data.error || (isEdit ? '角色编辑失败' : '角色添加失败'));
      }
    } catch (err) {
      setMessage('网络错误，请稍后重试');
      console.error(isEdit ? '编辑角色错误:' : '添加角色错误:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const deleteRole = async () => {
    if (!currentRole) return;
    setSubmitLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setMessage('请先登录');
        setSubmitLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/roles/${currentRole.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setMessage('角色删除成功');
        setTimeout(() => {
          fetchRoles();
          setShowDeleteModal(false);
        }, 1000);
      } else {
        setMessage(data.error || '角色删除失败');
      }
    } catch (err) {
      setMessage('网络错误，请稍后重试');
      console.error('删除角色错误:', err);
    } finally {
      setSubmitLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">角色管理</h1>
          <p className="text-gray-600">管理系统角色和权限</p>
        </header>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">角色列表</h2>
            {(userRoleType === 'superadmin' || userRoleType === 'admin') && (
              <button 
                onClick={handleAddRole}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                添加角色
              </button>
            )}
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜索角色..."
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
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-4 py-2 text-left">角色名称</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">角色代码</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">类型</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">描述</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">创建时间</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.length > 0 ? (
                      <>
                        {roles.map((role) => {
                          const renderRole = (role: Role, level: number = 0) => (
                            <React.Fragment key={role.id}>
                              <tr className="hover:bg-gray-50">
                                <td className="border border-gray-200 px-4 py-2" style={{ paddingLeft: `${level * 20 + 16}px` }}>
                                  {level > 0 && <span className="inline-block w-4 h-4 mr-2">└─</span>}
                                  {role.name}
                                </td>
                                <td className="border border-gray-200 px-4 py-2">{role.code}</td>
                                <td className="border border-gray-200 px-4 py-2">
                                  <span className={`px-2 py-1 text-xs rounded-full ${role.type === 'superadmin' ? 'bg-purple-100 text-purple-800' : role.type === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                    {role.type === 'superadmin' ? '超级管理员' : role.type === 'admin' ? '管理员' : '普通用户'}
                                  </span>
                                </td>
                                <td className="border border-gray-200 px-4 py-2">{role.description || '-'}</td>
                                <td className="border border-gray-200 px-4 py-2">
                                  {new Date(role.created_at).toLocaleString()}
                                </td>
                                <td className="border border-gray-200 px-4 py-2">
                                  {(userRoleType === 'superadmin' || (userRoleType === 'admin' && role.type === 'user')) && (
                                    <>
                                      <button 
                                        onClick={() => handleEditRole(role)}
                                        className="text-blue-600 hover:underline mr-2"
                                      >
                                        编辑
                                      </button>
                                      <Link 
                                        href={`/admin/role-menus?roleId=${role.id}`}
                                        className="text-green-600 hover:underline mr-2"
                                      >
                                        授权菜单
                                      </Link>
                                      <button 
                                        onClick={() => handleDeleteRole(role)}
                                        className="text-red-600 hover:underline"
                                      >
                                        删除
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                              {role.children && role.children.length > 0 && (
                                role.children.map((childRole) => renderRole(childRole, level + 1))
                              )}
                            </React.Fragment>
                          );
                          return renderRole(role);
                        })}
                      </>
                    ) : (
                      <tr>
                        <td colSpan={5} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                          暂无角色数据
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

        {/* 添加角色模态框 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">添加角色</h3>
              {message && (
                <div className={`mb-4 p-2 rounded ${message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {message}
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); submitRole(false); }}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">角色名称</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">角色代码</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {userRoleType === 'superadmin' && (
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">角色类型</label>
                    <select
                      name="type"
                      value={formData.type || 'user'}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="admin">管理员</option>
                      <option value="user">普通用户</option>
                    </select>
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">描述</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitLoading ? '提交中...' : '提交'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 编辑角色模态框 */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">编辑角色</h3>
              {message && (
                <div className={`mb-4 p-2 rounded ${message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {message}
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); submitRole(true); }}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">角色名称</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">角色代码</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">描述</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitLoading ? '提交中...' : '提交'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 删除角色模态框 */}
        {showDeleteModal && currentRole && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">删除角色</h3>
              {message && (
                <div className={`mb-4 p-2 rounded ${message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {message}
                </div>
              )}
              <p className="mb-6">确定要删除角色 <span className="font-semibold">{currentRole.name}</span> 吗？</p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={deleteRole}
                  disabled={submitLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {submitLoading ? '删除中...' : '删除'}
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  )
}