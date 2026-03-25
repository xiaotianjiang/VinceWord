'use client'

import { useState, useEffect } from 'react'

interface CarouselItem {
  id: number
  image: string
  title: string
  description: string
  supporter: string
}

const carouselItems: CarouselItem[] = [
  {
    id: 1,
    image: '/api/placeholder/800/400',
    title: '支持者 1',
    description: '感谢第一位支持者的慷慨赞助！',
    supporter: '张三'
  },
  {
    id: 2,
    image: '/api/placeholder/800/400',
    title: '支持者 2',
    description: '感谢第二位支持者的热心帮助！',
    supporter: '李四'
  },
  {
    id: 3,
    image: '/api/placeholder/800/400',
    title: '支持者 3',
    description: '感谢第三位支持者的鼎力支持！',
    supporter: '王五'
  }
]

export default function Carousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const totalTime = 10000 // 10秒

  useEffect(() => {
    if (isPaused) return

    const startTime = Date.now() - timeElapsed
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      setTimeElapsed(elapsed)
      
      if (elapsed >= totalTime) {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselItems.length)
        setTimeElapsed(0)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isPaused, timeElapsed])

  const progress = (timeElapsed / totalTime) * 100

  return (
    <div 
      className="relative w-full h-80 bg-gradient-to-r from-blue-50 to-indigo-50 overflow-hidden rounded-lg shadow-lg"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 轮播内容 */}
      <div 
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {carouselItems.map((item) => (
          <div key={item.id} className="w-full flex-shrink-0">
            <div className="w-full h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="w-80 h-56 bg-white/80 backdrop-blur-sm rounded-xl mx-auto mb-6 flex items-center justify-center shadow-md">
                  <span className="text-gray-700 text-lg font-medium">
                    {item.supporter} 的图片
                  </span>
                </div>
                <h3 className="text-3xl font-bold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-700 text-lg max-w-md mx-auto">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 进度条 */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-80">
        <div className="w-full bg-white/30 backdrop-blur-sm rounded-full h-1.5">
          <div 
            className="bg-gradient-to-r from-blue-400 to-purple-500 h-1.5 rounded-full transition-all duration-100 ease-linear shadow-md"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 指示器 */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {carouselItems.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              setCurrentIndex(index)
              setTimeElapsed(0)
            }}
            className={`w-3 h-3 rounded-full ${
              index === currentIndex 
                ? 'bg-blue-500' 
                : 'bg-gray-400'
            }`}
            title={`切换到第 ${index + 1} 张幻灯片`}
          />
        ))}
      </div>
    </div>
  )
}