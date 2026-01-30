'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Game, GameRound, GameChat } from '@/types';

interface GameRoomProps {
  game: Game;
  currentUser: User;
  onGameEnd: () => void;
}

export default function GameRoom({ game: initialGame, currentUser, onGameEnd }: GameRoomProps) {
  const [game, setGame] = useState(initialGame);
  const [guess, setGuess] = useState('');
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [chats, setChats] = useState<GameChat[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [myNumber, setMyNumber] = useState('');
  const [currentGameStartIndex, setCurrentGameStartIndex] = useState(0);
  const [bubbles, setBubbles] = useState<Array<{id: number, text: string, x: number, y: number, color: string}>>([]);

  useEffect(() => {
    const loadData = async () => {
      await loadGameData();
    };
    
    loadData();
    
    // 设置轮询定时器，每隔1秒更新一次数据
    const pollInterval = setInterval(loadGameData, 1000);
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [game.id]);



  const loadGameData = async () => {
    try {
      // 加载最新游戏状态
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', game.id)
        .single();

      if (!gameError && gameData) {
        setGame(prev => ({ ...prev, ...gameData }));
        setIsMyTurn(gameData.current_player_id === currentUser.id && gameData.status === 'playing');
        
        // 检查准备状态
        if (gameData.status === 'preparing') {
          const hasNumber = gameData.player1_id === currentUser.id 
            ? gameData.player1_number 
            : gameData.player2_number;
          setIsReady(!!hasNumber);
        }
        
        // 更新本地数字状态（任何阶段）
        if (gameData.player1_id === currentUser.id && gameData.player1_number) {
          setMyNumber(gameData.player1_number);
        } else if (gameData.player2_id === currentUser.id && gameData.player2_number) {
          setMyNumber(gameData.player2_number);
        }
      }

      // 加载游戏回合记录
      const { data: roundsData, error: roundsError } = await supabase
        .from('game_rounds')
        .select('*, player:users(*)')
        .eq('game_id', game.id)
        .order('created_at', { ascending: true });

      if (!roundsError && roundsData) {
        setRounds(roundsData);
        // 如果是新游戏，设置起始索引
        if (gameData.status === 'preparing' && currentGameStartIndex === 0 && roundsData.length > 0) {
          setCurrentGameStartIndex(roundsData.length);
        }
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



  const makeGuess = async () => {
    if (!guess || guess.length !== 4 || !/^\d{4}$/.test(guess)) {
      alert('请输入4位数字');
      return;
    }

    setLoading(true);
    try {
      // 获取对手的数字
      const opponentNumber = game.player1_id === currentUser.id 
        ? game.player2_number 
        : game.player1_number;

      if (!opponentNumber) {
        alert('对手尚未设置数字');
        return;
      }

      // 计算正确数字个数
      const correctCount = calculateCorrectCount(guess, opponentNumber);

      // 计算当前回合数（每两个记录为一个完整回合）
      const currentRoundNumber = Math.floor((rounds.length - currentGameStartIndex) / 2) + 1;

      // 记录回合
      const { data, error } = await supabase
        .from('game_rounds')
        .insert([{
          game_id: game.id,
          player_id: currentUser.id,
          guess_number: guess,
          correct_count: correctCount,
          round_number: currentRoundNumber
        }])
        .select('*, player:users(*)')
        .single();

      if (error) {
        console.error('记录回合错误:', error);
      } else {
        setGuess('');
        // 立即更新回合记录
        setRounds(prev => [...prev, data]);
        
        // 如果猜中4个正确数字，结束游戏
        if (data && data.correct_count === 4) {
          await endGame(currentUser.id);
          const totalRounds = Math.max(0, rounds.length - currentGameStartIndex) + 1; // 只计算当前游戏的轮数
          alert(`恭喜！你猜中了对手的数字！\n游戏结束，你获胜！\n总共进行了 ${totalRounds} 轮猜测\n你的答案: ${guess}\n正确答案: ${opponentNumber}`);
        } else {
          // 转换回合（除非游戏结束）
          await switchTurn();
        }
        
        // 强制状态更新以确保界面刷新
        setTimeout(() => {
          setLoading(prev => !prev);
          setLoading(prev => !prev);
        }, 100);
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
    
    // 立即更新本地状态
    setGame(prev => ({ ...prev, current_player_id: nextPlayerId }));
    setIsMyTurn(nextPlayerId === currentUser.id && game.status === 'playing');
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

  const restartGame = async () => {
    try {
      // 重置游戏状态为准备中，清空数字但保留回合记录
      await supabase
        .from('games')
        .update({
          status: 'preparing',
          player1_number: null,
          player2_number: null,
          current_player_id: null,
          winner_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', game.id);
      
      // 重置本地状态
      setIsReady(false);
      setMyNumber('');
      setGuess('');
      setIsMyTurn(false);
      // 设置当前游戏的起始回合索引为当前回合数
      setCurrentGameStartIndex(rounds.length);
      
      // 重新加载游戏数据
      await loadGameData();
    } catch (error) {
      console.error('重新开始游戏错误:', error);
    }
  };

  const markReady = async () => {
    try {
      // 弹出输入框让用户输入4位数字
      const number = prompt('请输入你的4位数字：');
      if (!number || number.length !== 4 || !/^\d{4}$/.test(number)) {
        alert('请输入有效的4位数字');
        return;
      }

      // 保存到本地状态
      setMyNumber(number);

      // 更新当前玩家的数字
      if (game.player1_id === currentUser.id) {
        await supabase
          .from('games')
          .update({
            player1_number: number
          })
          .eq('id', game.id);
      } else if (game.player2_id === currentUser.id) {
        await supabase
          .from('games')
          .update({
            player2_number: number
          })
          .eq('id', game.id);
      }
      
      setIsReady(true);
      
      // 检查是否双方都准备好了
      const { data: updatedGame } = await supabase
        .from('games')
        .select('player1_number, player2_number')
        .eq('id', game.id)
        .single();
      
      if (updatedGame && updatedGame.player1_number && updatedGame.player2_number) {
        // 随机选择先手玩家
        const firstPlayerId = Math.random() > 0.5 ? game.player1_id : game.player2_id;
        
        await supabase
          .from('games')
          .update({
            status: 'playing',
            current_player_id: firstPlayerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', game.id);
      }
    } catch (error) {
      console.error('准备错误:', error);
      setIsReady(false);
    }
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

  const createBubble = (e: React.MouseEvent, text: string) => {
    const id = Date.now();
    // 生成随机颜色
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F9A826', '#6C5CE7', '#FD79A8', '#00B894', '#E17055'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newBubble = {
      id,
      text,
      x: e.clientX,
      y: e.clientY,
      color: randomColor
    };
    
    setBubbles(prev => [...prev, newBubble]);
    
    // 3秒后自动移除气泡
    setTimeout(() => {
      setBubbles(prev => prev.filter(bubble => bubble.id !== id));
    }, 2000);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // 只有邮箱是 admin@vinceword.com 的用户才能触发气泡
    if (currentUser.email === 'Gino@vinceword.com') {
      const texts = ['我发4，我是最喜欢你的!', '哥哥好棒啊!', '帅爆了哥哥', '❤❤❤', '哥哥真厉害!', '哥哥太强了!', '来嘛来嘛', '冲!', '😗', '我想你了！', '爱你哟！', '亲亲你！', 'Love Gino哥！', '哥哥，我想你了！', '😘', '🎉', '想了你好多次！', ''];
      const randomText = texts[Math.floor(Math.random() * texts.length)];
      createBubble(e, randomText);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" onClick={handleContainerClick}>
      {/* 气泡效果 */}
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className="bubble"
          style={{
            left: bubble.x,
            top: bubble.y,
            color: bubble.color
          }}
        >
          {bubble.text}
        </div>
      ))}
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
          
          {/* 显示自己输入的数字 */}
          {myNumber && (
            <div>
              <p className="text-sm text-gray-600">你的数字</p>
              <p className="font-medium text-green-600">{myNumber}</p>
            </div>
          )}
        </div>

        {game.status === 'preparing' && (
          <div className="bg-yellow-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-yellow-800 mb-3">准备阶段</h3>
            <p className="text-sm text-yellow-700 mb-3">
              等待双方准备...
            </p>
            <button
              onClick={markReady}
              disabled={isReady}
              className="w-full bg-yellow-500 text-black py-2 px-4 rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              {isReady ? '已准备' : '准备开始'}
            </button>
          </div>
        )}

        {isMyTurn && game.status === 'playing' && !game.winner_id && (
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
                className="bg-blue-500 text-black px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '提交中...' : '提交'}
              </button>
            </div>
          </div>
        )}

        {game.status === 'completed' && (
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-green-800 mb-3">游戏结束</h3>
            <p className="text-sm text-green-700 mb-2">
              {game.winner_id === currentUser.id ? '🎉 恭喜你获胜！' : '🤖 对手获胜了！'}
            </p>
            <p className="text-sm text-green-700 mb-2">
              总共进行了 {Math.max(0, rounds.length - currentGameStartIndex)} 轮猜测
            </p>
            <p className="text-sm text-green-700 mb-2">
              你的数字: {myNumber || '未设置'}
            </p>
            <p className="text-sm text-green-700 mb-3">
              对手数字: {game.player1_id === currentUser.id ? game.player2_number || '未知' : game.player1_number || '未知'}
            </p>
            <button
              onClick={restartGame}
              className="w-full bg-green-500 text-black py-2 px-4 rounded-lg hover:bg-green-600 mb-2"
            >
              开始新的一轮
            </button>
          </div>
        )}

        <button
          onClick={leaveGame}
          className="w-full bg-red-500 text-black py-2 px-4 rounded-lg hover:bg-red-600"
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
          <div className="max-h-96 overflow-y-auto">
            {/* 按回合分组显示 - 紧凑表格布局 */}
            {(() => {
              const currentGameRounds = rounds.filter((_, index) => index >= currentGameStartIndex);
              const groupedRounds: {[key: number]: GameRound[]} = {};
              
              currentGameRounds.forEach(round => {
                const roundNum = round.round_number || 1;
                if (!groupedRounds[roundNum]) {
                  groupedRounds[roundNum] = [];
                }
                groupedRounds[roundNum].push(round);
              });
              
              // 按回合数倒序排列
              const sortedRoundNumbers = Object.keys(groupedRounds)
                .map(Number)
                .sort((a, b) => b - a);
              
              return (
                <div className="space-y-2">
                  {/* 表头 */}
                  <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-gray-600 pb-2 border-b">
                    <div className="col-span-2 bg-blue-100 p-1 rounded border border-blue-200">回合</div>
                    <div className="col-span-5 bg-red-100 p-1 rounded border border-red-200">对手</div>
                    <div className="col-span-5 bg-green-100 p-1 rounded border border-green-200">自己</div>
                  </div>
                  
                  {/* 数据行 */}
                  {sortedRoundNumbers.map(roundNumber => {
                    const roundData = groupedRounds[roundNumber];
                    const opponentRound = roundData.find(round => round.player_id !== currentUser.id);
                    const myRound = roundData.find(round => round.player_id === currentUser.id);
                    
                    return (
                      <div key={roundNumber} className="grid grid-cols-12 gap-1 text-sm py-1 hover:bg-gray-50 rounded">
                        {/* 回合号 */}
                        <div className="col-span-2 font-medium text-blue-800 flex items-center bg-blue-50 p-1 rounded border border-blue-100">
                          第{roundNumber}回
                        </div>
                        
                        {/* 对手数据  */}
                        <div className="col-span-5 bg-red-50 p-1 rounded border border-red-100">
                          {opponentRound ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-red-700 font-medium">{opponentRound.guess_number}</span>
                              <span className="text-green-700 text-xs bg-green-100 px-1 rounded border border-green-200 font-bold">✓{opponentRound.correct_count}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                        
                        {/* 自己数据 */}
                        <div className="col-span-5 bg-green-50 p-1 rounded border border-green-100">
                          {myRound ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-blue-700 font-medium">{myRound.guess_number}</span>
                              <span className="text-green-700 text-xs bg-green-100 px-1 rounded border border-green-200 font-bold">✓{myRound.correct_count}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
            className="bg-blue-500 text-black px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}