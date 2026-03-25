'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Menu {
  id: string;
  name: string;
  path: string;
  icon: string | null;
  parent_id: string | null;
  sort: number;
  status: string;
  access_level: string;
  created_at: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface MenuResponse {
  success: boolean;
  data: Menu[];
  pagination: Pagination;
  error?: string;
}

interface MenuFormData {
  name: string;
  path: string;
  icon: string;
  parent_id: string | null;
  sort: number;
  status: string;
  access_level: string;
}

interface Option {
  value: string;
  label: string;
}

export default function MenuManagementPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
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
  const [formData, setFormData] = useState<MenuFormData>({
    name: '',
    path: '',
    icon: '',
    parent_id: '',
    sort: 0,
    status: 'active',
    access_level: 'use'
  });
  
  // 下拉选项
  const [menuOptions, setMenuOptions] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  // 当前操作的菜单
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  // 当前选中的菜单（用于新增子菜单）
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  // 操作加载状态
  const [actionLoading, setActionLoading] = useState(false);
  // 操作消息
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchMenus = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('请先登录');
        setLoading(false);
        return;
      }
      
      // 获取所有菜单数据，不分页，以便正确渲染树状结构
      const response = await fetch(`/api/admin/menu?page=1&limit=1000&search=${encodeURIComponent(search)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data: MenuResponse = await response.json();
      if (data.success) {
        setMenus(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.error || '获取菜单列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取菜单列表错误:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取菜单选项
  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        return;
      }
      
      const response = await fetch('/api/admin/menu?type=options', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setMenuOptions([{ value: '', label: '无（顶级菜单）' }, ...data.menuOptions]);
      }
    } catch (err) {
      console.error('获取选项错误:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchMenus();
    fetchOptions();
  }, [page, limit, search]);

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
      [name]: name === 'sort' ? parseInt(value) || 0 : name === 'parent_id' ? (value === '' ? null : value) : value
    }));
  };

  // 打开添加菜单模态框
  const handleAddMenu = (parentMenu?: Menu) => {
    setFormData({
      name: '',
      path: '',
      icon: '',
      parent_id: parentMenu ? parentMenu.id : null,
      sort: 0,
      status: 'active',
      access_level: 'use'
    });
    setSelectedMenu(parentMenu || null);
    setActionMessage(null);
    setShowAddModal(true);
  };

  // 打开编辑菜单模态框
  const handleEditMenu = (menu: Menu) => {
    setCurrentMenu(menu);
    setFormData({
      name: menu.name,
      path: menu.path,
      icon: menu.icon || '',
      parent_id: menu.parent_id || '',
      sort: menu.sort,
      status: menu.status,
      access_level: menu.access_level || 'use'
    });
    setActionMessage(null);
    setShowEditModal(true);
  };

  // 打开删除菜单模态框
  const handleDeleteMenu = (menu: Menu) => {
    setCurrentMenu(menu);
    setActionMessage(null);
    setShowDeleteModal(true);
  };

  // 提交添加菜单
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
      
      const response = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('菜单添加成功');
        setTimeout(() => {
          setShowAddModal(false);
          fetchMenus();
        }, 1000);
      } else {
        setActionMessage(data.error || '添加菜单失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('添加菜单错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 提交编辑菜单
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMenu) return;
    
    setActionLoading(true);
    setActionMessage(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setActionMessage('请先登录');
        setActionLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/menu/${currentMenu.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('菜单更新成功');
        setTimeout(() => {
          setShowEditModal(false);
          fetchMenus();
        }, 1000);
      } else {
        setActionMessage(data.error || '更新菜单失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('更新菜单错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 提交删除菜单
  const handleSubmitDelete = async () => {
    if (!currentMenu) return;
    
    setActionLoading(true);
    setActionMessage(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setActionMessage('请先登录');
        setActionLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/menu/${currentMenu.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setActionMessage('菜单删除成功');
        setTimeout(() => {
          setShowDeleteModal(false);
          fetchMenus();
        }, 1000);
      } else {
        setActionMessage(data.error || '删除菜单失败');
      }
    } catch (err) {
      setActionMessage('网络错误，请稍后重试');
      console.error('删除菜单错误:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 渲染菜单树状结构
  const renderMenuTree = (menus: Menu[], parentId: string | null, level: number): React.ReactNode => {
    const filteredMenus = menus.filter(menu => menu.parent_id === parentId);
    
    return filteredMenus.map(menu => (
      <>
        <tr 
          key={menu.id}
          className="hover:bg-gray-50 cursor-pointer"
          onClick={() => handleAddMenu(menu)}
        >
          <td className="border border-gray-200 px-4 py-2 pl-4">
            {Array(level).fill(' ').map((_, i) => (
              <span key={i} className="inline-block w-4"></span>
            ))}
            {level > 0 && <span className="inline-block w-4">└─ </span>}
            {menu.name}
          </td>
          <td className="border border-gray-200 px-4 py-2">{menu.path}</td>
          <td className="border border-gray-200 px-4 py-2">{menu.icon || '-'}</td>
          <td className="border border-gray-200 px-4 py-2">{menu.sort}</td>
          <td className="border border-gray-200 px-4 py-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              menu.access_level === 'show' ? 'bg-yellow-100 text-yellow-800' :
              menu.access_level === 'use' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {menu.access_level === 'show' ? 'Show' :
               menu.access_level === 'use' ? 'Use' : 'Admin'}
            </span>
          </td>
            <td className="border border-gray-200 px-4 py-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                menu.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {menu.status === 'active' ? '启用' : '禁用'}
              </span>
            </td>
          <td className="border border-gray-200 px-4 py-2">
            <div className="flex space-x-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditMenu(menu);
                }}
                className="text-blue-600 hover:underline"
              >
                编辑
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMenu(menu);
                }}
                className="text-red-600 hover:underline"
              >
                删除
              </button>
            </div>
          </td>
        </tr>
        {renderMenuTree(menus, menu.id, level + 1)}
      </>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">菜单管理</h1>
          <p className="text-gray-600">管理系统菜单和权限</p>
        </header>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">菜单列表</h2>
            <button 
              onClick={handleAddMenu}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加菜单
            </button>
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜索菜单..."
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
                      <th className="border border-gray-200 px-4 py-2 text-left">菜单名称</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">路径</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">图标</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">排序</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">访问级别</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">状态</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menus.length > 0 ? (
                      renderMenuTree(menus, null, 0)
                    ) : (
                      <tr>
                        <td colSpan={7} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                          暂无菜单数据
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

      {/* 添加菜单模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              {selectedMenu && selectedMenu.name ? `在 "${selectedMenu.name}" 下添加子菜单` : '添加顶级菜单'}
            </h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">菜单名称</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入菜单名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">路径</label>
                <input
                  type="text"
                  name="path"
                  value={formData.path}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入菜单路径"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                <input
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入图标名称（可选）"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">父菜单</label>
                {loadingOptions ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                    加载中...
                  </div>
                ) : (
                  <select
                    name="parent_id"
                    value={formData.parent_id || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {menuOptions.filter(option => !currentMenu || option.value !== currentMenu.id).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input
                  type="number"
                  name="sort"
                  value={formData.sort}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入排序值"
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
                  <option value="active">启用</option>
                  <option value="inactive">禁用</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">访问级别</label>
                <select
                  name="access_level"
                  value={formData.access_level}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="use">Use (无需登录即可使用)</option>
                  <option value="show">Show (无需登录可查看，使用需登录)</option>
                  <option value="admin">Admin (需要授权)</option>
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

      {/* 编辑菜单模态框 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">编辑菜单</h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">菜单名称</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入菜单名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">路径</label>
                <input
                  type="text"
                  name="path"
                  value={formData.path}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入菜单路径"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                <input
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入图标名称（可选）"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">父菜单</label>
                {loadingOptions ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                    加载中...
                  </div>
                ) : (
                  <select
                    name="parent_id"
                    value={formData.parent_id || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {menuOptions.filter(option => !currentMenu || option.value !== currentMenu.id).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input
                  type="number"
                  name="sort"
                  value={formData.sort}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入排序值"
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
                  <option value="active">启用</option>
                  <option value="inactive">禁用</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">访问级别</label>
                <select
                  name="access_level"
                  value={formData.access_level}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="use">Use (无需登录即可使用)</option>
                  <option value="show">Show (无需登录可查看，使用需登录)</option>
                  <option value="admin">Admin (需要授权)</option>
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

      {/* 删除菜单模态框 */}
      {showDeleteModal && currentMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">删除菜单</h3>
            
            {actionMessage && (
              <div className={`mb-4 p-3 rounded-lg ${actionMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionMessage}
              </div>
            )}
            
            <p className="mb-6">确定要删除菜单 <strong>{currentMenu.name}</strong> 吗？此操作不可恢复。</p>
            
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