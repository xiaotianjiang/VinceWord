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

let userInfoCache: User | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 30000;

export async function getCurrentUser(): Promise<User | null> {
  try {
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem('auth-token');
    if (!token) {
      userInfoCache = null;
      return null;
    }

    const now = Date.now();
    if (userInfoCache && (now - lastFetchTime) < CACHE_DURATION) {
      return userInfoCache;
    }

    const userInfoStr = localStorage.getItem('user-info');
    let userInfo = null;
    
    if (userInfoStr) {
      try {
        userInfo = JSON.parse(userInfoStr);
        userInfoCache = {
          id: userInfo.id,
          username: userInfo.username || 'User',
          email: userInfo.email,
          roles: userInfo.roles || [],
          status: userInfo.status
        };
        lastFetchTime = now;
        return userInfoCache;
      } catch {
        console.error('解析用户信息错误');
      }
    }

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
          localStorage.setItem('user-info', JSON.stringify(data.user));
          userInfoCache = data.user;
          lastFetchTime = now;
          return data.user;
        }
      } else {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user-info');
        userInfoCache = null;
      }
    } catch {
      console.error('获取用户信息错误');
    }

    userInfoCache = null;
    return null;
  } catch {
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
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-info');
    }
    userInfoCache = null;
  }
}

export function setUserInfo(userInfo: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user-info', JSON.stringify(userInfo));
  }
}
