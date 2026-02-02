'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/session';

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuthComponent(props: P) {
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

    return <WrappedComponent {...props} />;
  };
}