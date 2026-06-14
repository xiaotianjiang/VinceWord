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

  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('keyword') || '';

  if (!keyword.trim()) {
    return NextResponse.json({ success: true, users: [] });
  }

  const { data: users, error } = await supabase
    .from('vw_sys_users')
    .select('id, usercode, username, email, status')
    .or(`usercode.ilike.%${keyword}%,username.ilike.%${keyword}%,email.ilike.%${keyword}%`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, users: users || [] });
}
