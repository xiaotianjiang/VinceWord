'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Game } from '@/types';
import { getCurrentUser } from '@/lib/session';
import GameLobby from '@/components/GameLobby';
import GameRoom from '@/components/GameRoom';

export default function GamePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadCurrentGame(user.id);
    } else {
      setLoading(false);
    }
  }, []);

  const loadCurrentGame = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*, player1:users!player1_id(*), player2:users!player2_id(*)')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .in('status', ['waiting', 'preparing', 'playing'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setCurrentGame(data[0]);
      }
    } catch (error) {
      console.error('加载当前游戏错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGameStart = (game: Game) => {
    setCurrentGame(game);
  };

  const handleGameEnd = () => {
    setCurrentGame(null);
  };

  if (loading) {
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
            前往登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">我发4</h1>
          <p className="text-gray-600">数字猜谜游戏 - 与好友一起挑战</p>
        </header>

        {currentGame ? (
          <GameRoom 
            game={currentGame} 
            currentUser={currentUser}
            onGameEnd={handleGameEnd}
          />
        ) : (
          <GameLobby 
            currentUser={currentUser}
            onGameStart={handleGameStart}
          />
        )}
      </div>
    </div>
  );
}