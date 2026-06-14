'use client';

import Header from '@/components/Header';

export default function GamesPage() {
  const games = [
    { name: '井字棋', icon: '⭕', description: '经典的井字棋游戏', link: '/games/tic-tac-toe' },
    { name: '记忆游戏', icon: '🧠', description: '训练你的记忆力', link: '/games/memory' },
    { name: '猜数字', icon: '🔢', description: '猜数字游戏', link: '/games/digits-collision' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">游戏中心</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, index) => (
            <a
              key={index}
              href={game.link}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <span className="text-4xl">{game.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{game.name}</h3>
                  <p className="text-gray-500">{game.description}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
