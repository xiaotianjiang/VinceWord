import { getCurrentUser } from './session';

// 缓存菜单数据，避免重复调用API
let menuCache: any = null;
let menuLastFetchTime: number = 0;
const MENU_CACHE_DURATION = 60000; // 缓存1分钟

export enum PermissionLevel {
  GUEST = 'guest',
  USER = 'user',
  ADMIN = 'admin'
}

export async function checkPermission(requiredLevel: PermissionLevel): Promise<boolean> {
  const user = await getCurrentUser();
  
  if (requiredLevel === PermissionLevel.GUEST) {
    return true; // 游客级别所有人都可以访问
  }
  
  if (!user) {
    return false; // 未登录用户只能访问游客级别
  }
  
  if (requiredLevel === PermissionLevel.USER) {
    return true; // 登录用户可以访问用户级别
  }
  
  if (requiredLevel === PermissionLevel.ADMIN) {
    // 检查用户是否有admin或superadmin角色
    if (user.roles && user.roles.some(role => role.type === 'admin' || role.type === 'superadmin')) {
      return true; // 只有管理员可以访问管理员级别
    }
  }
  
  return false;
}

export async function checkGamePermission(gameId: string): Promise<boolean> {
  // 这里可以根据具体游戏ID检查权限
  // 暂时简单实现，所有登录用户都可以访问
  const user = await getCurrentUser();
  return !!user;
}

export interface MenuAccessResult {
  hasAccess: boolean;
  isLoggedIn: boolean;
  error?: string;
}

export async function checkMenuAccess(menuPath: string): Promise<MenuAccessResult> {
  try {
    // 获取当前用户信息
    const user = await getCurrentUser();
    console.log('checkMenuAccess: 获取到的用户信息:', user);
    
    // 检查用户是否登录
    const isLoggedIn = !!user;
    
    // 如果用户未登录，返回未登录状态
    if (!isLoggedIn) {
      console.log('checkMenuAccess: 用户未登录');
      return {
        hasAccess: false,
        isLoggedIn: false
      };
    }
    
    // 获取菜单信息，传递Authorization头
    const token = localStorage.getItem('auth-token');
    console.log('checkMenuAccess: 获取到的token:', token ? token.substring(0, 20) + '...' : '无');
    
    // 检查菜单缓存是否有效
    const now = Date.now();
    let data: any = null;
    
    if (menuCache && (now - menuLastFetchTime) < MENU_CACHE_DURATION) {
      console.log('checkMenuAccess: 使用菜单缓存');
      data = menuCache;
    } else {
      console.log('checkMenuAccess: 从API获取菜单');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/menus', { headers });
      console.log('checkMenuAccess: 菜单API响应状态:', response.status);
      
      data = await response.json();
      console.log('checkMenuAccess: 菜单API响应数据:', data);
      
      if (data.success) {
        // 更新缓存
        menuCache = data;
        menuLastFetchTime = now;
      }
    }
    
    if (!data.success) {
      console.log('checkMenuAccess: 菜单API返回失败');
      return {
        hasAccess: false,
        isLoggedIn: true,
        error: '获取菜单信息失败'
      };
    }
    
    // 查找指定路径的菜单
    const findMenu = (menus: any[]): any => {
      for (const menu of menus) {
        if (menu.path === menuPath) {
          return menu;
        }
        if (menu.children && menu.children.length > 0) {
          const found = findMenu(menu.children);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    
    const menu = findMenu(data.data);
    console.log('checkMenuAccess: 找到的菜单:', menu);
    
    if (!menu) {
      console.log('checkMenuAccess: 未找到菜单路径:', menuPath);
      // 只有超级管理员在菜单不存在时可以访问，管理员需要菜单存在
      if (user.roles && user.roles.some(role => role.type === 'superadmin')) {
        console.log('checkMenuAccess: 用户是超级管理员，即使菜单不存在也允许访问');
        return {
          hasAccess: true,
          isLoggedIn: true
        };
      }
      return {
        hasAccess: false,
        isLoggedIn: true,
        error: '菜单不存在'
      };
    }
    
    // 根据access_level判断权限
    console.log('checkMenuAccess: 菜单access_level:', menu.access_level);
    switch (menu.access_level) {
      case 'show':
        // show: 不需要权限查询，使用需要登录
        console.log('checkMenuAccess: 菜单级别为show，用户已登录，返回true');
        return {
          hasAccess: true,
          isLoggedIn: true
        };
      case 'use':
        // use: 不需要权限查询和使用
        console.log('checkMenuAccess: 菜单级别为use，直接返回true');
        return {
          hasAccess: true,
          isLoggedIn: true
        };
      case 'admin':
        // admin: 需要授权才能查询
        
        // 超级管理员和管理员可以访问所有菜单
        console.log('checkMenuAccess: 检查用户角色:', user.roles);
        if (user.roles && user.roles.some(role => role.type === 'superadmin' || role.type === 'admin')) {
          console.log('checkMenuAccess: 用户是超级管理员或管理员，返回true');
          return {
            hasAccess: true,
            isLoggedIn: true
          };
        }
        
        // 检查用户角色是否有授权
        if (!token) {
          console.log('checkMenuAccess: 菜单级别为admin，无token');
          return {
            hasAccess: false,
            isLoggedIn: true,
            error: '无授权令牌'
          };
        }
        
        // 检查用户的每个角色是否有菜单授权
        if (user.roles && user.roles.length > 0) {
          for (const role of user.roles) {
            // 检查角色是否有菜单授权
            const roleMenusResponse = await fetch(`/api/admin/role-menus/${role.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            const roleMenusData = await roleMenusResponse.json();
            console.log('checkMenuAccess: 角色', role.id, '的菜单授权:', roleMenusData);
            if (roleMenusData.success && roleMenusData.data.includes(menu.id)) {
              console.log('checkMenuAccess: 角色', role.id, '有菜单授权');
              return {
                hasAccess: true,
                isLoggedIn: true
              };
            }
          }
        }
        
        console.log('checkMenuAccess: 没有找到菜单授权');
        return {
          hasAccess: false,
          isLoggedIn: true,
          error: '没有菜单授权'
        };
      default:
        console.log('checkMenuAccess: 菜单级别未知:', menu.access_level);
        return {
          hasAccess: false,
          isLoggedIn: true,
          error: '菜单级别未知'
        };
    }
  } catch (error) {
    console.error('检查菜单权限错误:', error);
    return {
      hasAccess: false,
      isLoggedIn: false,
      error: '检查权限时发生错误'
    };
  }
}

