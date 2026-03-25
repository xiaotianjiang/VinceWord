'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionLevel } from '@/lib/permission';

interface Card {
  id: number;
  value: string;
  flipped: boolean;
  matched: boolean;
}

export default function MemoryGamePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCount, setFlippedCount] = useState(0);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameStatus, setGameStatus] = useState<string>('开始游戏');
  const [isChecking, setIsChecking] = useState(false);

  // 初始化游戏
  const initializeGame = () => {
    // 生成16张卡片（8对）
    const cardValues = ['🎈', '🎉', '🎁', '🎨', '🎭', '🎪', '🎡', '🎢'];
    const doubledValues = [...cardValues, ...cardValues];
    
    // 随机洗牌
    const shuffledValues = doubledValues.sort(() => Math.random() - 0.5);
    
    const newCards = shuffledValues.map((value, index) => ({
      id: index,
      value,
      flipped: false,
      matched: false
    }));
    
    setCards(newCards);
    setFlippedCount(0);
    setFlippedCards([]);
    setMatchedPairs(0);
    setMoves(0);
    setGameStatus('游戏开始！');
  };

  // 组件挂载时初始化游戏
  useEffect(() => {
    initializeGame();
  }, []);

  // 处理卡片点击
  const handleCardClick = (cardId: number) => {
    // 如果正在检查匹配或卡片已经翻转或匹配，不做任何操作
    if (isChecking || cards[cardId].flipped || cards[cardId].matched) return;

    // 翻转卡片
    const newCards = cards.map(card => 
      card.id === cardId ? { ...card, flipped: true } : card
    );
    
    setCards(newCards);
    setFlippedCards([...flippedCards, cardId]);
    setFlippedCount(flippedCount + 1);

    // 如果已经翻转了两张卡片，检查是否匹配
    if (flippedCount === 1) {
      setMoves(moves + 1);
      setIsChecking(true);
      
      const [firstCardId, secondCardId] = [...flippedCards, cardId];
      const firstCard = newCards[firstCardId];
      const secondCard = newCards[secondCardId];

      // 检查是否匹配
      if (firstCard.value === secondCard.value) {
        // 匹配成功
        setTimeout(() => {
          const updatedCards = newCards.map(card => 
            card.id === firstCardId || card.id === secondCardId 
              ? { ...card, matched: true } 
              : card
          );
          setCards(updatedCards);
          setMatchedPairs(matchedPairs + 1);
          setIsChecking(false);
          setFlippedCount(0);
          setFlippedCards([]);
          
          // 检查游戏是否结束
          if (matchedPairs + 1 === 8) {
            setGameStatus(`游戏结束！你用了 ${moves + 1} 步`);
          } else {
            setGameStatus('匹配成功！继续游戏');
          }
        }, 1000);
      } else {
        // 匹配失败
        setTimeout(() => {
          const updatedCards = newCards.map(card => 
            card.id === firstCardId || card.id === secondCardId 
              ? { ...card, flipped: false } 
              : card
          );
          setCards(updatedCards);
          setIsChecking(false);
          setFlippedCount(0);
          setFlippedCards([]);
          setGameStatus('匹配失败，再试一次');
        }, 1000);
      }
    }
  };

  return (
    <PermissionGuard menuPath="/games/memory">
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <header className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">记忆翻牌</h1>
                <p className="text-gray-600">考验你的记忆力</p>
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
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{gameStatus}</h2>
                <div className="flex space-x-4">
                  <div>
                    <span className="text-gray-600">步数: </span>
                    <span className="font-semibold">{moves}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">匹配: </span>
                    <span className="font-semibold">{matchedPairs}/8</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={initializeGame}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                重新开始
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  disabled={card.matched || isChecking}
                  className={`w-20 h-20 flex items-center justify-center text-4xl rounded-md transition-colors ${
                    card.matched 
                      ? 'bg-green-100' 
                      : card.flipped 
                      ? 'bg-white border-2 border-blue-500' 
                      : 'bg-blue-100 hover:bg-blue-200'
                  }`}
                >
                  {card.flipped || card.matched ? card.value : '?'}
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <h3 className="text-lg font-semibold mb-4">游戏规则</h3>
              <ul className="text-left max-w-md mx-auto text-gray-600 space-y-2">
                <li>1. 点击卡片来翻转它们</li>
                <li>2. 每次只能翻转两张卡片</li>
                <li>3. 如果两张卡片匹配，它们会保持翻开状态</li>
                <li>4. 如果不匹配，它们会自动翻回</li>
                <li>5. 目标是用最少的步数找到所有匹配的卡片</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
