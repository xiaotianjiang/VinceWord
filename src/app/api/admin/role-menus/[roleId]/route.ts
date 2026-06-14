// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

interface UserRoleInfo {
  userId: string;
  roleType: string;
  roleId: string;
}

async function getUserRoleInfo(request: NextRequest): Promise<UserRoleInfo | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyJwt(token);
  if (!decoded) return null;

  const { data: userRoles } = await supabase
    .from('vw_sys_user_roles')
    .select('role_id')
    .eq('user_id', decoded.userId);

  if (!userRoles || userRoles.length === 0) return null;

  const roleIds = userRoles.map(ur => ur.role_id);
  const { data: roles } = await supabase
    .from('vw_sys_roles')
    .select('id, type')
    .in('id', roleIds);

  if (!roles || roles.length === 0) return null;

  const hasSuperAdmin = roles.some(r => r.type === 'superadmin');
  const hasAdmin = roles.some(r => r.type === 'admin');
  
  let roleType = 'user';
  let roleId = roles[0].id;
  
  if (hasSuperAdmin) {
    roleType = 'superadmin';
    roleId = roles.find(r => r.type === 'superadmin')?.id || roleId;
  } else if (hasAdmin) {
    roleType = 'admin';
    roleId = roles.find(r => r.type === 'admin')?.id || roleId;
  }

  return { userId: decoded.userId, roleType, roleId };
}

export async function GET(request: NextRequest, { params }: { params: { roleId: string } }) {
  const userRoleInfo = await getUserRoleInfo(request);
  if (!userRoleInfo) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  let menus: any[] = [];
  let userAuthorizedMenuIds: string[] = [];

  if (userRoleInfo.roleType === 'superadmin') {
    const { data: allMenus, error } = await supabase
      .from('vw_sys_menus')
      .select('*')
      .order('sq', { ascending: true });

    if (!error && allMenus) {
      menus = allMenus;
    }
  } else {
    const { data: roleMenus } = await supabase
      .from('vw_sys_role_menus')
      .select('menu_id')
      .eq('role_id', userRoleInfo.roleId);

    if (roleMenus) {
      userAuthorizedMenuIds = roleMenus.map(rm => rm.menu_id);
      console.log('roleMenus.length')
      console.log(roleMenus.length)
    }

    if (userAuthorizedMenuIds.length > 0) {
      const { data: roleMenuList, error } = await supabase
        .from('vw_sys_menus')
        .select('*')
        .in('id', userAuthorizedMenuIds)
        .order('sq', { ascending: true });

      if (!error && roleMenuList) {
        menus = roleMenuList;
      }
    }
  }

  const { data: targetRoleMenus } = await supabase
    .from('vw_sys_role_menus')
    .select('menu_id')
    .eq('role_id', params.roleId);
  
  const targetAuthorizedMenuIds = targetRoleMenus ? targetRoleMenus.map(rm => rm.menu_id) : [];

  const buildTree = (list: any[], parentId: string | null = null): any[] => {
    return list
      .filter(m => {
        if (parentId === null || parentId === undefined) {
          // 查找根节点：parent_id 为 null，或者父菜单不在列表中
          const parentInList = list.some(item => item.id === m.parent_id);
          return m.parent_id === null || m.parent_id === undefined || m.parent_id === 'NULL' || !parentInList;
        }
        return m.parent_id === parentId;
      })
      .map(m => ({
        ...m,
        userAuthorized: userAuthorizedMenuIds.includes(m.id),
        targetAuthorized: targetAuthorizedMenuIds.includes(m.id),
        children: buildTree(list, m.id)
      }));
  };

  return NextResponse.json({ 
    success: true, 
    menus: buildTree(menus),
    userRoleInfo: {
      roleType: userRoleInfo.roleType,
      roleId: userRoleInfo.roleId
    }
  });
}

export async function POST(request: NextRequest, { params }: { params: { roleId: string } }) {
  const userRoleInfo = await getUserRoleInfo(request);
  if (!userRoleInfo) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { menuIds } = body;

    if (userRoleInfo.roleType !== 'superadmin') {
      const { data: userMenus } = await supabase
        .from('vw_sys_role_menus')
        .select('menu_id')
        .eq('role_id', userRoleInfo.roleId);

      const userMenuIds = userMenus ? userMenus.map(rm => rm.menu_id) : [];
      
      const unauthorizedMenuIds = menuIds.filter((id: string) => !userMenuIds.includes(id));
      if (unauthorizedMenuIds.length > 0) {
        return NextResponse.json({ error: '只能授权自己拥有的菜单' }, { status: 403 });
      }
    }

    await supabase.from('vw_sys_role_menus').delete().eq('role_id', params.roleId);

    if (menuIds && menuIds.length > 0) {
      const now = new Date().toISOString();
      const inserts = menuIds.map(menuId => ({
        role_id: params.roleId,
        menu_id: menuId,
        create_id: userRoleInfo.userId,
        created_at: now
      }));
      await supabase.from('vw_sys_role_menus').insert(inserts);
    }

    return NextResponse.json({ success: true, message: '授权成功' });
  } catch (error: any) {
    return NextResponse.json({ error: '授权失败: ' + (error.message || '未知错误') }, { status: 500 });
  }
}
