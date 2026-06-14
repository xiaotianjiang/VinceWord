// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

function generateInviteCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

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

export async function POST(request: NextRequest) {
  try {
    const { action, email, reason, roleId, maxUses = 1, codeId } = await request.json();

    if (action === 'request') {
      if (!email || !reason) {
        return NextResponse.json({ error: '请提供邮箱和申请原因' }, { status: 400 });
      }

      const { data: existingRequest } = await supabase
        .from('vw_sys_invite_code_requests')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        return NextResponse.json({ error: '您的申请正在处理中' }, { status: 400 });
      }

      await supabase.from('vw_sys_invite_code_requests').insert({
        email,
        reason,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: '邀请码申请已提交' });
    }

    const adminId = await verifyAdmin(request);
    if (!adminId) {
      return NextResponse.json({ error: '您没有权限执行此操作' }, { status: 403 });
    }

    if (action === 'generate') {
      const code = generateInviteCode();

      await supabase.from('vw_sys_invite_codes').insert({
        code,
        generator_id: adminId,
        role_id: roleId || null,
        status: 'active',
        max_uses: maxUses,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, inviteCode: code });
    }

    if (action === 'cancel' && codeId) {
      await supabase.from('vw_sys_invite_codes').update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      }).eq('id', codeId);

      return NextResponse.json({ success: true, message: '邀请码已作废' });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: '操作失败，请重试' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminId = await verifyAdmin(request);
    if (!adminId) {
      return NextResponse.json({ error: '您没有权限查看邀请码' }, { status: 403 });
    }

    const { data: inviteCodes, error } = await supabase
      .from('vw_sys_invite_codes')
      .select(`id, code, role_id, status, uses, max_uses, expires_at, created_at, vw_sys_roles(name)`)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: '获取邀请码列表失败' }, { status: 500 });
    }

    const formattedCodes = inviteCodes.map(code => ({
      ...code,
      role_name: code.vw_sys_roles?.name
    }));

    return NextResponse.json({ success: true, inviteCodes: formattedCodes });
  } catch {
    return NextResponse.json({ error: '获取失败，请重试' }, { status: 500 });
  }
}
