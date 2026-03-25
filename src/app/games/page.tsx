'use client';

import { useState } from 'react';
import Link from 'next/link';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionLevel } from '@/lib/permission';

interface Game {
  id: string;
  name: string;
  description: string;
  path: string;
  requiresPermission: boolean;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([
    {
      id: 'tic-tac-toe',
      name: '井字棋',
      description: '经典的井字棋游戏',
      path: '/games/tic-tac-toe',
      requiresPermission: false
    },
    {
      id: 'memory',
      name: '记忆翻牌',
      description: '考验你的记忆力',
      path: '/games/memory',
      requiresPermission: false
    }
  ]);

  return (
    <PermissionGuard requiredLevel={PermissionLevel.GUEST}>
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <header className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">游戏中心</h1>
                <p className="text-gray-600">选择你想玩的游戏</p>
              </div>
              <Link href="/">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  返回主页
                </button>
              </Link>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {games.map((game) => (
              <div key={game.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{game.name}</h2>
                  <p className="text-gray-600 mb-4">{game.description}</p>
                  <Link href={game.path}>
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      开始游戏
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
