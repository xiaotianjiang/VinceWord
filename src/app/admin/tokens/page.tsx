'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionLevel } from '@/lib/permission';

interface Token {
  id: string;
  token: string;
  user_id: string;
  blacklisted_at: string;
  expires_at: string;
  reason: string;
  created_at: string;
  vw_users?: {
    usercode: string;
    username: string;
    email: string;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TokenResponse {
  success: boolean;
  data: Token[];
  pagination: Pagination;
  error?: string;
}

export default function TokenManagementPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [newExpiry, setNewExpiry] = useState<string>('');

  const fetchTokens = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('请先登录');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/tokens?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&userId=${encodeURIComponent(userId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data: TokenResponse = await response.json();
      if (data.success) {
        setTokens(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.error || '获取token列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取token列表错误:', err);
    } finally {
      setLoading(false);
    }
  };

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage(null);
      setMessageType(null);
    }, 3000);
  };

  const handleRemoveToken = async (tokenId: string) => {
    if (!window.confirm('确定要删除这个token吗？')) {
      return;
    }

    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) {
        showMessage('请先登录', 'error');
        return;
      }
      
      const response = await fetch('/api/admin/tokens', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ id: tokenId })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('token已删除', 'success');
        fetchTokens();
      } else {
        showMessage('删除失败: ' + (data.error || '未知错误'), 'error');
      }
    } catch (err) {
      showMessage('网络错误，请稍后重试', 'error');
      console.error('删除token错误:', err);
    }
  };

  const handleCleanupExpired = async () => {
    if (!window.confirm('确定要清理所有过期的token吗？')) {
      return;
    }

    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) {
        showMessage('请先登录', 'error');
        return;
      }
      
      const response = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message, 'success');
        fetchTokens();
      } else {
        showMessage('清理失败: ' + (data.error || '未知错误'), 'error');
      }
    } catch (err) {
      showMessage('网络错误，请稍后重试', 'error');
      console.error('清理过期token错误:', err);
    }
  };

  const handleUpdateExpiry = async (tokenId: string) => {
    if (!newExpiry) {
      showMessage('请选择新的过期时间', 'error');
      return;
    }

    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) {
        showMessage('请先登录', 'error');
        return;
      }
      
      const response = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ id: tokenId, expires_at: newExpiry })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('过期时间已更新', 'success');
        setEditingToken(null);
        setNewExpiry('');
        fetchTokens();
      } else {
        showMessage('更新失败: ' + (data.error || '未知错误'), 'error');
      }
    } catch (err) {
      showMessage('网络错误，请稍后重试', 'error');
      console.error('更新过期时间错误:', err);
    }
  };

  const handleForceLogout = async (userId: string) => {
    if (!window.confirm('确定要强制该用户下线吗？')) {
      return;
    }

    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) {
        showMessage('请先登录', 'error');
        return;
      }
      
      const response = await fetch('/api/admin/tokens', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('用户已被强制下线', 'success');
        fetchTokens();
      } else {
        showMessage('操作失败: ' + (data.error || '未知错误'), 'error');
      }
    } catch (err) {
      showMessage('网络错误，请稍后重试', 'error');
      console.error('强制下线错误:', err);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [page, limit, search, userId]);

  return (
    <PermissionGuard requiredLevel={PermissionLevel.ADMIN}>
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <header className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Token管理</h1>
            <p className="text-gray-600">管理系统token和用户登录状态</p>
          </header>
          
          {/* 消息提示 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Token列表</h2>
              <button
                onClick={handleCleanupExpired}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                清理过期Token
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="搜索token或原因"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="用户ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 text-center py-10">
                {error}
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-gray-500 text-center py-10">
                暂无token黑名单记录
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-4 py-2 text-left">ID</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Token</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">用户</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">黑名单时间</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">过期时间</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">原因</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => (
                      <tr key={token.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2">{token.id}</td>
                        <td className="border border-gray-200 px-4 py-2 max-w-xs truncate">
                          {token.token}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {token.vw_users ? (
                            <div>
                              <div>{token.vw_users.username}</div>
                              <div className="text-sm text-gray-500">{token.vw_users.email}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {new Date(token.blacklisted_at).toLocaleString()}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {new Date(token.expires_at).toLocaleString()}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">{token.reason}</td>
                        <td className="border border-gray-200 px-4 py-2">
                          {editingToken === token.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="datetime-local"
                                value={newExpiry}
                                onChange={(e) => setNewExpiry(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded-md"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateExpiry(token.id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingToken(null);
                                    setNewExpiry('');
                                  }}
                                  className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleRemoveToken(token.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                              >
                                移除
                              </button>
                              <button
                                onClick={() => {
                                  setEditingToken(token.id);
                                  setNewExpiry(new Date(token.expires_at).toISOString().slice(0, 16));
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                              >
                                设置过期时间
                              </button>
                              {token.user_id && (
                                <button
                                  onClick={() => handleForceLogout(token.user_id)}
                                  className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                                >
                                  一键下线
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!loading && tokens.length > 0 && (
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  共 {pagination.total} 条记录
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1 border border-gray-300 rounded-md bg-gray-50">
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <Link href="/admin" className="text-blue-500 hover:text-blue-700">
              ← 返回管理中心
            </Link>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
