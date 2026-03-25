'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 关于我们 */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-gray-900">关于 VinceWord</h3>
            <p className="text-sm text-gray-600 mb-4">
              VinceWord是一个综合性应用平台，提供聊天、游戏、工具等多种功能，为用户创造便捷、安全的在线体验。
            </p>
          </div>

          {/* 功能模块 */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-gray-900">功能模块</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/chat" 
                  className="text-gray-600 hover:text-blue-600 text-sm"
                >
                  聊天功能
                </Link>
              </li>
              <li>
                <Link 
                  href="/games" 
                  className="text-gray-600 hover:text-blue-600 text-sm"
                >
                  游戏中心
                </Link>
              </li>
              <li>
                <Link 
                  href="/tools" 
                  className="text-gray-600 hover:text-blue-600 text-sm"
                >
                  工具中心
                </Link>
              </li>
            </ul>
          </div>

          {/* 游戏分类 */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-gray-900">游戏</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/games/tic-tac-toe" 
                  className="text-gray-600 hover:text-blue-600 text-sm"
                >
                  井字棋
                </Link>
              </li>
              <li>
                <Link 
                  href="/games/memory" 
                  className="text-gray-600 hover:text-blue-600 text-sm"
                >
                  记忆游戏
                </Link>
              </li>
              <li>
                <span className="text-gray-400 text-sm">更多游戏开发中...</span>
              </li>
            </ul>
          </div>

          {/* 工具分类 */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-gray-900">工具</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/tools/calculator" 
                  className="text-gray-600 hover:text-blue-600 text-sm"
                >
                  计算器
                </Link>
              </li>
              <li>
                <Link 
                  href="/tools/password-generator" 
                  className="text-gray-600 hover:text-blue-600 text-sm"
                >
                  密码生成器
                </Link>
              </li>
              <li>
                <span className="text-gray-400 text-sm">更多工具开发中...</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部链接 */}
        <div className="border-t border-gray-200 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex space-x-6 mb-4 md:mb-0">
            <Link href="/about" className="text-gray-600 hover:text-blue-600 text-sm">关于我们</Link>
            <Link href="/contact" className="text-gray-600 hover:text-blue-600 text-sm">联系我们</Link>
            <Link href="/privacy" className="text-gray-600 hover:text-blue-600 text-sm">隐私政策</Link>
            <Link href="/terms" className="text-gray-600 hover:text-blue-600 text-sm">用户协议</Link>
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} VinceWord. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}