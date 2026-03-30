'use client'

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

interface Permission {
  id: string;
  name: string;
  code: string;
  description: string | null;
  module: string;
  action: string;
  created_at: string;
}

interface PermissionFormData {
  name: string;
  code: string;
  description: string;
  module: string;
  action: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PermissionResponse {
  success: boolean;
  data: Permission[];
  pagination: Pagination;
  error?: string;
}

export default function PermissionManagementPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState<PermissionFormData>({
    name: '',
    code: '',
    description: '',
    module: '',
    action: ''
  });
  
  // 当前操作的权限
  const [currentPermission, setCurrentPermission] = useState<Permission | null>(null);
  // 操作加载状态
  const [actionLoading, setActionLoading] = useState(false);
  // 操作消息
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  
  // 角色列表（用于权限分配）
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  // 选中的角色（用于权限分配）
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('请先登录');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/permissions?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data: PermissionResponse = await response.json();
      if (data.success) {
        setPermissions(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.error || '获取权限列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取权限列表错误:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchPermissions();
  }, [page, limit, search, fetchPermissions]);

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

  // 打开添加权限模态框
  const handleAddPermission = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      module: '',
      action: ''
    });
    setActionMessage(null);
    setShowAddModal(true);
  };

  // 打开编辑权限模态框
  const handleEditPermission = (permission: Permission) => {
    setCurrentPermission(permission);
    setFormData({
      name: permission.name,
      code: permission.code,
      description: permission.description || '',
      module: permission.module,
      action: permission.action
    });
    setActionMessage(null);
    setShowEditModal(true);
  };

  // 打开删除权限模态框
  const handleDeletePermission = (permission: Permission) => {
    setCurrentPermission(permission);
    setActionMessage(null);
    setShowDeleteModal(true);
  };

  // 获取角色列表
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        return;
      }
      
      const response = await fetch('/api/admin/roles?page=1&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setRoles(data.data.map((role: any) => ({ id: role.id, name: role.name })));
      }
    } catch (err) {
      console.error('获取角色列表错误:', err);
    }
  };

  // 打开权限分配模态框
  const handleAssignPermission = async (permission: Permission) => {
    setCurrentPermission(permission);
    setSelectedRoles([]);
    setActionMessage(null);
    await fetchRoles();
    setShowAssignModal(true);
  };

  // 提交添加权限
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
      
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('权限添加成功');
        setShowAddModal(false);
        fetchPermissions();
      } else {
        setActionMessage(data.error || '添加权限失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('添加权限错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 提交编辑权限
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPermission) return;
    
    setActionLoading(true);
    setActionMessage(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setActionMessage('请先登录');
        setActionLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/permissions/${currentPermission.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('权限更新成功');
        setShowEditModal(false);
        fetchPermissions();
      } else {
        setActionMessage(data.error || '更新权限失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('更新权限错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 提交删除权限
  const handleSubmitDelete = async () => {
    if (!currentPermission) return;
    
    setActionLoading(true);
    setActionMessage(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setActionMessage('请先登录');
        setActionLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/permissions/${currentPermission.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('权限删除成功');
        setShowDeleteModal(false);
        fetchPermissions();
      } else {
        setActionMessage(data.error || '删除权限失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('删除权限错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">权限管理</h1>
          <p className="text-gray-600">管理系统权限和访问控制</p>
        </header>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">权限列表</h2>
            <button 
              onClick={handleAddPermission}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加权限
            </button>
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜索权限..."
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
                      <th className="border border-gray-200 px-4 py-2 text-left">ID</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">权限名称</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">权限代码</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">模块</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">操作</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">描述</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">创建时间</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.length > 0 ? (
                      permissions.map((permission) => (
                        <tr key={permission.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">{permission.id}</td>
                          <td className="border border-gray-200 px-4 py-2">{permission.name}</td>
                          <td className="border border-gray-200 px-4 py-2">{permission.code}</td>
                          <td className="border border-gray-200 px-4 py-2">{permission.module}</td>
                          <td className="border border-gray-200 px-4 py-2">{permission.action}</td>
                          <td className="border border-gray-200 px-4 py-2">{permission.description || '-'}</td>
                          <td className="border border-gray-200 px-4 py-2">
                            {new Date(permission.created_at).toLocaleString()}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <button 
                              onClick={() => handleEditPermission(permission)}
                              className="text-blue-600 hover:underline mr-2"
                            >
                              编辑
                            </button>
                            <button 
                              onClick={() => handleDeletePermission(permission)}
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
                          暂无权限数据
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
          <Link href="/" className="text-blue-500 hover:text-blue-700">
            ← 返回首页
          </Link>
        </div>
      </div>

      {/* 添加权限模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">添加权限</h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">权限名称</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入权限名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">权限代码</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入权限代码"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模块</label>
                <input
                  type="text"
                  name="module"
                  value={formData.module}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入模块名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作</label>
                <input
                  type="text"
                  name="action"
                  value={formData.action}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入操作名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入权限描述（可选）"
                />
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

      {/* 编辑权限模态框 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">编辑权限</h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">权限名称</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入权限名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">权限代码</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入权限代码"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模块</label>
                <input
                  type="text"
                  name="module"
                  value={formData.module}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入模块名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作</label>
                <input
                  type="text"
                  name="action"
                  value={formData.action}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入操作名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入权限描述（可选）"
                />
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

      {/* 删除权限模态框 */}
      {showDeleteModal && currentPermission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">删除权限</h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <p className="mb-6">确定要删除权限 <strong>{currentPermission.name}</strong> 吗？此操作不可恢复。</p>
            
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