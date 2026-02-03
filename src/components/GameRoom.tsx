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
  const [bubbles, setBubbles] = useState<Array<{id: number, text: string, x: number, y: number, color: string}>>([]);
  const [bubbleTexts, setBubbleTexts] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      await loadGameData();
      await loadBubbleTexts();
    };
    
    loadData();
    
    // 设置 Supabase 实时订阅
    const gamesSubscription = supabase
      .channel('game-changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'games',
          filter: `id=eq.${game.id}`
        }, 
        async (payload) => {
          console.log('游戏状态更新:', payload.new);
          
          // 重新加载完整的游戏数据（包括玩家信息）
          await loadGameData();
          
          const updatedGame = payload.new as Game;
          setIsMyTurn(updatedGame.current_player_id === currentUser.id && updatedGame.status === 'playing');
          
          // 检查游戏是否被取消
          if (updatedGame.status === 'cancelled') {
            // 游戏被取消，自动退出游戏
            onGameEnd();
            return;
          }
          
          // 检查准备状态
          if (updatedGame.status === 'preparing') {
            const hasNumber = updatedGame.player1_id === currentUser.id 
              ? updatedGame.player1_number 
              : updatedGame.player2_number;
            setIsReady(!!hasNumber);
          }
          
          // 更新本地数字状态
          if (updatedGame.player1_id === currentUser.id && updatedGame.player1_number) {
            setMyNumber(updatedGame.player1_number);
          } else if (updatedGame.player2_id === currentUser.id && updatedGame.player2_number) {
            setMyNumber(updatedGame.player2_number);
          }
        }
      )
      .subscribe();

    const roundsSubscription = supabase
      .channel('rounds-changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'game_rounds',
          filter: `game_id=eq.${game.id}`
        }, 
        async (payload) => {
          console.log('新回合记录:', payload.new);
          // 获取完整的回合数据（包含用户信息）
          const { data: roundWithUser } = await supabase
            .from('game_rounds')
            .select('*, player:users(*)')
            .eq('id', payload.new.id)
            .single();
          
          if (roundWithUser) {
            setRounds(prev => [...prev, roundWithUser]);
          }
        }
      )
      .subscribe();

    const chatsSubscription = supabase
      .channel('chats-changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'game_chats',
          filter: `game_id=eq.${game.id}`
        }, 
        async (payload) => {
          console.log('新聊天消息:', payload.new);
          // 获取完整的聊天数据（包含用户信息）
          const { data: chatWithUser } = await supabase
            .from('game_chats')
            .select('*, player:users(*)')
            .eq('id', payload.new.id)
            .single();
          
          if (chatWithUser) {
            setChats(prev => [...prev, chatWithUser]);
          }
        }
      )
      .subscribe();
    
    return () => {
      // 清理订阅
      gamesSubscription.unsubscribe();
      roundsSubscription.unsubscribe();
      chatsSubscription.unsubscribe();
    };
  }, [game.id, currentUser.id]);



  const loadGameData = async () => {
    try {
      // 初始加载所有数据
      const [gamesResult, roundsResult, chatsResult] = await Promise.all([
        supabase
          .from('games')
          .select('*, player1:users!player1_id(*), player2:users!player2_id(*)')
          .eq('id', game.id)
          .single(),
        
        supabase
          .from('game_rounds')
          .select('*, player:users(*)')
          .eq('game_id', game.id)
          .order('created_at', { ascending: true }),
        
        supabase
          .from('game_chats')
          .select('*, player:users(*)')
          .eq('game_id', game.id)
          .order('created_at', { ascending: true })
      ]);

      if (!gamesResult.error && gamesResult.data) {
        const gameData = gamesResult.data;
        setGame(prev => ({ ...prev, ...gameData }));
        setIsMyTurn(gameData.current_player_id === currentUser.id && gameData.status === 'playing');
        
        // 检查准备状态
        if (gameData.status === 'preparing') {
          const hasNumber = gameData.player1_id === currentUser.id 
            ? gameData.player1_number 
            : gameData.player2_number;
          setIsReady(!!hasNumber);
        }
        
        // 更新本地数字状态
        if (gameData.player1_id === currentUser.id && gameData.player1_number) {
          setMyNumber(gameData.player1_number);
        } else if (gameData.player2_id === currentUser.id && gameData.player2_number) {
          setMyNumber(gameData.player2_number);
        }
      }

      if (!roundsResult.error && roundsResult.data) {
        setRounds(roundsResult.data);
      }

      if (!chatsResult.error && chatsResult.data) {
        setChats(chatsResult.data);
      }
    } catch (error) {
      console.error('加载游戏数据错误:', error);
    }
  };

  const loadBubbleTexts = async () => {
    try {
      // 首先查询当前用户的气泡文本
      const { data: userData, error: userError } = await supabase
        .from('user_bubbles')
        .select('bubble_text')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });
      
      if (!userError && userData && userData.length > 0) {
        // 如果当前用户有气泡文本，使用用户的文本
        const texts = userData.map(item => item.bubble_text).filter(text => text.trim() !== '');
        setBubbleTexts(texts);
        return;
      }
      
      // 如果当前用户没有气泡文本，查询 user_id 为空的默认气泡文本
      const { data: defaultData, error: defaultError } = await supabase
        .from('user_bubbles')
        .select('bubble_text')
        .is('user_id', null)
        .order('created_at', { ascending: true });
      
      if (!defaultError && defaultData && defaultData.length > 0) {
        // 使用默认气泡文本
        const texts = defaultData.map(item => item.bubble_text).filter(text => text.trim() !== '');
        setBubbleTexts(texts);
      }
    } catch (error) {
      console.error('加载气泡文本错误:', error);
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

      // 计算当前回合数
      let currentRoundNumber = 1;
      if (rounds.length > 0) {
        // 获取最大的回合数
        const maxRoundNumber = Math.max(...rounds.map(round => round.round_number || 1));
        
        // 检查当前最大回合数是否有两个不同玩家的记录
        const roundsInMaxRound = rounds.filter(round => round.round_number === maxRoundNumber);
        const uniquePlayersInRound = new Set(roundsInMaxRound.map(round => round.player_id));
        
        if (uniquePlayersInRound.size === 2) {
          // 两个玩家都完成了这一回合，进入下一回合
          currentRoundNumber = maxRoundNumber + 1;
        } else {
          // 只有一个玩家完成了这一回合，保持当前回合
          currentRoundNumber = maxRoundNumber;
        }
      }
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
        
        // 如果猜中4个正确数字，结束游戏
        if (data && data.correct_count === 4) {
          await endGame(currentUser.id);
          // 不再显示alert，让用户在UI上看到结果
        } else {
          // 转换回合（除非游戏结束）
          await switchTurn();
        }
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
    const { error } = await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_id: winnerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', game.id);
    
    if (!error) {
      // 给数据库触发器一点时间更新统计信息
      setTimeout(() => {
        // 重新加载游戏数据以获取更新后的统计信息
        loadGameData();
      }, 1000);
    }
  };

  const restartGame = async () => {
    try {
      // 暂停实时订阅以避免旧数据干扰
      const cleanupSubscriptions = () => {
        // 这里需要保存和恢复订阅状态，但为了简化，我们直接重新加载数据
      };
      
      // 清空当前游戏的回合记录
      const { error: deleteError } = await supabase
        .from('game_rounds')
        .delete()
        .eq('game_id', game.id);
      
      if (deleteError) {
        console.error('删除回合记录错误:', deleteError);
      }
      
      // 重置游戏状态为准备中，清空数字
      const { error: updateError } = await supabase
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
      
      if (updateError) {
        console.error('更新游戏状态错误:', updateError);
      }
      
      // 完全重置本地状态
      setRounds([]);
      setGuess('');
      setIsMyTurn(false);
      setIsReady(false);
      setMyNumber('');
      
      // 清除聊天记录（可选）
      // await supabase.from('game_chats').delete().eq('game_id', game.id);
      // setChats([]);
      
      // 给数据库一点时间处理，然后重新加载游戏数据
      setTimeout(async () => {
        await loadGameData();
      }, 500);
      
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
        // 清空之前的回合记录（游戏开始时重置）
        await supabase
          .from('game_rounds')
          .delete()
          .eq('game_id', game.id);
        
        // 重置本地回合状态
        setRounds([]);
        
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
    try {
      // 检查是否是房主（创建者）离开
      const isHostLeaving = game.player1_id === currentUser.id;
      
      if (isHostLeaving) {
        // 房主离开，直接取消整个游戏
        await supabase
          .from('games')
          .update({
            status: 'cancelled',
            player1_id: null,
            player2_id: null,
            player1_number: null,
            player2_number: null,
            current_player_id: null,
            winner_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', game.id);
        
        // 清空当前游戏的回合记录
        await supabase
          .from('game_rounds')
          .delete()
          .eq('game_id', game.id);
        
      } else {
        // 普通玩家离开
        let updateData: any = {
          updated_at: new Date().toISOString()
        };
        
        if (game.player1_id === currentUser.id) {
          updateData.player1_id = null;
          updateData.player1_number = null;
        } else if (game.player2_id === currentUser.id) {
          updateData.player2_id = null;
          updateData.player2_number = null;
        }
        
        // 检查是否两个玩家都离开了
        const willBothPlayersLeave = 
          (game.player1_id === currentUser.id && !game.player2_id) ||
          (game.player2_id === currentUser.id && !game.player1_id);
        
        if (willBothPlayersLeave) {
          // 两个玩家都离开，取消游戏
          updateData.status = 'cancelled';
          updateData.current_player_id = null;
          updateData.winner_id = null;
        } else {
          // 只有一个玩家离开，游戏回到等待状态
          updateData.status = 'waiting';
          updateData.current_player_id = null;
          updateData.winner_id = null;
          // 清空数字和回合记录，但保留游戏
          updateData.player1_number = null;
          updateData.player2_number = null;
        }
        
        await supabase
          .from('games')
          .update(updateData)
          .eq('id', game.id);
        
        // 清空当前游戏的回合记录
        if (willBothPlayersLeave) {
          await supabase
            .from('game_rounds')
            .delete()
            .eq('game_id', game.id);
        }
      }
      
      onGameEnd();
    } catch (error) {
      console.error('离开游戏错误:', error);
      onGameEnd(); // 即使出错也调用 onGameEnd
    }
  };

  const getOpponent = () => {
    return game.player1_id === currentUser.id ? game.player2 : game.player1;
  };

  const renderPlayerStats = (player: User | undefined, label: string) => {
    if (!player) return null;
    
    const totalGames = player.total_games || 0;
    const wins = player.wins || 0;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
    
    return (
      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-sm font-medium text-gray-800 mb-2">{label}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-gray-600">游戏数:</div>
          <div className="font-medium">{totalGames}</div>
          
          <div className="text-gray-600">胜场:</div>
          <div className="font-medium text-green-600">{wins}</div>
          
          <div className="text-gray-600">胜率:</div>
          <div className="font-medium">{winRate}%</div>
        </div>
      </div>
    );
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
    if (bubbleTexts.length > 0) {
      const randomText = bubbleTexts[Math.floor(Math.random() * bubbleTexts.length)];
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
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md relative">
        {/* 离开游戏按钮 - 顶部左上角 */}
        <button
          onClick={leaveGame}
          className="absolute top-4 left-4 bg-red-500 text-black py-1 px-3 rounded-lg hover:bg-red-600 opacity-70 hover:opacity-100 transition-opacity text-sm"
        >
          离开游戏
        </button>
        
        <h2 className="text-xl font-semibold mb-4 text-center">游戏信息</h2>
        
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
          
          {/* 双方战绩显示 */}
          {game.player1 && game.player2 && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-800 mb-2">玩家战绩</p>
              <div className="grid grid-cols-2 gap-3">
                {renderPlayerStats(game.player1, game.player1.username)}
                {renderPlayerStats(game.player2, game.player2.username)}
              </div>
            </div>
          )}
          
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
                {loading ? '提交中' : '提交'}
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
              总共进行了 {Math.max(0, rounds.reduce((acc, cur) => acc > cur.round_number ? acc : cur.round_number, -Infinity))} 轮猜测
            </p>
            <p className="text-sm text-green-700 mb-2">
              你的数字: {myNumber || '未设置'}
            </p>
            <p className="text-sm text-green-700 mb-3">
              对手数字: {game.player1_id === currentUser.id ? game.player2_number || '未知' : game.player1_number || '未知'}
            </p>
            <div className="space-y-2">
              <button
                onClick={restartGame}
                className="w-full bg-green-500 text-black py-2 px-4 rounded-lg hover:bg-green-600"
              >
                开始新的一轮
              </button>
              <button
                onClick={onGameEnd}
                className="w-full bg-gray-500 text-black py-2 px-4 rounded-lg hover:bg-gray-600"
              >
                返回大厅
              </button>
            </div>
          </div>
        )}


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
              const groupedRounds: {[key: number]: GameRound[]} = {};
              
              rounds.forEach(round => {
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
                    <div className="col-span-4 bg-blue-100 p-1 rounded border border-blue-200">回合</div>
                    <div className="col-span-4 bg-red-100 p-1 rounded border border-red-200">对手</div>
                    <div className="col-span-4 bg-green-100 p-1 rounded border border-green-200">自己</div>
                  </div>
                  
                  {/* 数据行 */}
                  {sortedRoundNumbers.map(roundNumber => {
                    const roundData = groupedRounds[roundNumber];
                    const opponentRound = roundData.find(round => round.player_id !== currentUser.id);
                    const myRound = roundData.find(round => round.player_id === currentUser.id);
                    
                    return (
                      <div key={roundNumber} className="grid grid-cols-12 gap-1 text-sm py-1 hover:bg-gray-50 rounded">
                        {/* 回合号 */}
                        <div className="col-span-4 font-medium text-blue-800 flex items-center bg-blue-50 p-1 rounded border border-blue-100">
                          第{roundNumber}回
                        </div>
                        
                        {/* 对手数据  */}
                        <div className="col-span-4 bg-red-50 p-1 rounded border border-red-100">
                          {opponentRound ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-red-700 font-medium">{opponentRound.guess_number}</span>
                              <span className="text-green-700 text-xs bg-green-100 px-1 rounded border border-green-200 font-bold">✓{opponentRound.correct_count}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">思考中...</span>
                          )}
                        </div>
                        
                        {/* 自己数据 */}
                        <div className="col-span-4 bg-green-50 p-1 rounded border border-green-100">
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