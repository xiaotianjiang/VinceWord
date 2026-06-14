'use client';

import { useEffect } from 'react';
import { logout } from '@/lib/session';

export default function LogoutPage() {
  useEffect(() => {
    const handleLogout = async () => {
      await logout();
      window.location.href = '/';
    };
    handleLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在退出登录...</p>
      </div>
    </div>
  );
}
