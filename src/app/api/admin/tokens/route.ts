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

  const { data: tokens, error } = await supabase
    .from('vw_sys_tokens')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: '获取token列表失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, tokens });
}

export async function POST(request: NextRequest) {
  const adminId = await verifyAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, action } = body;

    if (action === 'logout') {
      await supabase.from('vw_sys_tokens').update({
        status: 'revoked',
        last_status_change: new Date().toISOString(),
        status_reason: '管理员强制下线'
      }).eq('user_id', userId);

      return NextResponse.json({ success: true, message: '用户已强制下线' });
    }

    if (action === 'cleanExpired') {
      await supabase.from('vw_sys_tokens').delete().lt('expires_at', new Date().toISOString());
      return NextResponse.json({ success: true, message: '已清理过期token' });
    }

    return NextResponse.json({ error: '无效操作' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
