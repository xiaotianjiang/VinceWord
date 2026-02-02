'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/session';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setIsLoading(false);

    if (!user) {
      router.push('/login');
    }
    
    // 监听用户变化事件
    const handleUserChanged = (event: CustomEvent<User | null>) => {
      setCurrentUser(event.detail);
      if (!event.detail) {
        router.push('/login');
      }
    };
    
    window.addEventListener('userChanged', handleUserChanged);
    
    return () => {
      window.removeEventListener('userChanged', handleUserChanged);
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">请先登录</p>
          <a href="/login" className="text-blue-500 hover:text-blue-700">
            去登录
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}