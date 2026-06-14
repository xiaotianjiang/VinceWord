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

  const { data: roleUsers } = await supabase
    .from('vw_sys_user_roles')
    .select('user_id')
    .eq('role_id', params.roleId);

  const authorizedUserIds = roleUsers ? roleUsers.map(ur => ur.user_id) : [];

  const { data: users, error } = await supabase
    .from('vw_sys_users')
    .select('id, usercode, username, email, status')
    .in('id', authorizedUserIds);

  if (error) {
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    users: users || [],
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
    const { userIds } = body;

    await supabase.from('vw_sys_user_roles').delete().eq('role_id', params.roleId);

    if (userIds && userIds.length > 0) {
      const now = new Date().toISOString();
      const inserts = userIds.map(userId => ({
        user_id: userId,
        role_id: params.roleId,
        create_id: userRoleInfo.userId,
        created_at: now
      }));
      await supabase.from('vw_sys_user_roles').insert(inserts);
    }

    return NextResponse.json({ success: true, message: '授权成功' });
  } catch (error: any) {
    return NextResponse.json({ error: '授权失败: ' + (error.message || '未知错误') }, { status: 500 });
  }
}
