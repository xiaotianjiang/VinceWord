'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PermissionGuard from '@/components/PermissionGuard';

export default function InviteCodePage() {
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode] = useState({ roleId: '', maxUses: 1 });
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    fetchInviteCodes();
    fetchRoles();
  }, []);

  const fetchInviteCodes = async () => {
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/auth/invite-code', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      setInviteCodes(data.inviteCodes);
    }
    setLoading(false);
  };

  const fetchRoles = async () => {
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/admin/roles', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      setRoles(data.roles);
    }
  };

  const handleGenerateCode = async () => {
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/auth/invite-code', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'generate', roleId: newCode.roleId || null, maxUses: newCode.maxUses })
    });
    const data = await response.json();
    if (response.ok) {
      setShowModal(false);
      setNewCode({ roleId: '', maxUses: 1 });
      fetchInviteCodes();
    }
  };

  const handleCancelCode = async (codeId: string) => {
    if (!confirm('确定要作废此邀请码吗？')) return;
    const token = localStorage.getItem('auth-token');
    const response = await fetch('/api/auth/invite-code', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'cancel', codeId })
    });
    if (response.ok) {
      fetchInviteCodes();
    }
  };

  return (
    <PermissionGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">邀请码管理</h1>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              生成邀请码
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邀请码</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联角色</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">使用次数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">过期时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inviteCodes.map(code => (
                    <tr key={code.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{code.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{code.role_name || '无'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{code.uses}/{code.max_uses}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${code.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {code.status === 'active' ? '活跃' : '已作废'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(code.expires_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {code.status === 'active' && (
                          <button
                            onClick={() => handleCancelCode(code.id)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            作废
                          </button>
                        )}
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
                <h3 className="text-lg font-semibold mb-4">生成邀请码</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">选择角色（可选）</label>
                    <select
                      value={newCode.roleId}
                      onChange={(e) => setNewCode({ ...newCode, roleId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">不关联角色</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">使用次数</label>
                    <input
                      type="number"
                      value={newCode.maxUses}
                      onChange={(e) => setNewCode({ ...newCode, maxUses: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleGenerateCode}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      生成
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
