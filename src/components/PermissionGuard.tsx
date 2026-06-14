// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/session';
import { User } from '@/types';

interface PermissionGuardProps {
  children: React.ReactNode;
  requireRole?: string | string[];
  requireAdmin?: boolean;
  requireLogin?: boolean;
}

export default function PermissionGuard({ 
  children, 
  requireRole, 
  requireAdmin = false, 
  requireLogin = true 
}: PermissionGuardProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      if (requireLogin && !user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      if (user) {
        let hasAccess = true;
        
        if (requireAdmin) {
          hasAccess = user.roles.some(r => r.type === 'admin' || r.type === 'superadmin');
        }
        
        if (requireRole && !hasAccess) {
          const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
          hasAccess = user.roles.some(r => roles.includes(r.type) || roles.includes(r.name));
        }
        
        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
    };
    
    checkAuth();
  }, [requireLogin, requireAdmin, requireRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notLoggedIn) {
    const currentPath = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname + window.location.search) : '';
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">请先登录</h2>
            <a href={`/auth/login?redirect=${currentPath}`} className="text-blue-600 hover:underline">去登录</a>
          </div>
        </main>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">您没有权限访问此页面</h2>
            <a 
              href="/" 
              className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              返回首页
            </a>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}

export { PermissionGuard };
