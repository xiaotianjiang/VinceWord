'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Star {
  id: string
  time: number // 时间戳
  x: number // 水平位置
  size: number // 星星大小
  opacity: number // 透明度
  type: 'event' | 'memory' | 'milestone' // 星星类型
}

const generateStars = (startTime: number, endTime: number): Star[] => {
  const stars: Star[] = []
  const timeRange = endTime - startTime
  
  // 生成随机星星
  for (let i = 0; i < 1000; i++) {
    const time = startTime + Math.random() * timeRange
    const x = Math.random() * 800 - 400 // 水平位置在河流两侧
    const size = 2 + Math.random() * 4
    const opacity = 0.6 + Math.random() * 0.4
    const type = ['event', 'memory', 'milestone'][Math.floor(Math.random() * 3)] as Star['type']
    
    stars.push({
      id: `star-${i}`,
      time,
      x,
      size,
      opacity,
      type
    })
  }
  
  return stars.sort((a, b) => a.time - b.time)
}

export default function TimeRiver() {
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [visibleStars, setVisibleStars] = useState<Star[]>([])
  const [isScrolling, setIsScrolling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const allStars = useRef<Star[]>([])
  
  // 初始化星星数据
  useEffect(() => {
    const startTime = currentTime - 365 * 24 * 60 * 60 * 1000 // 一年前
    const endTime = currentTime + 365 * 24 * 60 * 60 * 1000 // 一年后
    allStars.current = generateStars(startTime, endTime)
    updateVisibleStars()
  }, [])
  
  // 更新可见星星
  const updateVisibleStars = useCallback(() => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    const scrollTop = container.scrollTop
    const viewportHeight = container.clientHeight
    
    // 计算可见时间范围（视口上下各扩展500px缓冲区域）
    const visibleStartTime = currentTime - scrollTop / 2
    const visibleEndTime = currentTime + (viewportHeight - scrollTop) / 2
    
    // 过滤出可见的星星
    const starsInView = allStars.current.filter(star => 
      star.time >= visibleStartTime && star.time <= visibleEndTime
    )
    
    setVisibleStars(starsInView)
  }, [currentTime])
  
  // 处理滚动事件
  const handleScroll = useCallback((e: React.WheelEvent) => {
    setIsScrolling(true)
    
    // 向上滚动时间减少，向下滚动时间增加
    const timeDelta = e.deltaY * 0.5
    setCurrentTime(prev => Math.max(0, prev - timeDelta))
    
    // 防抖更新可见星星
    setTimeout(() => {
      updateVisibleStars()
      setIsScrolling(false)
    }, 50)
  }, [updateVisibleStars])
  
  // 初始和调整大小时更新可见星星
  useEffect(() => {
    updateVisibleStars()
    window.addEventListener('resize', updateVisibleStars)
    return () => window.removeEventListener('resize', updateVisibleStars)
  }, [updateVisibleStars])
  
  // 格式化时间显示
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-auto relative"
      onWheel={handleScroll}
      style={{ cursor: 'ns-resize' }}
    >
      {/* 时间河流中线 */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-white/30 h-full"></div>
      
      {/* 当前时间指示器 */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-4 h-4 bg-white rounded-full border-2 border-blue-400 shadow-lg"></div>
        <div className="text-center mt-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
          {formatTime(currentTime)}
        </div>
      </div>
      
      {/* 星星渲染 */}
      {visibleStars.map((star) => {
        const timePosition = (star.time - currentTime) * 2 // 时间转换为垂直位置
        const isLeft = star.x < 0
        
        return (
          <div
            key={star.id}
            className="absolute transform -translate-y-1/2"
            style={{
              left: `calc(50% ${isLeft ? '-' : '+'} ${Math.abs(star.x)}px)`,
              top: `calc(50% + ${timePosition}px)`,
              opacity: star.opacity,
              transition: isScrolling ? 'none' : 'all 0.3s ease'
            }}
          >
            <div
              className={`rounded-full ${
                star.type === 'event' ? 'bg-yellow-400' :
                star.type === 'memory' ? 'bg-blue-400' : 'bg-purple-400'
              }`}
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                boxShadow: '0 0 8px currentColor'
              }}
            />
          </div>
        )
      })}
      
      {/* 滚动提示 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/70 text-sm">
        滚动鼠标滚轮探索时间河流
      </div>
    </div>
  )
}