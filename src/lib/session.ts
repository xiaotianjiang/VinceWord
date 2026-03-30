import { verifyJwt } from './jwt';

export interface Role {
  id: string;
  name: string;
  type: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  status?: string;
}

// 缓存用户信息，避免重复调用API
let userInfoCache: User | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 30000; // 缓存30秒

export async function getCurrentUser(): Promise<User | null> {
  try {
    // 在客户端使用 localStorage 来获取 token
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem('auth-token');
    if (!token) {
      userInfoCache = null;
      return null;
    }

    // 检查缓存是否有效
    const now = Date.now();
    if (userInfoCache && (now - lastFetchTime) < CACHE_DURATION) {
      return userInfoCache;
    }

    // 从localStorage获取用户详细信息
    const userInfoStr = localStorage.getItem('user-info');
    let userInfo = null;
    
    if (userInfoStr) {
      try {
        userInfo = JSON.parse(userInfoStr);
        // 更新缓存
        userInfoCache = {
          id: userInfo.id,
          username: userInfo.username || 'User',
          email: userInfo.email,
          roles: userInfo.roles || [],
          status: userInfo.status
        };
        lastFetchTime = now;
        return userInfoCache;
      } catch (error) {
        console.error('解析用户信息错误:', error);
      }
    }

    // 如果没有用户信息，尝试同步获取
    try {
      const response = await fetch('/api/auth/login', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          // 存储用户信息到localStorage
          localStorage.setItem('user-info', JSON.stringify(data.user));
          // 更新缓存
          userInfoCache = data.user;
          lastFetchTime = now;
          return data.user;
        }
      } else {
        // token已被注销或过期，清除本地存储
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user-info');
        userInfoCache = null;
      }
    } catch (error) {
      console.error('获取用户信息错误:', error);
    }

    // 如果都失败了，返回null
    userInfoCache = null;
    return null;
  } catch (error) {
    // 清除本地存储
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-info');
    }
    userInfoCache = null;
    return null;
  }
}

export async function logout() {
  try {
    // 调用服务端登出API
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 无论服务端是否成功，都清除本地存储
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-info');
    }
    
    return response.ok;
  } catch (error) {
    // 即使API调用失败，也清除本地存储
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-info');
    }
    return false;
  }
}

export function setUserInfo(userInfo: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user-info', JSON.stringify(userInfo));
  }
}

export function clearUserInfo() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user-info');
  }
}
