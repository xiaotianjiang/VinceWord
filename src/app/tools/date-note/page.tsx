'use client';

import Header from '@/components/Header';
import PermissionGuard from '@/components/PermissionGuard';

export default function DateNotePage() {
  return (
    <PermissionGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-8">日期笔记</h1>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600">日期笔记功能开发中...</p>
          </div>
        </main>
      </div>
    </PermissionGuard>
  );
}
