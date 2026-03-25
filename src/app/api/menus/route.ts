import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

interface MenuNode {
  id: string;
  name: string;
  path: string;
  icon: string;
  parent_id: string | null;
  order: number;
  status: string;
  access_level: string;
  created_at: string;
  children: MenuNode[];
}

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let userId = null;
    let userRole = 'guest';
    let userRoles: string[] = [];
    
    // 如果有token，验证并获取用户信息
    if (token) {
      const decoded = verifyJwt(token);
      if (decoded) {
        // 获取用户信息
        const { data: user } = await supabase
          .from('vw_users')
          .select('id, role')
          .eq('id', decoded.userId)
          .single();
        
        if (user) {
          userId = user.id;
          userRole = user.role;
          
          // 获取用户的所有角色
          const { data: userRoleData } = await supabase
            .from('vw_user_roles')
            .select('role_id')
            .eq('user_id', user.id);
          console.log('user.id', user.id)
          console.log('userRoleData')
          console.log(userRoleData?.length)
          if (userRoleData) {
            userRoles = userRoleData.map(ur => ur.role_id);
          }
        }
      }
    }

    // 获取所有菜单
    const { data: menus, error } = await supabase
      .from('vw_menus')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      throw error;
    }

    // 构建菜单树
    const buildMenuTree = (menuList: any[], parentId: string | null = null): MenuNode[] => {
      return menuList
        .filter(menu => menu.parent_id === parentId)
        .map(menu => ({
          ...menu,
          children: buildMenuTree(menuList, menu.id)
        }));
    };

    const menuTree = buildMenuTree(menus);

    // 过滤出用户有权限的菜单
    const filterMenuByPermission = async (menuList: any[]): Promise<MenuNode[]> => {
      // 获取角色授权的菜单
      let authorizedMenuIds: string[] = [];
      
      if (userRoles.length > 0) {
        const { data: roleMenus } = await supabase
          .from('vw_role_menus')
          .select('menu_id')
          .in('role_id', userRoles);
        if (roleMenus) {
          authorizedMenuIds = roleMenus.map(rm => rm.menu_id);
        }
      }

      // 获取用户的角色类型
      let userRoleTypes: string[] = [];
      if (userRoles.length > 0) {
        const { data: roles } = await supabase
          .from('vw_roles')
          .select('type')
          .in('id', userRoles);
        if (roles) {
          userRoleTypes = roles.map(r => r.type);
        }
      }

      // 检查用户是否为超级管理员
      const isSuperadmin = userRoleTypes.includes('superadmin');
      // 检查用户是否为管理员
      const isAdmin = userRoleTypes.includes('admin');

      // 同步过滤菜单
      const filteredMenus = menuList.filter(menu => {
        // 超级管理员可以看到所有菜单
        if (isSuperadmin) {
          return true;
        }
        
        // 管理员和普通用户只能看到授权给自己的菜单
        if (isAdmin || userRoleTypes.includes('user')) {
          return authorizedMenuIds.includes(menu.id);
        }
        
        // 其他情况（如游客）
        if (menu.access_level === 'show' || menu.access_level === 'use') {
          return true;
        }
        
        return false;
      });

      // 递归处理子菜单
      const result = [];
      for (const menu of filteredMenus) {
        const children = menu.children ? await filterMenuByPermission(menu.children) : [];
        result.push({
          ...menu,
          children
        });
      }

      return result;
    };

    const filteredMenuTree = await filterMenuByPermission(menuTree);

    return NextResponse.json({
      success: true,
      data: filteredMenuTree
    });
  } catch (error) {
    console.error('获取菜单错误:', error);
    return NextResponse.json({ error: '获取菜单失败' }, { status: 500 });
  }
}
