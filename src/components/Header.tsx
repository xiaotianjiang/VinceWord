'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { User, LogOut, LogIn, Settings, Bell, UserCircle } from 'lucide-react'
import { User as UserType } from '@/types'
import { logout, getCurrentUser } from '@/lib/session'

interface HeaderProps {
  currentUser: UserType | null
  notifications: any[]
}

export default function Header({ currentUser, notifications }: HeaderProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)

  const handleLogin = () => {
    // 跳转到登录页面
    window.location.href = '/auth/login'
  }

  const handleLogout = async () => {
    await logout()
    setShowUserDropdown(false)
    // 刷新页面
    window.location.reload()
  }

  const unreadNotifications = notifications.filter(n => !n.read).length

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo和标题 */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VW</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              VinceWord
            </span>
          </Link>

          {/* 右侧用户区域 */}
          <div className="flex items-center space-x-4">
            {/* 通知中心 */}
            {currentUser && (
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className="p-2 text-gray-600 hover:text-blue-600 relative"
                  title="通知中心"
                >
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
                
                {showNotificationDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">通知中心</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div key={notification.id} className={`p-4 border-b border-gray-100 ${!notification.read ? 'bg-blue-50' : ''}`}>
                            <h4 className="font-medium text-gray-900">{notification.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{notification.content}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          暂无通知
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-gray-200">
                      <button 
                        type="button"
                        className="w-full text-center text-sm text-blue-600 hover:bg-gray-50 py-2 rounded"
                      >
                        查看全部通知
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 预留图标区域 */}
            <button 
              type="button"
              className="p-2 text-gray-600 hover:text-blue-600"
              title="设置"
            >
              <Settings size={20} />
            </button>

            {/* 用户登录状态 */}
            <div className="relative">
              {currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
                    title="用户菜单"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">{currentUser.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{currentUser.username}</span>
                  </button>
                  
                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-4 border-b border-gray-200">
                        <p className="font-medium text-gray-900">{currentUser.username}</p>
                        <p className="text-sm text-gray-600">{currentUser.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <LogOut size={16} />
                        <span>退出登录</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LogIn size={16} />
                  <span>登录</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}