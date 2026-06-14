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

/**
 * 递归查找所有子角色
 * @param allRoles 所有角色列表
 * @param currentRole 当前角色
 * @returns 当前角色及其所有层级的子角色
 */
function getRoleAndAllDescendants(allRoles: any[], currentRole: any): any[] {
  // 将当前角色加入结果
  const result: any[] = [currentRole];
  
  // 找出所有直接子角色（parent_id 等于当前角色的 id）
  const directChildren = allRoles.filter(role => role.parent_id === currentRole.id);
  // 递归处理每个子角色
  for (const child of directChildren) {
    const descendants = getRoleAndAllDescendants(allRoles, child);
    result.push(...descendants);
  }
  return result;
}

export async function GET(request: NextRequest) {
  const userRoleInfo = await getUserRoleInfo(request);
  if (!userRoleInfo) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  const { data: allRoles, error } = await supabase
    .from('vw_sys_roles')
    .select('*');

  if (error || !allRoles) {
    return NextResponse.json({ error: '获取角色列表失败' }, { status: 500 });
  }

  let roles: any[] = [];

  if (userRoleInfo.roleType === 'superadmin') {
    roles = allRoles;
  } else {
    // 查出当前角色及其所有子角色（显示自己，方便新增时选择父节点）
    const currentRole = allRoles.find(r => r.id === userRoleInfo.roleId);
    if (currentRole) {
      roles = getRoleAndAllDescendants(allRoles, currentRole);
    }
  }

  if (!roles.length) {
    return NextResponse.json({ error: '获取角色列表失败' }, { status: 500 });
  }

  const buildTree = (list: any[], parentId: string | null = null): any[] => {
    return list
      .filter(r => {
        // 处理 null 和 undefined 的情况，确保比较一致
        if (parentId === null || parentId === undefined) {
          return r.parent_id === null || r.parent_id === undefined;
        }
        return r.parent_id === parentId;
      })
      .map(r => ({
        ...r,
        children: buildTree(list, r.id)
      }));
  };

  // 非超级管理员：将当前角色和子角色的 parent_id 设置为 null，使它们成为树的根节点
  let treeRoles = roles;
  if (userRoleInfo.roleType !== 'superadmin') {
    treeRoles = roles.map(r => ({
      ...r,
      parent_id: r.id === userRoleInfo.roleId || r.parent_id === userRoleInfo.roleId ? null : r.parent_id
    }));
  }

  return NextResponse.json({ 
    success: true, 
    roles: buildTree(treeRoles),
    userRoleInfo: {
      roleType: userRoleInfo.roleType,
      roleId: userRoleInfo.roleId
    }
  });
}

export async function POST(request: NextRequest) {
  const userRoleInfo = await getUserRoleInfo(request);
  if (!userRoleInfo) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, code, description, type, parent_id } = body;

    if (!name || !code) {
      return NextResponse.json({ error: '角色名称和编码不能为空' }, { status: 400 });
    }

    if (userRoleInfo.roleType !== 'superadmin') {
      if (type === 'superadmin') {
        return NextResponse.json({ error: '只有超级管理员可以创建超级管理员角色' }, { status: 403 });
      }
    }

    const { data: existing } = await supabase
      .from('vw_sys_roles')
      .select('id')
      .or(`name.eq.${name},code.eq.${code}`)
      .single();

    if (existing) {
      return NextResponse.json({ error: '角色名称或编码已存在' }, { status: 400 });
    }

    let effectiveParentId = parent_id;
    
    if (userRoleInfo.roleType !== 'superadmin') {
      if (!parent_id) {
        effectiveParentId = userRoleInfo.roleId;
      } else {
        const { data: parentRole } = await supabase
          .from('vw_sys_roles')
          .select('id')
          .eq('id', parent_id)
          .eq('create_id', userRoleInfo.userId)
          .single();
        
        if (!parentRole) {
          return NextResponse.json({ error: '只能选择自己创建的角色作为父角色' }, { status: 400 });
        }
      }
    }

    const now = new Date().toISOString();
    await supabase.from('vw_sys_roles').insert({
      name,
      code,
      description,
      type: type || 'user',
      parent_id: effectiveParentId || null,
      is_system: false,
      create_id: userRoleInfo.userId,
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({ success: true, message: '创建成功' });
  } catch (error: any) {
    return NextResponse.json({ error: '创建失败: ' + (error.message || '未知错误') }, { status: 500 });
  }
}
