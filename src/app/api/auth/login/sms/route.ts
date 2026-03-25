import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signJwt } from '@/lib/jwt';
import { createOperationLog } from '@/lib/operation-log';

export async function POST(request: NextRequest) {
  try {
    const { phone, code, remember } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: '手机号和验证码不能为空' }, { status: 400 });
    }

    // 验证验证码
    const { data: verificationCode, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('target', phone)
      .eq('code', code)
      .eq('type', 'login')
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (codeError || !verificationCode) {
      // 记录登录失败日志
      await createOperationLog('login', '失败', phone, request.ip || 'unknown');
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 401 });
    }

    // 验证用户
    const { data: user, error: userError } = await supabase
      .from('vw_users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (userError || !user) {
      // 记录登录失败日志
      await createOperationLog('login', '失败', phone, request.ip || 'unknown');
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    // 标记验证码为已使用
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);

    // 生成JWT token
    const token = signJwt({ userId: user.id, email: user.email, roles: [{ id: '', name: user.role, type: user.role }] });

    // 记录登录成功日志
    await createOperationLog('login', '成功', phone, request.ip || 'unknown');

    // 返回token，由客户端存储到localStorage
    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        roles: [{ id: '', name: user.role, type: user.role }] 
      },
      token 
    });
  } catch (error) {
    console.error('验证码登录错误:', error);
    return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
  }
}
