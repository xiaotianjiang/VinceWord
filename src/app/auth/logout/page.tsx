'use client'

import { useEffect } from 'react'
import { logout } from '@/lib/session'

export default function LogoutPage() {
  useEffect(() => {
    const handleLogout = async () => {
      try {
        // 调用登出API
        await logout()
        // 跳转到首页
        window.location.href = '/'
      } catch (err) {
        console.error('登出失败:', err)
        // 即使失败也跳转到首页
        window.location.href = '/'
      }
    }

    handleLogout()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-96 text-center">
        <h1 className="text-2xl font-bold mb-4">正在登出...</h1>
        <p className="text-gray-600 dark:text-gray-300">
          请稍候，我们正在处理您的登出请求
        </p>
      </div>
    </div>
  )
}