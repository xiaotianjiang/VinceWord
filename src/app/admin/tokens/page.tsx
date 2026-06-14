'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PermissionGuard from '@/components/PermissionGuard';

export default function TokenManagementPage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/admin/tokens', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      setTokens(data.tokens);
    }
    setLoading(false);
  };

  const handleForceLogout = async (userId: string) => {
    if (!confirm('确定要强制该用户下线吗？')) return;
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/admin/tokens', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, action: 'logout' })
    });
    if (response.ok) {
      fetchTokens();
    }
  };

  const handleCleanExpired = async () => {
    if (!confirm('确定要清理所有过期token吗？')) return;
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/admin/tokens', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'cleanExpired' })
    });
    if (response.ok) {
      fetchTokens();
    }
  };

  return (
    <PermissionGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Token管理</h1>
            <button
              onClick={handleCleanExpired}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              清理过期token
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">过期时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP地址</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tokens.map(token => (
                    <tr key={token.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{token.user_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${token.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {token.status === 'active' ? '活跃' : '已注销'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(token.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(token.expires_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{token.ip_address}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {token.status === 'active' && (
                          <button
                            onClick={() => handleForceLogout(token.user_id)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            强制下线
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </PermissionGuard>
  );
}
