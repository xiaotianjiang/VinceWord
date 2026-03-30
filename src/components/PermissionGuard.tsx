'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkPermission, PermissionLevel, checkMenuAccess } from '@/lib/permission';
import { getCurrentUser } from '@/lib/session';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredLevel?: PermissionLevel;
  menuPath?: string;
  fallback?: React.ReactNode;
}

export default function PermissionGuard({ 
  children, 
  requiredLevel,
  menuPath,
  fallback 
}: PermissionGuardProps) {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        let result = false;
        let loggedIn = false;
        
        console.log('PermissionGuard: 开始检查权限');
        console.log('PermissionGuard: menuPath:', menuPath);
        console.log('PermissionGuard: requiredLevel:', requiredLevel);
        
        if (menuPath) {
          // 根据菜单路径检查权限
          console.log('PermissionGuard: 根据菜单路径检查权限');
          const menuAccessResult = await checkMenuAccess(menuPath);
          result = menuAccessResult.hasAccess;
          loggedIn = menuAccessResult.isLoggedIn;
        } else if (requiredLevel) {
          // 根据权限级别检查权限
          console.log('PermissionGuard: 根据权限级别检查权限');
          result = await checkPermission(requiredLevel);
          // 对于requiredLevel，我们无法直接获取登录状态，需要单独检查
          const user = await getCurrentUser();
          loggedIn = !!user;
        }
        
        console.log('PermissionGuard: 权限检查结果:', result);
        console.log('PermissionGuard: 登录状态:', loggedIn);
        setHasPermission(result);
        setIsLoggedIn(loggedIn);
      } catch (error) {
        console.error('PermissionGuard: 权限检查错误:', error);
        setHasPermission(false);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [requiredLevel, menuPath]);

  // 处理重定向逻辑
  useEffect(() => {
    if (!loading && !hasPermission && !fallback && isLoggedIn) {
      // 只有当用户已登录但没有权限时才重定向
      // 未登录用户会显示登录提示，不需要重定向
      router.push('/404');
    }
  }, [loading, hasPermission, fallback, isLoggedIn, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return fallback;
    }

    if (!isLoggedIn) {
      // 用户未登录，显示登录提示
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">请先登录</h2>
            <p className="text-gray-600 mb-6">
              您需要登录才能访问此功能
            </p>
            <div className="flex flex-col space-y-3">
              <a 
                href={`/auth/login?callback=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center"
              >
                去登录
              </a>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}
