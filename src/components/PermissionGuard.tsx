'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkPermission, PermissionLevel, checkMenuAccess } from '@/lib/permission';

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

  useEffect(() => {
    const checkAccess = async () => {
      try {
        let result = false;
        
        console.log('PermissionGuard: 开始检查权限');
        console.log('PermissionGuard: menuPath:', menuPath);
        console.log('PermissionGuard: requiredLevel:', requiredLevel);
        
        if (menuPath) {
          // 根据菜单路径检查权限
          console.log('PermissionGuard: 根据菜单路径检查权限');
          result = await checkMenuAccess(menuPath);
        } else if (requiredLevel) {
          // 根据权限级别检查权限
          console.log('PermissionGuard: 根据权限级别检查权限');
          result = await checkPermission(requiredLevel);
        }
        
        console.log('PermissionGuard: 权限检查结果:', result);
        setHasPermission(result);
      } catch (error) {
        console.error('PermissionGuard: 权限检查错误:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [requiredLevel, menuPath, router]);

  // 处理重定向逻辑
  useEffect(() => {
    if (!loading && !hasPermission && !fallback) {
      // 获取当前页面的路径
      const currentPath = window.location.pathname + window.location.search;
      // 直接重定向到登录页面，并带上当前页面的路径作为回调参数
      router.push(`/auth/login?callback=${encodeURIComponent(currentPath)}`);
    }
  }, [loading, hasPermission, fallback, router]);

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

    return null;
  }

  return <>{children}</>;
}
