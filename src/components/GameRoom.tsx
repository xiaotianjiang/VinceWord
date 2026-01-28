'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Game, GameRound, GameChat } from '@/types';

interface GameRoomProps {
  game: Game;
  currentUser: User;
  onGameEnd: () => void;
}

export default function GameRoom({ game, currentUser, onGameEnd }: GameRoomProps) {
  const [guess, setGuess] = useState('');
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [chats, setChats] = useState<GameChat[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await loadGameData();
    };
    
    loadData();
    const cleanup = setupRealtimeSubscription();
    
    return cleanup;
  }, [game.id]);

  useEffect(() => {
    // 检查是否轮到自己
    setIsMyTurn(game.current_player_id === currentUser.id && game.status === 'playing');
  }, [game, currentUser]);

  const loadGameData = async () => {
    try {
      // 加载游戏回合记录
      const { data: roundsData, error: roundsError } = await supabase
        .from('game_rounds')
        .select('*, player:users(*)')
        .eq('game_id', game.id)
        .order('created_at', { ascending: true });

      if (!roundsError && roundsData) {
        setRounds(roundsData);
      }

      // 加载游戏聊天记录
      const { data: chatsData, error: chatsError } = await supabase
        .from('game_chats')
        .select('*, player:users(*)')
        .eq('game_id', game.id)
        .order('created_at', { ascending: true });

      if (!chatsError && chatsData) {
        setChats(chatsData);
      }
    } catch (error) {
      console.error('加载游戏数据错误:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    // 订阅游戏回合更新
    const roundsSubscription = supabase
      .channel('game-rounds')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'game_rounds',
          filter: `game_id=eq.${game.id}`
        }, 
        (payload) => {
          // 获取新回合的完整数据
          supabase
            .from('game_rounds')
            .select('*, player:users(*)')
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setRounds(prev => [...prev, data]);
                // 检查游戏是否结束
                if (data.correct_count === 4) {
                  endGame(data.player_id);
                } else {
                  switchTurn();
                }
              }
            });
        }
      )
      .subscribe();

    // 订阅游戏状态更新
    const gameSubscription = supabase
      .channel('game-status')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'games',
          filter: `id=eq.${game.id}`
        }, 
        (payload) => {
          const updatedGame = payload.new;
          setIsMyTurn(updatedGame.current_player_id === currentUser.id && updatedGame.status === 'playing');
          
          if (updatedGame.status === 'completed') {
            // 游戏结束，可以显示结果
          }
        }
      )
      .subscribe();

    // 订阅游戏聊天
    const chatSubscription = supabase
      .channel('game-chats')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'game_chats',
          filter: `game_id=eq.${game.id}`
        }, 
        (payload) => {
          // 获取新消息的完整数据
          supabase
            .from('game_chats')
            .select('*, player:users(*)')
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setChats(prev => [...prev, data]);
              }
            });
        }
      )
      .subscribe();

    return () => {
      roundsSubscription.unsubscribe();
      gameSubscription.unsubscribe();
      chatSubscription.unsubscribe();
    };
  };

  const makeGuess = async () => {
    if (!guess || guess.length !== 4 || !/^\d{4}$/.test(guess)) {
      alert('请输入4位数字');
      return;
    }

    setLoading(true);
    try {
      // 计算正确数字个数
      const correctCount = calculateCorrectCount(guess, game.target_number);

      // 记录回合
      const { data, error } = await supabase
        .from('game_rounds')
        .insert([{
          game_id: game.id,
          player_id: currentUser.id,
          guess_number: guess,
          correct_count: correctCount
        }])
        .select('*, player:users(*)')
        .single();

      if (error) {
        console.error('记录回合错误:', error);
      } else {
        setGuess('');
      }
    } catch (error) {
      console.error('猜测错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCorrectCount = (guess: string, target: string): number => {
    let count = 0;
    for (let i = 0; i < 4; i++) {
      if (guess[i] === target[i]) {
        count++;
      }
    }
    return count;
  };

  const switchTurn = async () => {
    const nextPlayerId = game.player1_id === currentUser.id ? game.player2_id : game.player1_id;
    
    await supabase
      .from('games')
      .update({
        current_player_id: nextPlayerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', game.id);
  };

  const endGame = async (winnerId: string) => {
    await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_id: winnerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', game.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await supabase
        .from('game_chats')
        .insert([{
          game_id: game.id,
          player_id: currentUser.id,
          message: newMessage.trim()
        }]);

      setNewMessage('');
    } catch (error) {
      console.error('发送消息错误:', error);
    }
  };

  const leaveGame = async () => {
    if (game.status === 'playing') {
      // 如果游戏正在进行，标记为取消
      await supabase
        .from('games')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', game.id);
    }
    onGameEnd();
  };

  const getOpponent = () => {
    return game.player1_id === currentUser.id ? game.player2 : game.player1;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 游戏信息区域 */}
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">游戏信息</h2>
        
        <div className="space-y-3 mb-6">
          <div>
            <p className="text-sm text-gray-600">游戏名称</p>
            <p className="font-medium">{game.name}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">状态</p>
            <p className="font-medium capitalize">{game.status}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">对手</p>
            <p className="font-medium">{getOpponent()?.username || '等待中'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">当前回合</p>
            <p className="font-medium">
              {game.current_player_id === currentUser.id ? '你的回合' : '对手回合'}
            </p>
          </div>
        </div>

        {isMyTurn && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-blue-800 mb-3">你的回合</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="输入4位数字"
                maxLength={4}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={makeGuess}
                disabled={loading || guess.length !== 4}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '提交中...' : '提交'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={leaveGame}
          className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600"
        >
          离开游戏
        </button>
      </div>

      {/* 游戏记录区域 */}
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">游戏记录</h2>
        
        {rounds.length === 0 ? (
          <p className="text-gray-600">暂无游戏记录</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rounds.map((round) => (
              <div key={round.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{round.player?.username}</span>
                  <span className="text-sm text-gray-600">
                    {new Date(round.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-gray-700">猜测: {round.guess_number}</span>
                  <span className="ml-3 text-green-600 font-semibold">
                    正确: {round.correct_count}/4
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 聊天区域 */}
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">游戏聊天</h2>
        
        <div className="h-96 overflow-y-auto mb-4 space-y-2">
          {chats.length === 0 ? (
            <p className="text-gray-600">暂无聊天消息</p>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="p-2 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm">
                    {chat.player?.username}:
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(chat.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-700 mt-1">{chat.message}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}