// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: NextRequest): Promise<string | null> {
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
    .select('type')
    .in('id', roleIds);

  if (!roles || !roles.some(r => r.type === 'admin' || r.type === 'superadmin')) {
    return null;
  }

  return decoded.userId;
}

export async function GET(request: NextRequest) {
  const userId = await verifyAdmin(request);
  if (!userId) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  const { data: menus, error } = await supabase
    .from('vw_sys_menus')
    .select('*')
    .order('sq', { ascending: true });

  if (error) {
    console.log(error)
    return NextResponse.json({ error: '获取菜单列表失败' }, { status: 500 });
  }

  // 递归构建菜单树
  const buildTree = (list: any[], parentId: string | null = null): any[] => {
    return list
      .filter(m => m.parent_id === parentId)
      .map(m => ({
        ...m,
        children: buildTree(list, m.id)
      }));
  };

  return NextResponse.json({ success: true, menus: buildTree(menus) });
}

export async function POST(request: NextRequest) {
  const adminId = await verifyAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, icon, path, type, parent_id, order, status, permission_code, access_level } = body;

    const { data: existing } = await supabase
      .from('vw_sys_menus')
      .select('id')
      .eq('path', path)
      .single();

    if (existing) {
      return NextResponse.json({ error: '菜单路径已存在' }, { status: 400 });
    }

    const now = new Date().toISOString();
    await supabase.from('vw_sys_menus').insert({
      name,
      icon,
      path,
      type,
      parent_id: parent_id || null,
      order: order || 0,
      status: status || 'enabled',
      permission_code,
      access_level: access_level || 'use',
      create_id: adminId,
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({ success: true, message: '创建成功' });
  } catch {
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
