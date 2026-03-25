'use client'

import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';

interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

interface User {
  id: string;
  usercode: string;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  last_login: string | null;
  created_at: string;
}

interface RoleUser {
  id: string;
  user_id: string;
  role_id: string;
  user: User;
  role: Role;
  created_at: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface RoleUserResponse {
  success: boolean;
  data: RoleUser[];
  pagination: Pagination;
  error?: string;
}

export default function RoleUsersPage() {
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // 表单数据
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  // 当前操作的角色用户
  const [currentRoleUser, setCurrentRoleUser] = useState<RoleUser | null>(null);
  // 操作加载状态
  const [actionLoading, setActionLoading] = useState(false);
  // 操作消息
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchRoleUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('请先登录');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/role-users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data: RoleUserResponse = await response.json();
      if (data.success) {
        setRoleUsers(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.error || '获取角色用户列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取角色用户列表错误:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  // 扁平化树状结构的角色数据
  const flattenRoles = (roles: any[]): Role[] => {
    let result: Role[] = [];
    
    const processRole = (role: any, level: number = 0) => {
      result.push({
        id: role.id,
        name: ' '.repeat(level * 2) + role.name,
        description: role.description,
        is_system: role.is_system
      });
      
      if (role.children && role.children.length > 0) {
        role.children.forEach((child: any) => processRole(child, level + 1));
      }
    };
    
    roles.forEach(role => processRole(role));
    return result;
  };

  const fetchRoles = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) return;
      
      const response = await fetch('/api/admin/roles?page=1&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        // 扁平化树状结构的角色数据
        const flattenedRoles = flattenRoles(data.data);
        setRoles(flattenedRoles);
      }
    } catch (err) {
      console.error('获取角色列表错误:', err);
    }
  }, [flattenRoles]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) return;
      
      const response = await fetch('/api/admin/users?page=1&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('获取用户列表错误:', err);
    }
  };

  useEffect(() => {
    fetchRoleUsers();
    fetchRoles();
    fetchUsers();
  }, [page, limit, search, fetchRoleUsers, fetchRoles]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // 打开添加角色用户模态框
  const handleAddRoleUser = () => {
    setSelectedRoleId('');
    setSelectedUserId('');
    setActionMessage(null);
    setShowAddModal(true);
  };

  // 打开删除角色用户模态框
  const handleDeleteRoleUser = (roleUser: RoleUser) => {
    setCurrentRoleUser(roleUser);
    setActionMessage(null);
    setShowDeleteModal(true);
  };

  // 提交添加角色用户
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
      
      const response = await fetch('/api/admin/role-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roleId: selectedRoleId,
          userId: selectedUserId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('角色用户添加成功');
        setTimeout(() => {
          setShowAddModal(false);
          fetchRoleUsers();
        }, 1000);
      } else {
        setActionMessage(data.error || '添加角色用户失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('添加角色用户错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 提交删除角色用户
  const handleSubmitDelete = async () => {
    if (!currentRoleUser) return;
    
    setActionLoading(true);
    setActionMessage(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setActionMessage('请先登录');
        setActionLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/role-users/${currentRoleUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('角色用户删除成功');
        setTimeout(() => {
          setShowDeleteModal(false);
          fetchRoleUsers();
        }, 1000);
      } else {
        setActionMessage(data.error || '删除角色用户失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('删除角色用户错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">角色用户管理</h1>
          <p className="text-gray-600">管理角色与用户的关联关系</p>
        </header>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">角色用户列表</h2>
            <button 
              onClick={handleAddRoleUser}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加角色用户
            </button>
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜索角色用户..."
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
                      <th className="border border-gray-200 px-4 py-2 text-left">角色</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">用户</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">创建时间</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roleUsers.length > 0 ? (
                      roleUsers.map((roleUser) => (
                        <tr key={roleUser.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">
                            {roleUser.role.name} {roleUser.role.is_system && '(系统角色)'}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {roleUser.user.username} ({roleUser.user.email})
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {new Date(roleUser.created_at).toLocaleString()}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <button 
                              onClick={() => handleDeleteRoleUser(roleUser)}
                              className="text-red-600 hover:underline"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                          暂无角色用户数据
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

      {/* 添加角色用户模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">添加角色用户</h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择角色</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  required
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择用户</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择用户</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
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

      {/* 删除角色用户模态框 */}
      {showDeleteModal && currentRoleUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">删除角色用户</h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <p className="mb-6">确定要删除角色 <strong>{currentRoleUser.role.name}</strong> 与用户 <strong>{currentRoleUser.user.username}</strong> 的关联吗？此操作不可恢复。</p>
            
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
