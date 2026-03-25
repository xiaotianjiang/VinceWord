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

export async function getCurrentUser(): Promise<User | null> {
  try {
    // 在客户端使用 localStorage 来获取 token
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem('auth-token');
    if (!token) return null;

    // 从localStorage获取用户详细信息
    const userInfoStr = localStorage.getItem('user-info');
    let userInfo = null;
    
    if (userInfoStr) {
      try {
        userInfo = JSON.parse(userInfoStr);
      } catch (error) {
        console.error('解析用户信息错误:', error);
      }
    }

    // 异步检查token状态，不阻塞返回
    (async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          // token已被注销或过期，清除本地存储
          localStorage.removeItem('auth-token');
          localStorage.removeItem('user-info');
        } else if (!userInfo) {
          // 如果没有用户信息，获取并存储
          const data = await response.json();
          if (data.user) {
            localStorage.setItem('user-info', JSON.stringify(data.user));
          }
        }
      } catch (error) {
        // 网络错误，忽略
        console.error('检查token状态错误:', error);
      }
    })();

    // 立即返回用户信息，不等待网络请求
    if (userInfo) {
      return {
        id: userInfo.id,
        username: userInfo.username || 'User',
        email: userInfo.email,
        roles: userInfo.roles || [],
        status: userInfo.status
      };
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
          return data.user;
        }
      }
    } catch (error) {
      console.error('获取用户信息错误:', error);
    }

    // 如果都失败了，返回null
    return null;
  } catch (error) {
    // 清除本地存储
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-info');
    }
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
