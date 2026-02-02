'use client';

import { User } from '@/types';

interface UserStatsProps {
  user: User;
  className?: string;
}

export default function UserStats({ user, className = '' }: UserStatsProps) {
  const totalGames = user.total_games || 0;
  const wins = user.wins || 0;
  const totalRounds = user.total_rounds || 0;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
  const avgRoundsPerGame = totalGames > 0 ? (totalRounds / totalGames).toFixed(1) : 0;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-xl font-semibold mb-4 text-gray-800">游戏统计</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalGames}</div>
          <div className="text-sm text-gray-600">总游戏数</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{wins}</div>
          <div className="text-sm text-gray-600">获胜次数</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{winRate}%</div>
          <div className="text-sm text-gray-600">胜率</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{totalRounds}</div>
          <div className="text-sm text-gray-600">总回合数</div>
        </div>
      </div>
      
      {totalGames > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <p>平均每局回合数: <span className="font-semibold">{avgRoundsPerGame}</span></p>
            <p className="mt-1">
              游戏表现: 
              <span className={`font-semibold ${
                Number(winRate) >= 60 ? 'text-green-600' : 
                Number(winRate) >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Number(winRate) >= 60 ? '优秀' : 
                 Number(winRate) >= 40 ? '良好' : '需要提高'}
              </span>
            </p>
          </div>
        </div>
      )}
      
      {totalGames === 0 && (
        <div className="mt-4 text-center text-gray-500">
          <p>暂无游戏记录</p>
          <p className="text-sm mt-1">开始游戏来积累统计数据吧！</p>
        </div>
      )}
    </div>
  );
}