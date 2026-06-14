// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signJwt, verifyJwt } from '@/lib/jwt';
import { verifyPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: '账号和密码不能为空' }, { status: 400 });
    }

    const { data: user, error: authError } = await supabase
      .from('vw_sys_users')
      .select('*')
      .or(`usercode.eq.${identifier},email.eq.${identifier}`)
      .single();

    if (authError || !user) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const { data: userRoles, error: rolesError } = await supabase
      .from('vw_sys_user_roles')
      .select(`vw_sys_roles (id, name, type)`)
      .eq('user_id', user.id);

    let roles: { id: string; name: string; type: string }[] = [];
    if (!rolesError && userRoles && userRoles.length > 0) {
      roles = userRoles
        .flatMap(ur => Array.isArray(ur.vw_sys_roles) ? ur.vw_sys_roles : [ur.vw_sys_roles])
        .filter((role): role is { id: string; name: string; type: string } => role !== null);
    }

    const token = signJwt({ userId: user.id, email: user.email, roles });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Promise.all([
      supabase.from('vw_sys_tokens').insert({
        token,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        ip_address: request.ip || 'unknown',
        device_info: request.headers.get('user-agent') || 'unknown'
      }),
      supabase.from('vw_sys_users').update({ last_login: new Date().toISOString() }).eq('id', user.id)
    ]);

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        roles,
        status: user.status
      },
      token 
    });
  } catch {
    return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: tokenData } = await supabase
      .from('vw_sys_tokens')
      .select('status, expires_at')
      .eq('token', token)
      .single();
    
    if (!tokenData) {
      return NextResponse.json({ error: '令牌不存在' }, { status: 401 });
    }
    
    if (tokenData.status !== 'active') {
      return NextResponse.json({ error: '令牌已被注销' }, { status: 401 });
    }
    
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: '令牌已过期' }, { status: 401 });
    }

    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const [userResult, rolesResult] = await Promise.all([
      supabase.from('vw_sys_users').select('id, username, email, status').eq('id', decoded.userId).single(),
      supabase.from('vw_sys_user_roles').select(`vw_sys_roles (id, name, type)`).eq('user_id', decoded.userId)
    ]);

    const { data: user, error } = userResult;
    if (error || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    const { data: userRoles, error: rolesError } = rolesResult;
    let roles: { id: string; name: string; type: string }[] = [];
    if (!rolesError && userRoles && userRoles.length > 0) {
      roles = userRoles
        .flatMap(ur => Array.isArray(ur.vw_sys_roles) ? ur.vw_sys_roles : [ur.vw_sys_roles])
        .filter((role): role is { id: string; name: string; type: string } => role !== null);
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        roles,
        status: user.status
      }
    });
  } catch {
    return NextResponse.json({ error: '验证失败' }, { status: 500 });
  }
}
