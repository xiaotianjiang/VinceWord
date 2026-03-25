'use client';

import { useState } from 'react';
import Link from 'next/link';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionLevel } from '@/lib/permission';

type Player = 'X' | 'O';
type Cell = Player | null;
type Board = Cell[][];

export default function TicTacToePage() {
  // 初始化3x3棋盘
  const initialBoard: Board = Array(3).fill(null).map(() => Array(3).fill(null));
  const [board, setBoard] = useState<Board>(initialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | 'Draw' | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('轮到 X 走棋');

  // 检查游戏是否结束
  const checkWinner = (newBoard: Board): Player | 'Draw' | null => {
    // 检查行
    for (let i = 0; i < 3; i++) {
      if (newBoard[i][0] && newBoard[i][0] === newBoard[i][1] && newBoard[i][0] === newBoard[i][2]) {
        return newBoard[i][0];
      }
    }

    // 检查列
    for (let j = 0; j < 3; j++) {
      if (newBoard[0][j] && newBoard[0][j] === newBoard[1][j] && newBoard[0][j] === newBoard[2][j]) {
        return newBoard[0][j];
      }
    }

    // 检查对角线
    if (newBoard[0][0] && newBoard[0][0] === newBoard[1][1] && newBoard[0][0] === newBoard[2][2]) {
      return newBoard[0][0];
    }
    if (newBoard[0][2] && newBoard[0][2] === newBoard[1][1] && newBoard[0][2] === newBoard[2][0]) {
      return newBoard[0][2];
    }

    // 检查是否平局
    if (newBoard.flat().every(cell => cell !== null)) {
      return 'Draw';
    }

    return null;
  };

  // 处理单元格点击
  const handleCellClick = (row: number, col: number) => {
    // 如果单元格已经有值或者游戏已经结束，不做任何操作
    if (board[row][col] || winner) return;

    // 创建新的棋盘状态
    const newBoard = [...board];
    newBoard[row][col] = currentPlayer;

    // 检查是否有赢家
    const newWinner = checkWinner(newBoard);
    setBoard(newBoard);
    setWinner(newWinner);

    if (newWinner === 'Draw') {
      setGameStatus('平局！');
    } else if (newWinner) {
      setGameStatus(`${newWinner} 赢了！`);
    } else {
      // 切换玩家
      const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
      setCurrentPlayer(nextPlayer);
      setGameStatus(`轮到 ${nextPlayer} 走棋`);
    }
  };

  // 重新开始游戏
  const resetGame = () => {
    setBoard(initialBoard);
    setCurrentPlayer('X');
    setWinner(null);
    setGameStatus('轮到 X 走棋');
  };

  return (
    <PermissionGuard requiredLevel={PermissionLevel.GUEST}>
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <header className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">井字棋</h1>
                <p className="text-gray-600">经典的井字棋游戏</p>
              </div>
              <div className="flex space-x-2">
                <Link href="/games">
                  <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
                    返回游戏列表
                  </button>
                </Link>
                <Link href="/">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    返回主页
                  </button>
                </Link>
              </div>
            </div>
          </header>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{gameStatus}</h2>
              <button 
                onClick={resetGame}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                重新开始
              </button>
            </div>

            <div className="flex justify-center">
              <div className="grid grid-cols-3 gap-2" style={{ width: '300px' }}>
                {board.map((row, rowIndex) => (
                  row.map((cell, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      disabled={!!cell || !!winner}
                      className={`w-20 h-20 flex items-center justify-center text-4xl font-bold rounded-md transition-colors ${
                        cell === 'X' 
                          ? 'bg-blue-100 text-blue-600' 
                          : cell === 'O' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {cell}
                    </button>
                  ))
                ))}
              </div>
            </div>

            <div className="mt-8 text-center">
              <h3 className="text-lg font-semibold mb-4">游戏规则</h3>
              <ul className="text-left max-w-md mx-auto text-gray-600 space-y-2">
                <li>1. 玩家交替在3x3的棋盘上放置X或O</li>
                <li>2. 先将三个相同符号连成一条直线（横、竖或对角线）的玩家获胜</li>
                <li>3. 如果棋盘填满且没有玩家连成直线，则为平局</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
