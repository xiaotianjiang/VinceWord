import { User } from '@/types';

const USER_KEY = 'currentUser';
const USER_CHANGED_EVENT = 'userChanged';

export function setCurrentUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // 触发用户变化事件
  const event = new CustomEvent(USER_CHANGED_EVENT, { 
    detail: user 
  });
  window.dispatchEvent(event);
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function removeCurrentUser(): void {
  localStorage.removeItem(USER_KEY);
  // 触发用户变化事件（用户登出）

  const event = new CustomEvent(USER_CHANGED_EVENT, { 
    detail: null 
  });
  window.dispatchEvent(event);
}

export function isAuthenticated(): boolean {
  return !!getCurrentUser();
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin';
}