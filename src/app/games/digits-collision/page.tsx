'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionLevel, checkPermission } from '@/lib/permission';
import { getCurrentUser } from '@/lib/session';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// 导入 SSE 管理模块
import { sseManager, useSSE } from '@/lib/sse';

// 导入游戏 API 客户端
import { roomApi, gameApi, statsApi, Room, Player, Game, Guess, Stats, GameHistory } from '@/lib/gameApi';

function DigitsCollisionPage() {
  // 状态管理
  const [activeTab, setActiveTab] = useState<'rooms' | 'room' | 'game' | 'stats'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<Player[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [playerStats, setPlayerStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // 表单状态
  const [roomName, setRoomName] = useState<string>('');
  const [digitCount, setDigitCount] = useState<number>(4);
  const [canSpectate, setCanSpectate] = useState<boolean>(true);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [selectedSeat, setSelectedSeat] = useState<number>(2);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [guessInput, setGuessInput] = useState<string>('');
  const [isSpectator, setIsSpectator] = useState<boolean>(false);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState<boolean>(false);
  
  // 房间ID引用
  const roomIdRef = useRef<number | null>(null);
  
  // 获取玩家ID和用户名（必须登录）
  const getPlayerInfo = async () => {
    try {
      // 尝试获取当前登录用户
      const user = await getCurrentUser();
      if (user && user.id && user.username) {
        // 使用登录用户ID和用户名
        setPlayerId(user.id);
        setPlayerName(user.username);
        // 设置默认房间名称
        setRoomName(`玩家${user.username}的房间`);
      } else {
        // 未登录，不设置玩家信息
        setPlayerId('');
        setPlayerName('');
        setRoomName('');
      }
    } catch (error) {
      console.error('获取玩家信息错误:', error);
      // 出错时不设置玩家信息
      setPlayerId('');
      setPlayerName('');
      setRoomName('');
    }
  };

  useEffect(() => {
    getPlayerInfo();
  }, []);

  // 检查用户是否已在房间中
  const checkMyRoom = useCallback(async () => {
    try {
      console.log('开始检查用户房间...');
      const response = await roomApi.getMyRoom();
      console.log('房间检查结果:', response);
      if (response.inRoom && response.room) {
        // 用户已在房间中，直接进入房间
        console.log('用户已在房间中，进入房间:', response.room);
        setCurrentRoom(response.room);
        if (response.players) {
          setRoomPlayers(response.players);
          // 初始化当前玩家的准备状态
          const currentPlayer = response.players.find(p => p.player_id === playerId);
          if (currentPlayer) {
            setIsReady(currentPlayer.is_ready);
          }
        }
        setActiveTab('room');
        // 连接 SSE
        sseManager.connect(response.room.id);
      } else {
        console.log('用户不在房间中');
      }
    } catch (error) {
      console.error('检查用户房间错误:', error);
    }
  }, [playerId]);

  // 获取玩家信息后，检查是否已在房间中
  useEffect(() => {
    if (playerId) {
      checkMyRoom();
    }
  }, [playerId, checkMyRoom]);

  // 获取房间列表
  const fetchRooms = async () => {
    try {
      const response = await roomApi.getRooms();
      setRooms(response.rooms);
    } catch (error) {
      console.error('获取房间列表错误:', error);
    }
  };

  // 初始化房间列表（仅在用户不在房间中时）
  useEffect(() => {
    if (playerId && activeTab === 'rooms' && !currentRoom) {
      fetchRooms();
    }
  }, [playerId, activeTab, currentRoom]);
  
  // 获取玩家统计数据
  useEffect(() => {
    if (playerId) {
      const fetchStats = async () => {
        try {
          // 先从缓存获取
          const cachedStats = localStorage.getItem(`dc_stats_${playerId}`);
          if (cachedStats) {
            setPlayerStats(JSON.parse(cachedStats));
          }
          
          // 然后从API获取最新数据
          const data = await statsApi.getStats(playerId);
          setPlayerStats(data);
          // 更新缓存
          localStorage.setItem(`dc_stats_${playerId}`, JSON.stringify(data));
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      };
      
      fetchStats();
    }
  }, [playerId]);
  
  // 创建房间
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证房间名称
    if (!roomName || roomName.trim().length === 0) {
      alert('房间名称不能为空');
      return;
    }
    
    if (roomName.length > 50) {
      alert('房间名称不能超过50个字符');
      return;
    }
    
    // 验证房间名称只包含合法字符
    const validRoomNamePattern = /^[a-zA-Z0-9\u4e00-\u9fa5\s_\-]+$/;
    if (!validRoomNamePattern.test(roomName)) {
      alert('房间名称只能包含字母、数字、中文、空格、下划线和连字符');
      return;
    }
    
    try {
      const response = await roomApi.createRoom({
        name: roomName,
        host_id: playerId,
        can_spectate: canSpectate,
        digit_count: digitCount
      });
      
      if (response.room) {
        // 手动将新创建的房间添加到房间列表中
        setRooms(prevRooms => [response.room, ...prevRooms]);
        // 关闭弹框
        setShowCreateRoomModal(false);
        // 设置当前房间并切换到房间页面
        setCurrentRoom(response.room);
        setActiveTab('room');
        // 保存房间ID到引用
        roomIdRef.current = response.room.id;
        // 获取房间玩家
        const roomResponse = await roomApi.getRoom(response.room.id);
        if (roomResponse.players) {
          setRoomPlayers(roomResponse.players);
          // 初始化当前玩家的准备状态
          const currentPlayer = roomResponse.players.find(p => p.player_id === playerId);
          if (currentPlayer) {
            setIsReady(currentPlayer.is_ready);
          }
        }
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('创建房间失败');
    }
  };
  
  // 加入房间
  const handleJoinRoom = async (roomId: number) => {
    try {
      const response = await roomApi.joinRoom(roomId, {
        player_id: playerId,
        seat: selectedSeat
      });
      
      if (response.player) {
        // 获取房间信息
        const roomResponse = await roomApi.getRoom(roomId);
        if (roomResponse.room && roomResponse.players) {
          setCurrentRoom(roomResponse.room);
          setRoomPlayers(roomResponse.players);
          setIsSpectator(response.isSpectator || false);
          setActiveTab('room');
          // 保存房间ID到引用
          roomIdRef.current = roomId;
          // 初始化当前玩家的准备状态
          const currentPlayer = roomResponse.players.find(p => p.player_id === playerId);
          if (currentPlayer) {
            setIsReady(currentPlayer.is_ready);
          }
        }
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('加入房间失败');
    }
  };
  
  // 离开房间
  const handleLeaveRoom = async () => {
    if (!currentRoom) return;
    
    try {
      // 只有非观战者才需要发送离开请求
      if (!isSpectator) {
        await roomApi.leaveRoom(currentRoom.id, {
          player_id: playerId
        });
      }
      
      setCurrentRoom(null);
      setRoomPlayers([]);
      setCurrentGame(null);
      setGuesses([]);
      setIsSpectator(false);
      setActiveTab('rooms');
      roomIdRef.current = null;
    } catch (error) {
      console.error('Error leaving room:', error);
      alert('离开房间失败');
    }
  };
  
  // 观战房间
  const handleSpectateRoom = async (roomId: number) => {
    try {
      const roomResponse = await roomApi.getRoom(roomId);
      if (roomResponse.room && roomResponse.game) {
        setCurrentRoom(roomResponse.room);
        setCurrentGame(roomResponse.game);
        if (roomResponse.game) {
          const gameResponse = await gameApi.getGame(roomResponse.game.id);
          if (gameResponse.guesses) {
            setGuesses(gameResponse.guesses);
          }
        }
        setIsSpectator(true);
        setActiveTab('game');
        roomIdRef.current = roomId;
      }
    } catch (error) {
      console.error('Error spectating room:', error);
      alert('观战失败');
    }
  };
  
  // 切换准备状态
  const handleToggleReady = async () => {
    if (!currentRoom) return;
    
    try {
      const response = await roomApi.setReady(currentRoom.id, {
        player_id: playerId,
        is_ready: !isReady
      });
      
      if (response.player) {
        setIsReady(response.player.is_ready);
        // 检查是否所有玩家都已准备
        if (response.allReady && response.game) {
          setCurrentGame(response.game);
          setActiveTab('game');
        }
      }
    } catch (error) {
      console.error('Error toggling ready state:', error);
      alert('更新准备状态失败');
    }
  };
  
  // 提交猜测
  const handleSubmitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentGame || !guessInput) return;
    
    // 验证猜测输入
    const digitCount = currentGame.digit_count;
    if (guessInput.length !== digitCount) {
      alert(`请输入${digitCount}位数字`);
      return;
    }
    
    // 验证输入是否全为数字
    const isAllDigits = /^\d+$/.test(guessInput);
    if (!isAllDigits) {
      alert('只能输入数字');
      return;
    }
    
    // 验证数字是否有重复
    const hasDuplicates = new Set(guessInput.split('')).size !== digitCount;
    if (hasDuplicates) {
      alert('数字不能重复');
      return;
    }
    
    try {
      const response = await gameApi.submitGuess(currentGame.id, {
        guesser_id: playerId,
        guess: guessInput
      });
      
      if (response.guess) {
        setGuesses(prev => [...prev, response.guess]);
        setGuessInput('');
        // 更新游戏状态
        if (response.gameStatus) {
          setCurrentGame(prev => prev ? { ...prev, status: response.gameStatus, winner_id: response.winner_id } : null);
        }
      }
    } catch (error) {
      console.error('Error submitting guess:', error);
      alert('提交猜测失败');
    }
  };
  
  // 重新开始游戏
  const handleRestartGame = () => {
    setCurrentGame(null);
    setGuesses([]);
    setIsReady(false);
    setActiveTab('room');
  };
  
  // 获取历史对局记录
  const fetchGameHistory = useCallback(async () => {
    if (!playerId) return;
    
    setHistoryLoading(true);
    try {
      const response = await statsApi.getHistory(playerId);
      if (response.history) {
        setGameHistory(response.history);
      }
    } catch (error) {
      console.error('Error fetching game history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [playerId]);
  
  // 当切换到统计标签页时获取历史对局记录
  useEffect(() => {
    if (activeTab === 'stats' && playerId) {
      fetchGameHistory();
    }
  }, [activeTab, playerId, fetchGameHistory]);

  // SSE 事件处理
  useSSE(roomIdRef.current, {
    player_joined: (data) => {
      console.log('Player joined:', data);
      setRoomPlayers(prev => {
        const existingIndex = prev.findIndex(p => p.player_id === data.player.player_id);
        if (existingIndex >= 0) {
          return prev;
        }
        return [...prev, data.player];
      });
    },
    player_left: (data) => {
      console.log('Player left:', data);
      setRoomPlayers(prev => prev.filter(p => p.player_id !== data.player_id));
    },
    player_ready: (data) => {
      console.log('Player ready:', data);
      setRoomPlayers(prev => prev.map(p => 
        p.player_id === data.player.player_id ? data.player : p
      ));
      if (data.player.player_id === playerId) {
        setIsReady(data.is_ready);
      }
    },
    game_started: (data) => {
      console.log('Game started:', data);
      setCurrentGame(data.game);
      setActiveTab('game');
    },
    guess_submitted: (data) => {
      console.log('Guess submitted:', data);
      setGuesses(prev => [...prev, data.guess]);
      if (data.next_turn) {
        setCurrentGame(prev => prev ? { ...prev, current_turn: data.next_turn } : null);
      }
    },
    game_ended: (data) => {
      console.log('Game ended:', data);
      setCurrentGame(prev => prev ? { ...prev, status: 'completed', winner_id: data.winner_id } : null);
    },
    room_updated: (data) => {
      console.log('Room updated:', data);
      if (data.type === 'room_created' && activeTab === 'rooms') {
        fetchRooms();
      }
    }
  });



  return (
    <div 
      className="min-h-screen bg-gray-100"
    >
        <div 
          className="container mx-auto px-3 py-4"
        >
          <header className="bg-white p-4 rounded-lg shadow-md mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">猜数字</h1>
                <p className="text-gray-600 text-sm">双人轮流猜数字的游戏</p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-1.5 sm:space-y-0 sm:space-x-1.5 w-full sm:w-auto">
                <Link href="/games">
                  <button className="w-full sm:w-auto px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm">
                    返回游戏列表
                  </button>
                </Link>
                <Link href="/">
                  <button className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                    返回主页
                  </button>
                </Link>
              </div>
            </div>
          </header>

          {/* 玩家信息 */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-md font-semibold text-gray-800">玩家信息</h2>
                <p className="text-gray-600 text-sm">用户名: {playerName}</p>
              </div>
              {playerStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full sm:w-auto">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">游戏场数</p>
                    <p className="font-bold text-sm">{playerStats.total_games}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">获胜场数</p>
                    <p className="font-bold text-sm">{playerStats.wins}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">逃跑次数</p>
                    <p className="font-bold text-sm">{playerStats.escapes}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">胜率</p>
                    <p className="font-bold text-sm">{playerStats.win_rate.toFixed(2)}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 房间列表 */}
          {activeTab === 'rooms' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 创建房间按钮 */}
              <div className="bg-white p-4 rounded-lg shadow-md md:col-span-1 lg:col-span-1 flex items-center justify-center">
                <button
                    onClick={() => setShowCreateRoomModal(true)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-md font-medium">创建房间</span>
                  </button>
              </div>

              {/* 房间列表 */}
              <div className="bg-white p-4 rounded-lg shadow-md md:col-span-1 lg:col-span-2">
                <h2 className="text-md sm:text-lg font-semibold text-gray-800 mb-3">房间列表</h2>
                {rooms.length === 0 ? (
                  <p className="text-gray-600 text-center py-6">暂无可用房间</p>
                ) : (
                  <div className="space-y-3">
                    {rooms.map((room) => (
                      <div 
                          key={room.id} 
                          className="border border-gray-200 rounded-md p-3 hover:shadow-md transition-shadow"
                        >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <h3 className="font-semibold text-sm">{room.name}</h3>
                            <div className="grid grid-cols-2 gap-1 sm:grid-cols-1 sm:space-y-1">
                              <p className="text-xs text-gray-600">
                                状态: {room.status === 'waiting' ? '准备中' : room.status === 'playing' ? '游戏中' : '已关闭'}
                              </p>
                              <p className="text-xs text-gray-600">
                                数字位数: {room.digit_count}位
                              </p>
                              <p className="text-xs text-gray-600">
                                观战: {room.can_spectate ? '允许' : '不允许'}
                              </p>
                              <p className="text-xs text-gray-600">
                                玩家: {room.player_count || 0}/2
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {room.status === 'waiting' && (room.player_count || 0) < 2 && (
                              <button
                                  onClick={() => handleJoinRoom(room.id)}
                                  className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                                >
                                  加入
                                </button>
                            )}
                            {room.status === 'playing' && room.can_spectate && (
                              <button
                                onClick={() => handleSpectateRoom(room.id)}
                                className="w-full px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                              >
                                观战
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 房间内 */}
          {activeTab === 'room' && currentRoom && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-md sm:text-lg font-semibold text-gray-800">房间: {currentRoom.name}</h2>
                <button
                  onClick={handleLeaveRoom}
                  className="w-full sm:w-auto px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  离开房间
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">房间信息</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">状态</p>
                    <p className="text-sm">{currentRoom.status === "waiting" ? "准备中" : currentRoom.status === "playing" ? "游戏中" : "已关闭"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">数字位数</p>
                    <p className="text-sm">{currentRoom.digit_count}位</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">允许观战</p>
                    <p className="text-sm">{currentRoom.can_spectate ? "是" : "否"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">房主</p>
                    <p className="text-xs truncate">{currentRoom.host_username || currentRoom.host_id}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">玩家列表</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roomPlayers.map((player) => (
                    <div key={player.id} className="border border-gray-200 rounded-md p-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <p className="font-semibold text-sm">{player.seat ? `玩家 ${player.seat}` : '观众'}</p>
                          <p className="text-xs text-gray-600">用户名: {player.username || player.player_id}</p>
                          <p className="text-xs text-gray-600">
                            状态: {player.is_ready ? '已准备' : '未准备'}
                          </p>
                        </div>
                        {player.player_id === playerId && player.seat && (
                          <button
                            onClick={handleToggleReady}
                            className={`w-full px-3 py-1.5 rounded-md text-white font-medium transition-colors text-sm ${player.is_ready ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            {player.is_ready ? '取消准备' : '准备'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {roomPlayers.filter(p => p.seat).length < 2 && (
                <div className="text-center py-6">
                  <p className="text-gray-600 text-sm mb-3">等待其他玩家加入...</p>
                </div>
              )}
            </div>
          )}

          {/* 游戏界面 */}
          {activeTab === 'game' && currentGame && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-md sm:text-lg font-semibold text-gray-800">游戏中</h2>
                <button
                  onClick={handleLeaveRoom}
                  className="w-full sm:w-auto px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  离开游戏
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">游戏信息</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">状态</p>
                    <p className="text-sm">{currentGame.status === "playing" ? "进行中" : "已结束"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">数字位数</p>
                    <p className="text-sm">{currentGame.digit_count}位</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">当前回合</p>
                    <p className="text-xs">{currentGame.current_turn === playerId ? "你的回合" : (isSpectator ? `${currentGame.current_turn}` : "对方回合")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">模式</p>
                    <p className="text-green-600 font-semibold text-sm">{isSpectator ? "观战" : "参与"}</p>
                  </div>
                  {currentGame.status === "completed" && currentGame.winner_id && (
                    <div className="sm:col-span-4">
                      <p className="text-xs text-gray-600">获胜者</p>
                      <p className="text-sm">{isSpectator ? currentGame.winner_id : (currentGame.winner_id === playerId ? "你" : "对方")}</p>
                    </div>
                  )}
                </div>
              </div>

              {!isSpectator && currentGame.status === 'playing' && currentGame.current_turn === playerId && (
                <div className="mb-4">
                  <h3 className="text-md font-semibold mb-2">你的猜测</h3>
                  <form onSubmit={handleSubmitGuess} className="flex flex-col sm:flex-row gap-1.5">
                    <input
                      type="text"
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value.replace(/[^0-9]/g, ''))}
                      maxLength={currentGame.digit_count}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder={`请输入${currentGame.digit_count}位数字`}
                      required
                    />
                    <button
                      type="submit"
                      disabled={guessInput.length !== currentGame.digit_count}
                      className={`w-full sm:w-auto px-4 py-1.5 rounded-md transition-colors text-sm ${guessInput.length === currentGame.digit_count ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}
                    >
                      提交猜测
                    </button>
                  </form>
                </div>
              )}
              
              {isSpectator && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-700 font-semibold text-sm">你当前处于观战模式</p>
                  <p className="text-green-600 text-xs">你可以观看游戏过程，但不能参与游戏</p>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">猜测记录</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-200 px-2 py-1.5 text-xs">回合</th>
                        <th className="border border-gray-200 px-2 py-1.5 text-xs">玩家1猜测</th>
                        <th className="border border-gray-200 px-2 py-1.5 text-xs">正确数</th>
                        <th className="border border-gray-200 px-2 py-1.5 text-xs">玩家2猜测</th>
                        <th className="border border-gray-200 px-2 py-1.5 text-xs">正确数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.ceil(guesses.length / 2) }, (_, index) => {
                        const round = index + 1;
                        const player1Guess = guesses.find(g => g.round === round && g.guesser_id === currentGame.player1_id);
                        const player2Guess = guesses.find(g => g.round === round && g.guesser_id === currentGame.player2_id);
                        
                        return (
                          <tr key={round} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">{round}</td>
                            <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">{player1Guess?.guess || '-'}</td>
                            <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">{player1Guess?.hit_count || '-'}</td>
                            <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">{player2Guess?.guess || '-'}</td>
                            <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">{player2Guess?.hit_count || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {currentGame.status === 'completed' && currentGame.winner_id && (
                <div className="text-center py-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">
                    {isSpectator ? `${currentGame.winner_id}获胜了！` : (currentGame.winner_id === playerId ? '你获胜了！' : '对方获胜了！')}
                  </h3>
                  <p className="text-gray-600 mb-2 text-xs sm:text-sm">
                    玩家1目标数字：{currentGame.player1_target}
                  </p>
                  <p className="text-gray-600 mb-2 text-xs sm:text-sm">
                    玩家2目标数字：{currentGame.player2_target}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {!isSpectator && (
                      <button
                        onClick={handleRestartGame}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        再玩一局
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsSpectator(false);
                        handleLeaveRoom();
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm"
                    >
                      返回房间列表
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 个人统计 */}
          {activeTab === 'stats' && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">个人统计</h2>
              
              {/* 详细统计信息 */}
              {playerStats && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold mb-3">详细统计信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <p className="text-xs text-gray-600">游戏场数</p>
                          <p className="text-xl font-bold">{playerStats.total_games}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">获胜场数</p>
                          <p className="text-xl font-bold text-green-600">{playerStats.wins}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">逃跑次数</p>
                          <p className="text-xl font-bold text-red-600">{playerStats.escapes}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">胜率</p>
                          <p className="text-xl font-bold text-blue-600">{playerStats.win_rate.toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">游戏数据</h4>
                      <ul className="space-y-1.5">
                        <li className="flex justify-between">
                          <span className="text-gray-600 text-sm">总回合数</span>
                          <span className="font-semibold text-sm">{playerStats.total_rounds}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600 text-sm">平均回合数</span>
                          <span className="font-semibold text-sm">
                            {playerStats.total_games > 0 ? (playerStats.total_rounds / playerStats.total_games).toFixed(1) : '0'}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600 text-sm">获胜率</span>
                          <span className="font-semibold text-sm">{playerStats.win_rate.toFixed(2)}%</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600 text-sm">逃跑率</span>
                          <span className="font-semibold text-sm">
                            {playerStats.total_games > 0 ? ((playerStats.escapes / playerStats.total_games) * 100).toFixed(2) : '0'}%
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 历史对局记录 */}
              <div className="mb-6">
                <h3 className="text-md font-semibold mb-3">历史对局记录</h3>
                {historyLoading ? (
                  <div className="flex justify-center items-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600 text-sm">加载中...</span>
                  </div>
                ) : gameHistory.length === 0 ? (
                  <p className="text-gray-600 text-center py-6">暂无历史对局记录</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-200 px-3 py-1.5 text-left text-xs">游戏ID</th>
                          <th className="border border-gray-200 px-3 py-1.5 text-left text-xs">对手</th>
                          <th className="border border-gray-200 px-3 py-1.5 text-left text-xs">数字位数</th>
                          <th className="border border-gray-200 px-3 py-1.5 text-left text-xs">结果</th>
                          <th className="border border-gray-200 px-3 py-1.5 text-left text-xs">回合数</th>
                          <th className="border border-gray-200 px-3 py-1.5 text-left text-xs">时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameHistory.map((game, index) => (
                          <tr key={game.game_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-200 px-3 py-1.5 text-xs">{game.game_id}</td>
                            <td className="border border-gray-200 px-3 py-1.5 text-xs">{game.opponent_username}</td>
                            <td className="border border-gray-200 px-3 py-1.5 text-xs">{game.digit_count}</td>
                            <td className={`border border-gray-200 px-3 py-1.5 text-xs ${game.result === '胜利' ? 'text-green-600' : game.result === '失败' ? 'text-red-600' : 'text-gray-600'}`}>
                              {game.result}
                            </td>
                            <td className="border border-gray-200 px-3 py-1.5 text-xs">{game.round_count}</td>
                            <td className="border border-gray-200 px-3 py-1.5 text-xs">
                              {new Date(game.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* 胜率图表 */}
              <div>
                <h3 className="text-md font-semibold mb-3">胜率图表</h3>
                {playerStats ? (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: '胜利', value: playerStats.wins, color: '#4bc0c0' },
                              { name: '失败', value: playerStats.total_games - playerStats.wins - playerStats.escapes, color: '#ff6384' },
                              { name: '逃跑', value: playerStats.escapes, color: '#ffce56' }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                          >
                            {[
                              { name: '胜利', value: playerStats.wins, color: '#4bc0c0' },
                              { name: '失败', value: playerStats.total_games - playerStats.wins - playerStats.escapes, color: '#ff6384' },
                              { name: '逃跑', value: playerStats.escapes, color: '#ffce56' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any, name: any) => [`${value} (${(((value || 0) / playerStats.total_games) * 100).toFixed(1)}%)`, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="h-56 flex items-center justify-center">
                      <p className="text-gray-500 text-sm">暂无统计数据</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 游戏规则 */}
          {activeTab !== 'stats' && (
            <div className="mt-4 bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">游戏规则</h2>
              <ul className="space-y-1.5 text-gray-600 text-sm">
                <li>1. 游戏开始前，双方设定一个{digitCount}位数字（系统自动生成）</li>
                <li>2. 双方轮流猜测对方的数字</li>
                <li>3. 每次猜测后，系统会告知有几个数字的位置完全正确（撞对数）</li>
                <li>4. 率先猜中对方数字的玩家获胜</li>
                <li>5. 游戏中离开的玩家会被记录为逃跑，对手自动获胜</li>
              </ul>
            </div>
          )}
        </div>

        {/* 创建房间弹框 */}
        {showCreateRoomModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div 
              className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">创建房间</h2>
                <button 
                  onClick={() => setShowCreateRoomModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateRoom} className="space-y-3">
                <div>
                  <label className="block text-gray-700 mb-1.5 text-sm">房间名称</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="输入房间名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1.5 text-sm">游戏规则</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[4, 5, 6].map((digits) => (
                      <button
                        key={digits}
                        type="button"
                        onClick={() => setDigitCount(digits)}
                        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md transition-colors text-sm ${digitCount === digits ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                      >
                        {digits}位数
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={canSpectate}
                      onChange={(e) => setCanSpectate(e.target.checked)}
                      className="mr-2"
                    />
                    <span>允许观战</span>
                  </label>
                </div>
                <div className="flex space-x-3">
                  <button 
                    type="button"
                    onClick={() => setShowCreateRoomModal(false)}
                    className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    创建房间
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}

export default function DigitsCollisionPageWrapper() {
  return (
    <PermissionGuard 
      menuPath="/games/digits-collision"
    >
      <DigitsCollisionPage />
    </PermissionGuard>
  );
}
