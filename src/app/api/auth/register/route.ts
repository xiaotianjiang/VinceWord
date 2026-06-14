// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usercode, username, email, password, inviteCode } = body;

    if (!usercode || !username || !email || !password) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    const { data: existingUser } = await supabase
      .from('vw_sys_users')
      .select('id')
      .or(`usercode.eq.${usercode},email.eq.${email}`)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: '账号或邮箱已存在' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    let roleId: string | null = null;
    let inviteId: string | null = null;
    if (inviteCode) {
      const { data: invite } = await supabase
        .from('vw_sys_invite_codes')
        .select('id, role_id, status')
        .eq('code', inviteCode)
        .single();

      if (invite && invite.status === 'active') {
        roleId = invite.role_id;
        inviteId = invite.id;
      }
    }

    const { data: newUser } = await supabase
      .from('vw_sys_users')
      .insert({
        usercode,
        username,
        email,
        password_hash: passwordHash,
        status: 'active',
        email_verified: false,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();

    if (inviteId && newUser) {
      // 先查询当前的 uses 值
      const { data: currentCode } = await supabase
        .from('vw_sys_invite_codes')
        .select('uses')
        .eq('id', inviteId)
        .single();
      
      const currentUses = currentCode?.uses || 0;
      
      await supabase.from('vw_sys_invite_codes').update({ 
        status: 'used', 
        used_at: now,
        used_by: newUser.id,
        uses: currentUses + 1
      }).eq('id', inviteId);
    }

    if (roleId && newUser) {
      await supabase.from('vw_sys_user_roles').insert({
        user_id: newUser.id,
        role_id: roleId,
        created_at: now
      });
    }

    return NextResponse.json({ success: true, message: '注册成功' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '注册失败，请重试' }, { status: 500 });
  }
}
