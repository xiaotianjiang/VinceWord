import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateInviteCode } from '@/lib/invite-code';

export async function POST(request: NextRequest) {
  try {
    const { email, reason, action, userId } = await request.json();

    if (action === 'request') {
      // 处理邀请码申请
      if (!email || !reason) {
        return NextResponse.json({ error: '请提供邮箱和申请原因' }, { status: 400 });
      }

      // 检查是否已经申请过
      const { data: existingRequest } = await supabase
        .from('vw_invite_code_requests')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        return NextResponse.json({ error: '您的申请正在处理中' }, { status: 400 });
      }

      // 创建邀请码申请
      const { data: newRequest } = await supabase
        .from('vw_invite_code_requests')
        .insert({
          email,
          reason,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      return NextResponse.json({ 
        success: true, 
        message: '邀请码申请已提交，我们将尽快处理',
        requestId: newRequest.id
      });
    }

    if (action === 'generate' && userId) {
      // 生成邀请码
      const { data: user } = await supabase
        .from('vw_users')
        .select('role')
        .eq('id', userId)
        .single();

      if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
        return NextResponse.json({ error: '您没有权限生成邀请码' }, { status: 403 });
      }

      // 生成新的邀请码
      const code = generateInviteCode();

      const { data: newInviteCode } = await supabase
        .from('vw_invite_codes')
        .insert({
          code,
          generator_id: userId,
          status: 'active',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天过期
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      return NextResponse.json({ 
        success: true, 
        inviteCode: newInviteCode.code,
        expiresAt: newInviteCode.expires_at
      });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error) {
    console.error('邀请码操作错误:', error);
    return NextResponse.json({ error: '操作失败，请重试' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 获取用户的邀请码列表
    const { data: inviteCodes } = await supabase
      .from('vw_invite_codes')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ 
      success: true, 
      inviteCodes 
    });
  } catch (error) {
    console.error('获取邀请码列表错误:', error);
    return NextResponse.json({ error: '获取失败，请重试' }, { status: 500 });
  }
}
