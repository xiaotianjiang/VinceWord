'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { removeCurrentUser } from '@/lib/session';

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    removeCurrentUser();
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg text-gray-600">登出中...</p>
      </div>
    </div>
  );
}