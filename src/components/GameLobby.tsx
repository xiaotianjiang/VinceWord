'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Game } from '@/types';
import UserStats from './UserStats';

interface GameLobbyProps {
  currentUser: User;
  onGameStart: (game: Game) => void;
}

export default function GameLobby({ currentUser, onGameStart }: GameLobbyProps) {
  const [friends, setFriends] = useState<User[]>([]);
  const [waitingGames, setWaitingGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingGame, setCreatingGame] = useState(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    const loadData = async () => {
      await loadFriends();
      await loadWaitingGames();
    };
    
    loadData();
    setupGameSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [currentUser.id]);

  const loadFriends = async () => {
    try {
      // 这里简化处理，实际应该从好友关系表中获取
      const { data, error } = await supabase
        .from('users')
        .select('id, usercode, email, username, password_hash, role, total_games, wins, total_rounds, created_at, updated_at')
        .neq('id', currentUser.id)
        .limit(20);

      if (!error && data) {
        setFriends(data);
      }
    } catch (error) {
      console.error('加载好友错误:', error);
    }
  };

  const loadWaitingGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*, player1:users!player1_id(*)')
        .eq('status', 'waiting')
        .neq('player1_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setWaitingGames(data);
      }
    } catch (error) {
      console.error('加载等待游戏错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupGameSubscription = () => {
    // 取消之前的订阅
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // 订阅游戏表的实时变化
    subscriptionRef.current = supabase
      .channel('games-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `status=eq.waiting`
        },
        (payload) => {
          // 当游戏状态变化时重新加载等待中的游戏
          loadWaitingGames();
        }
      )
      .subscribe((status) => {
        console.log('游戏订阅状态:', status);
      });
  };

  const createGame = async () => {
    setCreatingGame(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .insert([{
          name: `${currentUser.username}的游戏`,
          player1_id: currentUser.id,
          status: 'waiting'
        }])
        .select('*, player1:users!player1_id(*)')
        .single();

      if (!error && data) {
        onGameStart(data);
      }
    } catch (error) {
      console.error('创建游戏错误:', error);
    } finally {
      setCreatingGame(false);
    }
  };

  const joinGame = async (game: Game) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .update({
          player2_id: currentUser.id,
          status: 'preparing',
          updated_at: new Date().toISOString()
        })
        .eq('id', game.id)
        .select('*, player1:users!player1_id(*), player2:users!player2_id(*)')
        .single();

      if (!error && data) {
        onGameStart(data);
      }
    } catch (error) {
      console.error('加入游戏错误:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 用户统计信息 */}
      <UserStats user={currentUser} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 创建游戏区域 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">创建新游戏</h2>
          
          <button
            type="button"
            onClick={createGame}
            disabled={creatingGame}
            className="w-full bg-blue-500 text-black py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {creatingGame ? '创建中...' : '创建游戏房间'}
          </button>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">游戏规则</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 创建游戏后等待好友加入开始游戏</li>
              <li>• 录入4位随机数字，好友猜测</li>
              <li>• 轮流猜测数字，显示正确数字个数</li>
              <li>• 先猜中全部4个数字者获胜</li>
            </ul>
          </div>
        </div>

        {/* 等待加入的游戏 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">可加入的游戏</h2>
          
          {loading ? (
            <p className="text-gray-600">加载中...</p>
          ) : waitingGames.length === 0 ? (
            <p className="text-gray-600">暂无等待中的游戏</p>
          ) : (
            <div className="space-y-3">
              {waitingGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{game.name}</p>
                    <p className="text-sm text-gray-600">
                      创建者: {game.player1?.username}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => joinGame(game)}
                    className="bg-green-500 text-black px-4 py-2 rounded-lg hover:bg-green-600"
                  >
                    加入游戏
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 好友列表 */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">好友列表</h2>
          
          {friends.length === 0 ? (
            <p className="text-gray-600">暂无好友</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <div key={friend.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-black font-bold">
                      {friend.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-800">{friend.username}</p>
                      <p className="text-xs text-gray-500">{friend.email}</p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>游戏数:</span>
                      <span className="font-medium">{friend.total_games || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>胜场:</span>
                      <span className="font-medium text-green-600">{friend.wins || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>胜率:</span>
                      <span className="font-medium">
                        {friend.total_games ? 
                          ((friend.wins || 0) / friend.total_games * 100).toFixed(0) + '%' : 
                          '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}